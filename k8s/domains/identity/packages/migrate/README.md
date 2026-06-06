# Identity Database

This package builds `identity-migrate`. Flyway owns identity schema history.

## Tables

```text
users
passkey_credentials
challenges
sessions
session_refresh_tokens
flyway_schema_history
```

Refresh tokens are stored as hashes in `session_refresh_tokens`. Reuse of a
consumed/revoked refresh token revokes the session.

## Files

- `migrations/V###__*.sql`: Flyway migrations.
- `bootstrap/managed-postgres.sql`: admin-run managed Postgres bootstrap.

Flyway scans only `filesystem:/db/migrations` in the migration image.

## Seed Changes

Identity seed/schema changes are normal Flyway migrations. Identity publishes no
domain events today, so migrations do not write outbox rows.

## Roles

| Role | Login | Used By |
| --- | --- | --- |
| `identity_migrator` | yes | Flyway Job |
| `identity_api` | yes | API Deployment |
| `identity_runtime` | no | inherited runtime grants |

Local/CI placeholder Postgres creates these roles from
`infra/postgres/overlays/{dev,live}/identity-postgres-init.sql`.

Managed Postgres must run `bootstrap/managed-postgres.sql` before Flux
reconciles `identity-migrate`.

## Flow

```text
postgres init -> roles/base grants
migrate Job -> schema objects/object grants
api -> runtime access only
```

Secrets stay scoped:

```text
identity-migrate-db -> identity_migrator
identity-api-db     -> identity_api
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
