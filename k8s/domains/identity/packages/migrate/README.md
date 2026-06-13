# Identity Database

This package builds `identity-migrate`. Flyway owns identity schema history.

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

Refresh tokens are stored as hashes in `session_refresh_tokens`. Reuse of a
consumed/revoked refresh token revokes the session.

`users.email` is the human account identifier.

## Files

- `migrations/V###__*.sql`: Flyway migrations.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Seed Changes

Identity seed/schema changes are normal Flyway migrations. Identity publishes no
domain events today, so migrations do not write outbox rows.

## Flow

```text
postgres -> migrate Job -> api
```

## Commands

```sh
make deploy-identity
docker build --target prod -t mdstaicu/identity-migrate:<tag> domains/identity/packages/migrate
```

## Agent Notes

- Use expand/contract for runtime-affecting schema changes.
- Migrations must be safe if deployed before, after, or without the matching API.
- Keep each migration small and versioned as `V###__description.sql`.
