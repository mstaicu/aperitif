# Documents Database

This package builds `documents-migrate`. Flyway owns documents schema history.

## Tables

```text
projected_account_members
projected_account_entitlements
documents
flyway_schema_history
```

Projection tables are local request inputs copied from accounts and entitlements
events. `documents` is the only product table owned here.

## Files

- `migrations/V###__*.sql`: Flyway migrations.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Projection Changes

Projection schema changes are normal Flyway migrations. New projection columns
are backfilled by replaying or republishing the source domain snapshot events.

Invariant: source domains write fresh outbox rows when migrations change
projected state.

Projection writes must keep accepting stale/equal versions without failing.

## Flow

```text
postgres -> migrate Job -> api/worker
```

## Commands

```sh
make deploy-documents
docker build --target prod -t mdstaicu/documents-migrate:<tag> domains/documents/packages/migrate
```

## Agent Notes

- Use expand/contract for runtime-affecting schema changes.
- Migrations must be safe if deployed before, after, or without API/worker.
- Keep projection schemas aligned with consumed event payloads.
- Keep each migration small and versioned as `V###__description.sql`.
