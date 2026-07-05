# Entitlements Migrations

Flyway owns entitlements schema history.

## Tables

```text
entitlements
projected_accounts
account_entitlement_grants
account_entitlements_version_seq
outbox_events
flyway_schema_history
```

## Rules

- Add changes as `migrations/V###__description.sql`.
- Use expand/contract for runtime-affecting schema changes.
- Keep core seeds separate from product seeds.
- If a migration changes effective account entitlements, insert fresh
  `entitlements.account_entitlements.updated` outbox snapshots for affected
  accounts in the same migration.

## Build

```sh
docker build --target prod -t mdstaicu/entitlements-migrate:<tag> domains/entitlements/packages/migrate
```
