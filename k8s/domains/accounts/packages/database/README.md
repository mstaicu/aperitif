# Accounts Database

Flyway owns accounts database schema history.

## Tables

```text
accounts
account_members
outbox_events
flyway_schema_history
```

## Rules

- Add changes as `sql/V###__description.sql`.
- Use expand/contract for runtime-affecting schema changes.
- Account state changes publish current-state snapshots through `outbox_events`.
- Postgres notifications only wake the publisher; the outbox is durable.

## Build

```sh
docker build --target prod -t ghcr.io/mstaicu/accounts-migrate:<tag> domains/accounts/packages/database
```
