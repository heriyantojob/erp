improve tutorial from and add login with lucia auth mysql
https://dev.to/ibrocodes/build-a-scalable-rest-api-with-typescript-express-drizzle-orm-and-turso-database-a-step-by-step-guide-2hnd


docker-compose up --build

baru

# FKA Inventory API

## Local setup

1. Create a PostgreSQL database and copy `.env.example` to `.env` with its connection string.
2. Apply the existing migrations, including `drizzle/0016_erp_inventory.sql`, then run `npm run seed:erp`.
3. Start the API with `npm run dev`.

ERP endpoints: `GET/POST /erp/materials`, `POST /erp/goods-receipts`, `POST /erp/material-issues`, `GET /erp/stock`, and `GET /erp/ledger`.

Assessment design, SQL, FIFO logic, security, DR, and implementation plan are in `docs/assessment.md`.
