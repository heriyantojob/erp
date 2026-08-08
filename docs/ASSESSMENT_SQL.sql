-- FKA IT Inventory Technical Assessment - Task 3
-- SQL dialect: PostgreSQL
-- These queries use the actual schema in erp-api/src/db/schema.ts.

-- ============================================================
-- 3.1 Current stock - Rose Extract grouped by batch
-- Expected fields: item, batch, expiry date, quantity, unit.
-- ============================================================
SELECT
    m.code AS material_code,
    m.name AS material_name,
    bl.batch_number,
    bl.expiry_date,
    SUM(sb.quantity_on_hand) AS quantity,
    sb.unit
FROM stock_balances sb
JOIN materials m
  ON m.code = sb.material_code
JOIN batch_lots bl
  ON bl.id = sb.batch_lot_id
WHERE m.code = 'RM-001'
  AND m.deleted_at IS NULL
GROUP BY
    m.code,
    m.name,
    bl.batch_number,
    bl.expiry_date,
    sb.unit
ORDER BY bl.received_at, bl.batch_number;

-- ============================================================
-- 3.2 Stock ledger - all Alcohol movements during August 2026
-- Includes quantity in/out and running balance.
-- ============================================================
SELECT
    st.transaction_at,
    st.transaction_number,
    st.transaction_type,
    m.code AS material_code,
    m.name AS material_name,
    bl.batch_number,
    st.quantity_in,
    st.quantity_out,
    st.unit,
    SUM(st.quantity_in - st.quantity_out) OVER (
        PARTITION BY st.material_code
        ORDER BY st.transaction_at, st.created_at, st.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_balance
FROM stock_transactions st
JOIN materials m
  ON m.code = st.material_code
LEFT JOIN batch_lots bl
  ON bl.id = st.batch_lot_id
WHERE st.material_code = 'RM-002'
  AND st.transaction_at >= TIMESTAMP '2026-08-01 00:00:00'
  AND st.transaction_at <  TIMESTAMP '2026-09-01 00:00:00'
ORDER BY st.transaction_at, st.created_at, st.id;

-- ============================================================
-- 3.3 Expiring materials - batches expiring within 90 days
-- Replace :report_date with a supplied report date.
-- PostgreSQL psql example: DATE '2027-05-05'
-- ============================================================
WITH report_parameters AS (
    SELECT DATE '2027-05-05' AS report_date
)
SELECT
    m.code AS material_code,
    m.name AS material_name,
    bl.batch_number,
    bl.expiry_date,
    SUM(sb.quantity_on_hand) AS quantity_on_hand,
    sb.unit
FROM report_parameters rp
JOIN batch_lots bl
  ON bl.expiry_date IS NOT NULL
JOIN materials m
  ON m.code = bl.material_code
JOIN stock_balances sb
  ON sb.batch_lot_id = bl.id
 AND sb.material_code = bl.material_code
WHERE bl.expiry_date >= rp.report_date
  AND bl.expiry_date <= rp.report_date + INTERVAL '90 days'
  AND sb.quantity_on_hand > 0
  AND m.deleted_at IS NULL
GROUP BY
    m.code,
    m.name,
    bl.batch_number,
    bl.expiry_date,
    sb.unit
ORDER BY bl.expiry_date, m.code, bl.batch_number;

-- ============================================================
-- 3.4A Traceability - raw-material batches used in an FG batch
-- Replace 'FG-BATCH-001' with the selected finished-goods batch.
-- Linkage is production_order_id:
-- finished_goods_receipts -> production_orders -> production_material_issues.
-- ============================================================
SELECT DISTINCT
    fg_bl.batch_number AS finished_goods_batch,
    fg_m.code AS finished_goods_code,
    fg_m.name AS finished_goods_name,
    po.order_number AS production_order,
    rm.code AS raw_material_code,
    rm.name AS raw_material_name,
    rm_bl.batch_number AS raw_material_batch,
    pmi.quantity AS consumed_quantity,
    pmi.unit,
    pmi.issued_at
FROM finished_goods_receipts fgr
JOIN batch_lots fg_bl
  ON fg_bl.id = fgr.batch_lot_id
JOIN production_orders po
  ON po.id = fgr.production_order_id
JOIN materials fg_m
  ON fg_m.code = po.finished_material_code
JOIN production_material_issues pmi
  ON pmi.production_order_id = po.id
JOIN materials rm
  ON rm.code = pmi.material_code
JOIN batch_lots rm_bl
  ON rm_bl.id = pmi.batch_lot_id
WHERE fg_bl.batch_number = 'FG-BATCH-001'
ORDER BY rm.code, rm_bl.batch_number;

-- ============================================================
-- 3.4B Traceability - FG batches using a selected RM batch
-- Replace 'AL-26001' with the selected raw-material batch.
-- ============================================================
SELECT DISTINCT
    rm_bl.batch_number AS raw_material_batch,
    rm.code AS raw_material_code,
    rm.name AS raw_material_name,
    po.order_number AS production_order,
    fg_m.code AS finished_goods_code,
    fg_m.name AS finished_goods_name,
    fg_bl.batch_number AS finished_goods_batch,
    fgr.quantity AS finished_quantity,
    fgr.unit AS finished_unit,
    fgr.received_at
FROM production_material_issues pmi
JOIN batch_lots rm_bl
  ON rm_bl.id = pmi.batch_lot_id
JOIN materials rm
  ON rm.code = pmi.material_code
JOIN production_orders po
  ON po.id = pmi.production_order_id
JOIN finished_goods_receipts fgr
  ON fgr.production_order_id = po.id
JOIN batch_lots fg_bl
  ON fg_bl.id = fgr.batch_lot_id
JOIN materials fg_m
  ON fg_m.code = po.finished_material_code
WHERE rm_bl.batch_number = 'AL-26001'
ORDER BY fgr.received_at, fg_bl.batch_number;

-- ============================================================
-- 3.5 Reconciliation - ledger-derived balance vs current stock
-- Shows discrepancies only. COALESCE also catches a row that exists on
-- only one side. The key is material + batch + warehouse + location + unit.
-- ============================================================
WITH ledger_balance AS (
    SELECT
        st.material_code,
        st.batch_lot_id,
        st.warehouse_id,
        st.location_id,
        st.unit,
        SUM(st.quantity_in - st.quantity_out) AS ledger_quantity
    FROM stock_transactions st
    GROUP BY
        st.material_code,
        st.batch_lot_id,
        st.warehouse_id,
        st.location_id,
        st.unit
),
current_balance AS (
    SELECT
        sb.material_code,
        sb.batch_lot_id,
        sb.warehouse_id,
        sb.location_id,
        sb.unit,
        SUM(sb.quantity_on_hand) AS current_quantity
    FROM stock_balances sb
    GROUP BY
        sb.material_code,
        sb.batch_lot_id,
        sb.warehouse_id,
        sb.location_id,
        sb.unit
)
SELECT
    COALESCE(cb.material_code, lb.material_code) AS material_code,
    bl.batch_number,
    w.code AS warehouse_code,
    l.code AS location_code,
    COALESCE(cb.unit, lb.unit) AS unit,
    COALESCE(lb.ledger_quantity, 0) AS ledger_quantity,
    COALESCE(cb.current_quantity, 0) AS current_quantity,
    COALESCE(cb.current_quantity, 0) - COALESCE(lb.ledger_quantity, 0) AS difference
FROM current_balance cb
FULL OUTER JOIN ledger_balance lb
  ON lb.material_code = cb.material_code
 AND lb.batch_lot_id = cb.batch_lot_id
 AND lb.warehouse_id = cb.warehouse_id
 AND lb.location_id IS NOT DISTINCT FROM cb.location_id
 AND lb.unit = cb.unit
LEFT JOIN batch_lots bl
  ON bl.id = COALESCE(cb.batch_lot_id, lb.batch_lot_id)
LEFT JOIN warehouses w
  ON w.id = COALESCE(cb.warehouse_id, lb.warehouse_id)
LEFT JOIN locations l
  ON l.id = COALESCE(cb.location_id, lb.location_id)
WHERE COALESCE(cb.current_quantity, 0) <> COALESCE(lb.ledger_quantity, 0)
ORDER BY material_code, bl.batch_number, w.code, l.code;
