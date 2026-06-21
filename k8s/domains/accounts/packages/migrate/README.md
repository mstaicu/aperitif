# Accounts Database

This package builds `accounts-migrate`. Flyway owns accounts schema history.

## Tables

```text
accounts
account_members
outbox_events
flyway_schema_history
```

`outbox_events` is the durable event publisher queue. Postgres notifications
only wake the worker.

## Files

- `migrations/V###__*.sql`: Flyway migrations.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Snapshot Changes

Outbox rows contain full current-state snapshots. Consumers project by natural
key and `version`.

## Flow

```text
postgres -> migrate Job -> api/worker
```

## Commands

```sh
make deploy-accounts
docker build --target prod -t mdstaicu/accounts-migrate:<tag> domains/accounts/packages/migrate
```

## Agent Notes

- Use expand/contract for runtime-affecting schema changes.
- Migrations must be safe if deployed before, after, or without API/worker.
- Keep each migration small and versioned as `V###__description.sql`.
