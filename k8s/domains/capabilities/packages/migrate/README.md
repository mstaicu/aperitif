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

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Seed / Snapshot Changes

Capability vocabulary changes are normal Flyway migrations.

Invariant: if a migration changes projected account capabilities, the same
migration writes fresh `capabilities.account_capabilities.updated` outbox rows
for affected accounts.

Keep core capability seeds separate from product capability seeds.

Outbox rows contain full current-state snapshots. Consumers project by natural
key and `version`.

## Flow

```text
postgres -> migrate Job -> api/worker
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
