# FKA ERP Postman

1. Import `FKA-ERP.postman_collection.json` and `FKA-ERP-Local.postman_environment.json`.
2. Select the **FKA ERP Local** environment.
3. Start the API and run **Authentication → Login - System Administrator** first.
4. Postman normally stores the Better Auth session cookie automatically. The collection also saves a bearer token when the response exposes one.
5. Run the requests in **User Management**.

Default API URL: `http://localhost:8000`.

## Validation language

Set the environment variable `locale` to `en`, `id`, or `ko`. Every request sends it through the `X-Locale` header. When the header is absent or unsupported, API validation defaults to English.
