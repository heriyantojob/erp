# Stock Availability vs Current Stock Fix

## Behaviour after this fix

Example: a batch has 100 KG physically on hand.

1. Current Stock = 100 KG.
2. Reserve 30 KG.
3. Current Stock remains 100 KG.
4. Reserved = 30 KG.
5. Stock Availability = 70 KG.
6. Release the 30 KG reservation.
7. Current Stock remains 100 KG and Stock Availability returns to 100 KG.

## Database migration

Run from `erp-api`:

```bash
npm run migrate
```

Migration `0007_stock_reservations.sql` creates the reservation table. The RBAC seed also adds `stock.reserve` to the appropriate roles.

## API

- `GET /erp/stock/current-stock`
- `GET /erp/stock/availability`
- `GET /erp/stock/reservations?status=active`
- `POST /erp/stock/reservations`
- `POST /erp/stock/reservations/:id/release`

## Frontend

Open `/{lang}/admin/stock-availability`. The page now shows separate columns for On Hand, Reserved and Available and provides controls to create/release reservations.
