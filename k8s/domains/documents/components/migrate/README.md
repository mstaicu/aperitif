# Documents Database

Flyway owns documents database schema history.

## Tables

```text
projected_account_members
projected_account_entitlements
documents
flyway_schema_history
```

## Rules

- Add changes as `sql/V###__description.sql`.
- Use expand/contract for runtime-affecting schema changes.
- Projection schema changes are backfilled by replaying or republishing source
  domain snapshot events.
- Projection writes must tolerate stale/equal versions.

## Build

```sh
docker build --target prod -t ghcr.io/mstaicu/documents-migrate:<tag> domains/documents/components/migrate
```
