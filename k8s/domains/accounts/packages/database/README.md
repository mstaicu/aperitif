# Accounts Database

This package is built into the `accounts-migrate` deployable unit.

Flyway owns the migration history for the accounts database:

- `migrations/`: production versioned migrations, named `V###__description.sql`.
- `repeatable/`: rerunnable database objects or stable reference data.
- `seeds/`: non-live deterministic seed data, enabled only by dev/PR overlays.
- `checks/`: SQL fixtures and assertions for migration upgrade checks.

## Migration Style

Use expand/contract for schema changes that may affect already-running code or
existing data. Each migration should be one small, release-safe step.

Prefer this shape:

```text
V002__add_new_nullable_column.sql
V003__backfill_new_column.sql
V004__require_new_column.sql
V005__drop_old_column.sql
```

Avoid one-shot breaking changes such as renaming or dropping a column in the
same release that application code starts depending on the new shape. New and
old application versions should both survive while rollout is in progress.

Simple additive changes can stay as one migration: creating an unused table,
adding a nullable column, adding a non-breaking index, adding comments, or
adding a value that old code safely ignores.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make accounts
```

Local and live deployment order stays `postgres -> migrate -> api/worker`.
