# Identity Database

This package builds the `identity-migrate` unit. Flyway owns the identity
database schema history.

## Model

Postgres is layered like this:

```text
Postgres server or instance
  identity database
    public schema
      users
      passkey_credentials
      sessions
      session_refresh_tokens
      flyway_schema_history
```

`public` is the default schema. After a client connects to the `identity`
database, `SELECT * FROM users` means `SELECT * FROM public.users`.

The domain boundary is the database. Other domains must not connect to it
directly.

## Files

- `bootstrap/managed-postgres.sql`: admin-run managed DB role/grant bootstrap.
- `migrations/`: production Flyway migrations, named `V###__description.sql`.

## Flyway Rules

Copying a folder into the image does not make Flyway run it. Flyway scans only
the folders listed in `FLYWAY_LOCATIONS`.

Within that folder, Flyway recognizes versioned migration files by filename
prefix:

```text
V001__init.sql       versioned migration, applied once in version order
```

## Roles

| Role                | Login | Used by                     | Purpose                         |
| ------------------- | ----- | --------------------------- | ------------------------------- |
| `postgres`          | yes   | local/CI init only          | placeholder bootstrap superuser |
| `identity_migrator` | yes   | Flyway Job                  | create/change schema objects    |
| `identity_api`      | yes   | API Deployment              | runtime table access            |
| `identity_runtime`  | no    | inherited by `identity_api` | shared runtime grants           |

Services connect with login roles only. `identity_runtime` is a no-login role
so runtime grants have one stable target.

## Flow

1. Local/CI starts the placeholder Postgres image with `POSTGRES_DB=identity`
   and overlay `POSTGRES_PASSWORD=postgres`.
2. On an empty data directory, Postgres runs
   `infra/postgres/overlays/{dev,live}/identity-postgres-init.sql` as the
   `postgres` superuser.
3. That init SQL creates `identity_migrator`, `identity_api`, and
   `identity_runtime`, then grants base database/schema access.
4. The migrate Job reads `FLYWAY_*` from `identity-migrate-db` and connects as
   `identity_migrator`.
5. Flyway applies this package's migrations. Migrations create objects and grant
   table/sequence access to `identity_runtime`.
6. The API reads `DATABASE_URL` from `identity-api-db` and connects as
   `identity_api`, which inherits `identity_runtime`.

The split is intentional: bootstrap creates roles and base permissions; Flyway
owns schema objects and object-level grants.

Refresh tokens are stored as hashes in `session_refresh_tokens`, not directly
on `sessions`. A normal refresh rotation consumes the old token row and inserts
a new current token row. If a consumed or revoked refresh token is presented to
the refresh endpoint, the session is revoked because that means replay or token
theft.

## Configuration

- Placeholder Postgres: `infra/postgres`.
- Flyway Job: `infra/migrate`.
- API DB Secret: `infra/api`.
- Managed DB bootstrap: `bootstrap/managed-postgres.sql`.

The migrate Job hardcodes `FLYWAY_LOCATIONS=filesystem:/db/migrations`. The
Secret contains only database connection credentials.

The in-cluster Postgres init SQL is for local/CI and the current live
placeholder. Managed production should run `bootstrap/managed-postgres.sql`
with real passwords before Flux reconciles `identity-migrate`.

Secrets are scoped per deployable unit even when values match. The migrator
uses `identity_migrator`; the API uses `identity_api`.

## Image

The migration image is built from this package directory:

```sh
docker build --target prod -t mdstaicu/identity-migrate:<tag> domains/identity/packages/migrate
```

Use a real immutable release tag for production. Use `:local` only for manual
testing. Normally use `make deploy-identity`; Skaffold builds and tags this
image for the domain deploy path.

## Debug

Render placeholder Postgres auth env:

```sh
kubectl kustomize infra/postgres/overlays/dev | rg "POSTGRES_DB|POSTGRES_PASSWORD|POSTGRES_HOST_AUTH_METHOD"
```

Check the API can connect with its configured secret:

```sh
kubectl exec -n identity deploy/identity-api-depl -- \
  node --input-type=module -e 'import pg from "pg"; const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); await pool.query("select 1"); await pool.end(); console.log("connected");'
```

Do not use `psql -h 127.0.0.1` inside the Postgres container to prove service
auth. The useful auth check is from another pod through `postgres-srv`.

## Migration Style

Use expand/contract for changes that can affect running code or existing data.
Assume the migration image can deploy before, after, or without the matching API
image. Each migration must be safe with both the currently running runtime and
the next runtime until the contract step removes old compatibility.
If new runtime code requires new schema, ship the expand migration first as its
own domain release. Then release the runtime code. Then later ship the contract
migration that removes old schema.
Each migration should be one small, release-safe step:

```text
V002__add_new_nullable_column.sql
V003__backfill_new_column.sql
V004__require_new_column.sql
V005__drop_old_column.sql
```

Simple additive changes can stay as one migration: creating an unused table,
adding a nullable column, adding a non-breaking index, adding comments, or
adding a value old code safely ignores.

Run the full domain path instead of building or pushing the image by hand:

```sh
make deploy-identity
```

Current local and placeholder-live order is `postgres -> migrate -> api -> ui`.
