# Task 1 - End-to-End Business Process Analysis

This process analysis follows the assessment flow from Purchase Requisition through Customer Delivery. The working prototype implements more than the mandatory warehouse core, while costing, transportation, and Customs/ERP integration remain extension points.

| Step | Responsible department/user | Main document / transaction | Inventory impact | Batch / lot traceability | Approval / validation | Quality status | Integration / Bonded Zone point |
|---|---|---|---|---|---|---|---|
| 1. Purchase Requisition | Production / Purchasing requester | Purchase Requisition (PR) | No stock movement | Material requirement identified; no batch yet | Validate material, unit, requested quantity and need date; supervisor may approve | N/A | Future budget/accounting approval; possible Customs planning for imported material |
| 2. Purchase Order | Purchasing | Purchase Order (PO) | No stock movement | Supplier and material reference carried forward | Supplier must be active; PR/PO status controlled; unique PO number | N/A | Future ERP/accounting/AP and import documentation integration |
| 3. Goods Receipt | Warehouse User | Goods Receipt header + lines | Increases on-hand stock in quarantine location/status | Creates/reuses batch/lot; records receipt date, expiry, supplier and location | Validate PO/material/unit/quantity, duplicate document number and batch rules | `quarantine` on receipt | Supplier/import-document reference; Customs receiving point for bonded material |
| 4. Incoming Quality Check | QA / Supervisor | Quality Inspection | No quantity change; changes eligibility | Inspection is linked to receipt and batch | QA records result; release/reject requires authorized role | `pending` -> `released` or `rejected` | Quality result can be shared with ERP/LIMS later |
| 5. Raw Material Warehouse | Warehouse User | Stock Balance / Location | No new movement; released stock becomes available | Balance remains keyed by material + batch + warehouse + location | Only released, non-expired/eligible stock is available for issue/reservation | `released` | Bonded warehouse/location flag supports future Customs controls |
| 6. Material Issue | Warehouse User | Production Material Issue + Stock Transaction | Decreases raw-material on-hand | Exact issued batch is recorded; FIFO can allocate multiple batches | Prevent negative stock; lock stock rows; validate production order and unit | Only released batches consumed | Consumption transaction is future Customs/ERP inventory movement point |
| 7. Production Order | Production User | Production Order | No direct stock movement when created | Production order becomes traceability parent for all consumed batches and output | Validate BOM/material, planned quantity and status transitions | N/A | Future production planning/MRP integration |
| 8. Manufacturing Process | Production User | Material consumption / production execution | Raw material decreases through issues | `production_order_id` links all input batches | Actual consumption cannot exceed available stock; transactions are atomic | Input must be released | Future MES/ERP production confirmation |
| 9. Finished Goods Receipt | Production / Warehouse | Finished Goods Receipt | Increases finished-goods on-hand | Creates finished-goods batch linked to production order | Validate remaining planned output, unit and batch | Prototype can receive as released/quarantine according to workflow | Future QC release and ERP production receipt |
| 10. FG Warehouse | Warehouse User | FG Stock Balance | No additional movement beyond receipt | FG balance is tracked by FG batch + warehouse + location | Only eligible FG stock can be delivered | Released FG stock available | Bonded finished-goods location can support Customs reporting |
| 11. Sales / Delivery Order | Sales / Logistics | Sales Order / Delivery Order | Reservation may reduce available-to-promise, not on-hand | Requested FG material/batch can be reserved | Validate customer, quantity and stock availability | Must use deliverable/released FG | Future accounting/AR, transport and ERP sales integration |
| 12. Customer Delivery | Logistics / Warehouse | Delivery header + lines + Stock Transaction | Decreases finished-goods on-hand | Delivery line records exact FG batch; raw-to-FG-to-customer trace remains queryable | Prevent negative stock; unique delivery number; authorized posting | Released stock only | Customs export/local-delivery reporting point and transport integration |

## Control layer

- **Approval:** PR/PO and reversal/status actions use explicit status changes and permission checks.
- **Batch/Lot Traceability:** input batches are linked to production through `production_material_issues`; output batches are linked by `finished_goods_receipts` and `production_order_id`.
- **Stock Ledger:** every posted movement creates an immutable `stock_transactions` row.
- **Audit Trail:** business changes record actor/action/entity/before-after data where implemented.
- **Quality Status:** received raw material starts in quarantine and is released/rejected by Incoming Quality Check.
- **Customs/ERP integration:** designed as future integration boundaries rather than a fully implemented Customs module, consistent with prototype scope.

## Assumptions

1. Quantities are stored to three decimal places and must be positive.
2. `MAIN` / default warehouse and location are used when the demo does not explicitly request another location.
3. Posted stock ledger and audit rows are append-only. Corrections are made by reversal/counter-entries with a recorded reason.
4. Soft delete is limited to mutable master/business data; immutable stock ledger and audit evidence are not silently deleted.
5. Supplier/customer master uses Business Partners as the user-facing master, while compatibility supplier/customer tables support legacy foreign keys.
6. Purchasing, sales, transport, costing and Customs integration are prototype extensions; the mandatory working flow remains Goods Receipt -> Material Issue -> Current Stock -> Stock Ledger.
