# Stock Reservation

`Current Stock` is the physical/on-hand balance. Creating a reservation does **not** reduce this value.

`Stock Availability` is calculated per stock balance/batch as:

```
availableQuantity = quantityOnHand - sum(active reservations)
```

API:

- `GET /erp/stock/current-stock` — physical balance.
- `GET /erp/stock/availability` — on-hand + reserved + available.
- `GET /erp/stock/reservations?status=active` — active reservations.
- `POST /erp/stock/reservations` — create a reservation.
- `POST /erp/stock/reservations/:id/release` — release a reservation with a reason.

Material Issue now validates against `availableQuantity`, not only `quantityOnHand`, so reserved stock cannot be silently consumed. Reversals that would make on-hand stock lower than the active reserved quantity are rejected until the reservation is released.
