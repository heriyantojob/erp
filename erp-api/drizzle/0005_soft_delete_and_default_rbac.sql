-- Soft-delete metadata for ERP master and operational records.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'materials','business_partners','suppliers','customers','warehouses','locations',
    'roles','permissions','batch_lots','goods_receipt_headers','goods_receipt_lines',
    'production_orders','production_material_issues','finished_goods_receipts',
    'delivery_headers','delivery_lines','stock_balances','goods_receipts','bill_of_materials'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at timestamp', table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by_user_id text', table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS delete_reason text', table_name);
  END LOOP;
END $$;
