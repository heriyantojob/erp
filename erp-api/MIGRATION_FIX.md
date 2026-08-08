# Migration workflow

## Normal setup

The project already contains migrations `0000` through `0008`. On a fresh checkout you normally only need:

```bash
npm install
npm run migrate
```

You do **not** need to run `npm run generate` before applying migrations that are already committed.

## Why an old `0009_rapid_brood.sql` failed

Migrations `0005` through `0008` were handwritten SQL migrations. Older builds did not include matching Drizzle snapshot files, so running `drizzle-kit generate` directly compared the current schema against snapshot `0004` and generated the same tables again. PostgreSQL then reported:

```text
42P07: relation "purchase_orders" already exists
```

This build fixes both paths:

- `npm run generate` uses `scripts/generate-safe.ts`. The first generate synchronizes the Drizzle snapshot and converts the generated duplicate SQL into a no-op baseline.
- `npm run migrate` detects an already-created duplicate migration such as `0009_rapid_brood.sql`, stores a `.duplicate-generated.bak` copy, and converts the unapplied duplicate into a no-op before Drizzle runs it.

After the baseline exists, later `npm run generate` calls behave normally and generate only actual schema changes.

## Recommended commands

Existing database/project:

```bash
npm install
npm run migrate
```

When you later edit `src/db/schema.ts` intentionally:

```bash
npm run generate
npm run migrate
```

`npm run generate:drizzle` bypasses the safety wrapper and should only be used if you understand the snapshot history.
