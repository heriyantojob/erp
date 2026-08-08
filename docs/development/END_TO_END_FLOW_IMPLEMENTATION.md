# End-to-End ERP Flow

Main process order implemented in frontend and API:

1. Purchase Requisition
2. Purchase Order
3. Goods Receipt (stock enters quarantine)
4. Incoming Quality Check (release/reject)
5. Raw Material Warehouse (physical stock view)
6. Material Issue (released stock only)
7. Production Order
8. Manufacturing Process
9. Finished Goods Receipt
10. FG Warehouse
11. Sales / Delivery Order (creates stock reservation)
12. Customer Delivery (consumes reservation and physical stock)

Control tools remain separate: Stock Availability, Current Stock, Stock Ledger, BOM, master data, audit/RBAC.

Run `npm run migrate` in erp-api before starting after this update; migration 0008 adds PR, PO, QA, and Sales Order workflow tables.
