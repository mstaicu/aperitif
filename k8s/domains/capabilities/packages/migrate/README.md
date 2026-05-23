# Capabilities Database

This package builds the `capabilities-migrate` unit. Flyway owns the capabilities
database schema history.

## Model

Postgres is layered like this:

```text
Postgres server or instance
  capabilities database
      public schema
      capabilities
      projected_tenants
      tenant_capability_grants
      tenant_capabilities_version_seq
      outbox_events
      flyway_schema_history
```

`capabilities` is the tenant-level capability vocabulary. Current capability values are
deliberately limited to booleans and numbers because those are the only merge
strategies this domain currently supports.

`projected_tenants` is the local tenant existence copy built from tenancy
events. Projection writes are idempotent through natural keys and projection
`version`.

`tenant_capability_grants` records current tenant-specific inputs that grant capability
values. Effective tenant capability values are calculated from those rows when
capability events are written. `outbox_events` is the durable publisher queue for
tenant capability events.

Capability authority rows store tenancy-owned `tenant_id` values, but they are not
foreign-key children of projection tables. Rebuilding tenancy projections must
not delete capability grant rows.

Grant-writing code updates `tenant_capability_grants`, calculates the effective tenant
capability values, and inserts the matching `outbox_events` row in the same
transaction.

The domain boundary is the database. Other domains must not connect to it
directly.

## Files

- `bootstrap/managed-postgres.sql`: admin-run managed DB role/grant bootstrap.
- `migrations/`: production Flyway migrations, named `V###__description.sql`.

`V002__seed_capabilities.sql` seeds a few simple tenant-level capabilities used to prove
capability grants.

## Flyway Rules

Copying a folder into the image does not make Flyway run it. Flyway scans only
the folders listed in `FLYWAY_LOCATIONS`.

Within that folder, Flyway recognizes versioned migration files by filename
prefix:

```text
V001__init.sql       versioned migration, applied once in version order
```

## Roles

| Role                | Login | Used by                 | Purpose                         |
| ------------------- | ----- | ----------------------- | ------------------------------- |
| `postgres`          | yes   | local/CI init only      | placeholder bootstrap superuser |
| `capabilities_migrator` | yes   | Flyway Job              | create/change schema objects    |
| `capabilities_api`      | yes   | API Deployment          | runtime table access            |
| `capabilities_worker`   | yes   | Worker Deployment       | runtime table access            |
| `capabilities_runtime`  | no    | inherited by API/worker | shared runtime grants           |

Services connect with login roles only. `capabilities_runtime` is a no-login role
so runtime grants have one stable target.

## Flow

1. Local/CI starts the placeholder Postgres image with `POSTGRES_DB=capabilities`
   and overlay `POSTGRES_PASSWORD=postgres`.
2. On an empty data directory, Postgres runs
   `infra/postgres/overlays/{dev,live}/capabilities-postgres-init.sql` as the
   `postgres` superuser.
3. That init SQL creates `capabilities_migrator`, `capabilities_api`,
   `capabilities_worker`, and `capabilities_runtime`, then grants base database/schema
   access.
4. The migrate Job reads `FLYWAY_*` from `capabilities-migrate-db` and connects as
   `capabilities_migrator`.
5. Flyway applies this package's migrations. Migrations create objects and grant
   table/sequence access to `capabilities_runtime`.
6. The API and worker read `DATABASE_URL` from `capabilities-api-db` and
   `capabilities-worker-db`, then connect as `capabilities_api` and `capabilities_worker`.
   Both inherit `capabilities_runtime`.
7. The worker consumes tenancy events into projection tables and publishes
   capability events from `outbox_events` to NATS JetStream.

The split is intentional: bootstrap creates roles and base permissions; Flyway
owns schema objects and object-level grants.

## Configuration

- Placeholder Postgres: `infra/postgres`.
- Flyway Job: `infra/migrate`.
- API DB Secret: `infra/api`.
- Worker DB Secret: `infra/worker`.
- Managed DB bootstrap: `bootstrap/managed-postgres.sql`.

The migrate Job hardcodes `FLYWAY_LOCATIONS=filesystem:/db/migrations`. The
Secret contains only database connection credentials.

The in-cluster Postgres init SQL is for local/CI and the current live
placeholder. Managed production should run `bootstrap/managed-postgres.sql`
with real passwords before Flux reconciles `capabilities-migrate`.

Secrets are scoped per deployable unit even when values match. The migrator
uses `capabilities_migrator`; the API uses `capabilities_api`; the worker uses
`capabilities_worker`.

## Image

The migration image is built from this package directory:

```sh
docker build --target prod -t mdstaicu/capabilities-migrate:<tag> domains/capabilities/packages/migrate
```

Use a real immutable release tag for production. Use `:local` only for manual
testing. Normally use `make deploy-capabilities`; Skaffold builds and tags this
image for the domain deploy path.

## Migration Style

Use expand/contract for changes that can affect running code or existing data.
Assume the migration image can deploy before, after, or without the matching
API/worker image. Each migration must be safe with both the currently running
runtime and the next runtime until the contract step removes old compatibility.
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
make deploy-capabilities
```

Current local and placeholder-live order is `postgres -> migrate -> api/worker`.
