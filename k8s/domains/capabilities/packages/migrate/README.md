# Capabilities Database

This package builds `capabilities-migrate`. Flyway owns capabilities schema
history.

## Tables

```text
capabilities
projected_accounts
account_capability_grants
account_capabilities_version_seq
outbox_events
flyway_schema_history
```

`account_capability_grants` stores current grant contributions. Effective
capability snapshots are calculated when `outbox_events` rows are written.

## Files

- `migrations/V###__*.sql`: Flyway migrations.
- `bootstrap/managed-postgres.sql`: admin-run managed Postgres bootstrap.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Seed / Snapshot Changes

Capability vocabulary changes are normal Flyway migrations.

Invariant: if a migration changes projected account capabilities, the same
migration writes fresh `capabilities.account_capabilities.updated` outbox rows
for affected accounts.

Keep core capability seeds separate from product capability seeds.

Outbox rows contain full current-state snapshots. Consumers project by natural
key and `version`.

## Roles

| Role | Login | Used By |
| --- | --- | --- |
| `capabilities_migrator` | yes | Flyway Job |
| `capabilities_api` | yes | API Deployment |
| `capabilities_worker` | yes | Worker Deployment |

Local/CI placeholder Postgres creates these roles from
`infra/postgres/overlays/{dev,live}/capabilities-postgres-init.sql`.

Managed Postgres must run `bootstrap/managed-postgres.sql` before Flux
reconciles `capabilities-migrate`.

## Flow

```text
postgres init -> roles/base grants
migrate Job -> schema objects/table grants
api -> grant commands
worker -> accounts projection + outbox publish
```

Secrets stay scoped:

```text
capabilities-migrate-db -> capabilities_migrator
capabilities-api-db     -> capabilities_api
capabilities-worker-db  -> capabilities_worker
```

## Commands

```sh
make deploy-capabilities
docker build --target prod -t mdstaicu/capabilities-migrate:<tag> domains/capabilities/packages/migrate
```

## Agent Notes

- Use expand/contract for runtime-affecting schema changes.
- Migrations must be safe if deployed before, after, or without API/worker.
- Capability authority rows reference accounts-owned `account_id` values but are
  not deleted when projections rebuild.
- Keep each migration small and versioned as `V###__description.sql`.
