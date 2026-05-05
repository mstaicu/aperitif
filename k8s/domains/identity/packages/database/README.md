# Identity Database

This package is built into the `identity-migrate` deployable unit.

Flyway owns the migration history for the identity database:

- `migrations/`: production versioned migrations, named `V###__description.sql`.
- `repeatable/`: rerunnable database objects or stable reference data.
- `seeds/`: non-live deterministic seed data, enabled only by dev/PR overlays.
- `checks/`: SQL fixtures and assertions for migration upgrade checks.

## Access Model

The database has one bootstrap user and three domain roles:

| Role | Login | Used by | Purpose |
| --- | --- | --- | --- |
| `postgres` | yes | local/CI Postgres init only | bootstrap superuser |
| `identity_migrator` | yes | Flyway Job | create and change schema |
| `identity_api` | yes | API Deployment | runtime table access |
| `identity_runtime` | no | inherited by `identity_api` | shared runtime grants |

The flow is:

1. Local/CI starts the official Postgres image with `POSTGRES_DB=identity`.
   With no `POSTGRES_USER`, the image creates the default `postgres`
   superuser. `POSTGRES_HOST_AUTH_METHOD=trust` means local/CI does not verify
   passwords; production managed databases must.
2. On an empty data directory, the image runs
   `infra/postgres/overlays/{dev,live}/identity-postgres-init.sql` as
   `postgres`. That script creates `identity_migrator`, `identity_runtime`, and
   `identity_api`, then grants `identity_runtime` to `identity_api`.
3. The same init script lets `identity_migrator` connect and create objects,
   while `identity_runtime` can only connect and use the schema.
4. The migrate Job reads `FLYWAY_URL`, `FLYWAY_USER`, and `FLYWAY_PASSWORD` from
   `identity-migrate-db`, connects as `identity_migrator`, and runs Flyway.
5. Flyway creates tables/indexes/sequences. Because Flyway owns those objects,
   migrations grant table/sequence access to `identity_runtime`.
6. The API reads `DATABASE_URL` from `identity-api-db`. The URL user is
   `identity_api`, which inherits `identity_runtime`, so the API can use tables
   but cannot create, drop, or alter schema objects.

Managed production uses the same role model. The difference is that the roles
and base grants are created by managed DB provisioning before Flux reconciles
`identity-migrate`.

When production moves to a managed database, add:

```text
bootstrap/prod.sql
```

Base it on `infra/postgres/overlays/live/identity-postgres-init.sql`, but do not
hardcode `dev` passwords. It should create/document only the database, roles,
passwords, and base grants. Flyway continues to own tables, indexes, comments,
triggers, and object-level grants.

## Migration Style

Use expand/contract for schema changes that may affect already-running code or
existing data. Each migration should be one small, release-safe step.

Prefer this shape:

```text
V002__add_new_nullable_column.sql
V003__backfill_new_column.sql
V004__require_new_column.sql
V005__drop_old_column.sql
```

Avoid one-shot breaking changes such as renaming or dropping a column in the
same release that application code starts depending on the new shape. New and
old application versions should both survive while rollout is in progress.

Simple additive changes can stay as one migration: creating an unused table,
adding a nullable column, adding a non-breaking index, adding comments, or
adding a value that old code safely ignores.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make identity
```

Current local and placeholder-live order is `postgres -> migrate -> api -> ui`.
