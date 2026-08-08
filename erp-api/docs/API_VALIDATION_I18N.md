# API Validation and Locale

ERP validation uses the request locale in this priority order:

1. `X-Locale: en|id|ko`
2. `X-Lang: en|id|ko`
3. `Accept-Language`
4. English (`en`)

Validation failures use HTTP 422 and a stable response shape:

```json
{
  "locale": "en",
  "code": "VALIDATION_ERROR",
  "message": "Some submitted fields are invalid.",
  "errors": [
    {
      "field": "quantity",
      "code": "too_small",
      "message": "quantity must be greater than or equal to 0."
    }
  ]
}
```

Database conflicts are differentiated:

- `409 DUPLICATE_RECORD` for unique-key conflicts.
- `409 REFERENCE_NOT_FOUND` for foreign-key conflicts.
- `400 DATABASE_CONSTRAINT` for other PostgreSQL constraints.

The frontend automatically sends `X-Locale` based on the `[lang]` URL segment and displays `errors[].message` when present.
