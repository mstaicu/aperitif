# Entitlements Database

This package builds `entitlements-migrate`. Flyway owns entitlements schema
history.

## Tables

```text
entitlements
projected_accounts
account_entitlement_grants
account_entitlements_version_seq
outbox_events
flyway_schema_history
```

`account_entitlement_grants` stores current grant contributions. Effective
entitlement snapshots are calculated when `outbox_events` rows are written.

## Files

- `migrations/V###__*.sql`: Flyway migrations.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Seed / Snapshot Changes

Entitlement vocabulary changes are normal Flyway migrations.

Invariant: if a migration changes projected account entitlements, the same
migration writes fresh `entitlements.account_entitlements.updated` outbox rows
for affected accounts.

Keep core entitlement seeds separate from product entitlement seeds.

Outbox rows contain full current-state snapshots. Consumers project by natural
key and `version`.

## Flow

```text
postgres -> migrate Job -> api/worker
```

## Commands

```sh
make deploy-entitlements
docker build --target prod -t mdstaicu/entitlements-migrate:<tag> domains/entitlements/packages/migrate
```

## Agent Notes

- Use expand/contract for runtime-affecting schema changes.
- Migrations must be safe if deployed before, after, or without API/worker.
- Entitlement authority rows reference accounts-owned `account_id` values but are
  not deleted when projections rebuild.
- Keep each migration small and versioned as `V###__description.sql`.
