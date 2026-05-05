# Accounts Database

This package is built into the `accounts-migrate` deployable unit.

Flyway owns the migration history for the accounts database:

- `migrations/`: production versioned migrations, named `V###__description.sql`.
- `repeatable/`: rerunnable database objects or stable reference data.
- `seeds/`: non-live deterministic seed data, enabled only by dev/PR overlays.
- `checks/`: SQL fixtures and assertions for migration upgrade checks.

## Access Model

The database has one bootstrap user and four domain roles:

| Role | Login | Used by | Purpose |
| --- | --- | --- | --- |
| `postgres` | yes | local/CI Postgres init only | bootstrap superuser |
| `accounts_migrator` | yes | Flyway Job | create and change schema |
| `accounts_api` | yes | API Deployment | runtime table access |
| `accounts_worker` | yes | Worker Deployment | runtime table access |
| `accounts_runtime` | no | inherited by API and worker | shared runtime grants |

The flow is:

1. Local/CI starts the official Postgres image with `POSTGRES_DB=accounts`.
   With no `POSTGRES_USER`, the image creates the default `postgres`
   superuser. `POSTGRES_HOST_AUTH_METHOD=trust` means local/CI does not verify
   passwords; production managed databases must.
2. On an empty data directory, the image runs
   `infra/postgres/overlays/{dev,live}/accounts-postgres-init.sql` as
   `postgres`. That script creates `accounts_migrator`, `accounts_runtime`,
   `accounts_api`, and `accounts_worker`, then grants `accounts_runtime` to the
   API and worker roles.
3. The same init script lets `accounts_migrator` connect and create objects,
   while `accounts_runtime` can only connect and use the schema.
4. The migrate Job reads `FLYWAY_URL`, `FLYWAY_USER`, and `FLYWAY_PASSWORD` from
   `accounts-migrate-db`, connects as `accounts_migrator`, and runs Flyway.
5. Flyway creates tables/indexes/sequences. Because Flyway owns those objects,
   migrations grant table/sequence access to `accounts_runtime`.
6. The API and worker read `DATABASE_URL` from `accounts-api-db` and
   `accounts-worker-db`. The URL users are `accounts_api` and `accounts_worker`;
   both inherit `accounts_runtime`, so they can use tables but cannot create,
   drop, or alter schema objects.

Managed production uses the same role model. The difference is that the roles
and base grants are created by managed DB provisioning before Flux reconciles
`accounts-migrate`.

When production moves to a managed database, add:

```text
bootstrap/prod.sql
```

Base it on `infra/postgres/overlays/live/accounts-postgres-init.sql`, but do
not hardcode `dev` passwords. It should create/document only the database,
roles, passwords, and base grants. Flyway continues to own tables, indexes,
comments, triggers, and object-level grants.

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
make accounts
```

Current local and placeholder-live order is `postgres -> migrate -> api/worker`.
