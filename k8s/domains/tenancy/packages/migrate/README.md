# Tenancy Database

This package builds `tenancy-migrate`. Flyway owns tenancy schema history.

## Tables

```text
tenants
tenant_memberships
permissions
roles
role_permissions
outbox_events
flyway_schema_history
```

`outbox_events` is the durable event publisher queue. Postgres notifications
only wake the worker.

## Files

- `migrations/V###__*.sql`: Flyway migrations.
- `bootstrap/managed-postgres.sql`: admin-run managed Postgres bootstrap.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Seed / Snapshot Changes

Role or permission seed changes are normal Flyway migrations. If they change
effective member permissions, the same migration should write fresh
`tenancy.tenant_member.updated` outbox rows for affected memberships.

Outbox rows contain full current-state snapshots. Consumers project by natural
key and `version`.

## Roles

| Role | Login | Used By |
| --- | --- | --- |
| `tenancy_migrator` | yes | Flyway Job |
| `tenancy_api` | yes | API Deployment |
| `tenancy_worker` | yes | Worker Deployment |
| `tenancy_runtime` | no | inherited runtime grants |

Local/CI placeholder Postgres creates these roles from
`infra/postgres/overlays/{dev,live}/tenancy-postgres-init.sql`.

Managed Postgres must run `bootstrap/managed-postgres.sql` before Flux
reconciles `tenancy-migrate`.

## Flow

```text
postgres init -> roles/base grants
migrate Job -> schema objects/object grants
api/worker -> runtime access only
```

Secrets stay scoped:

```text
tenancy-migrate-db -> tenancy_migrator
tenancy-api-db     -> tenancy_api
tenancy-worker-db  -> tenancy_worker
```

## Commands

```sh
make deploy-tenancy
docker build --target prod -t mdstaicu/tenancy-migrate:<tag> domains/tenancy/packages/migrate
```

## Agent Notes

- Use expand/contract for runtime-affecting schema changes.
- Migrations must be safe if deployed before, after, or without API/worker.
- Keep each migration small and versioned as `V###__description.sql`.
