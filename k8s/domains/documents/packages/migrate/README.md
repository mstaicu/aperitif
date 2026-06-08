# Documents Database

This package builds `documents-migrate`. Flyway owns documents schema history.

## Tables

```text
projected_account_members
projected_account_capabilities
documents
flyway_schema_history
```

Projection tables are local request inputs copied from accounts and capabilities
events. `documents` is the only product table owned here.

## Files

- `migrations/V###__*.sql`: Flyway migrations.
- `bootstrap/managed-postgres.sql`: admin-run managed Postgres bootstrap.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Projection Changes

Projection schema changes are normal Flyway migrations. New projection columns
are backfilled by replaying or republishing the source domain snapshot events.

Invariant: source domains write fresh outbox rows when migrations change
projected state.

Projection writes must keep accepting stale/equal versions without failing.

## Roles

| Role | Login | Used By |
| --- | --- | --- |
| `documents_migrator` | yes | Flyway Job |
| `documents_api` | yes | API Deployment |
| `documents_worker` | yes | Worker Deployment |

Local/CI placeholder Postgres creates these roles from
`infra/postgres/overlays/{dev,live}/documents-postgres-init.sql`.

Managed Postgres must run `bootstrap/managed-postgres.sql` before Flux
reconciles `documents-migrate`.

## Flow

```text
postgres init -> roles/base grants
migrate Job -> schema objects/table grants
api/worker -> explicit table grants
```

Secrets stay scoped:

```text
documents-migrate-db -> documents_migrator
documents-api-db     -> documents_api
documents-worker-db  -> documents_worker
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
