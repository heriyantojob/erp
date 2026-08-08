# ERP Front-End Internationalization

Supported locales:

- `en` — English
- `ko` — 한국어
- `id` — Indonesia (default)

URL examples:

- `/en/admin/materials`
- `/ko/admin/materials`
- `/id/admin/materials`

Dictionaries are split by locale and page/feature:

```text
dictionaries/
  en/
    common.json
    admin.json
    dashboard.json
    modules.json
    crud.json
    stock.json
    process-analysis.json
  ko/
  id/
```

`get-dictionary.ts` loads dictionaries only on the server. Client components use `lib/i18n/client.ts` for the dictionaries required by interactive components.

To add a page dictionary, add the same JSON filename under all three locale folders, register it in `get-dictionary.ts`, and use it from the page or component.
