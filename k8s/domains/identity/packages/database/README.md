# Identity Database

Flyway owns identity database schema history.

## Tables

```text
users
operators
passkey_credentials
registration_challenges
authentication_challenges
sessions
session_refresh_tokens
flyway_schema_history
```

## Rules

- Add changes as `sql/V###__description.sql`.
- Use expand/contract for runtime-affecting schema changes.
- Identity publishes no domain events today, so migrations do not write outbox
  rows.

## Build

```sh
docker build --target prod -t mdstaicu/identity-migrate:<tag> domains/identity/packages/database
```
