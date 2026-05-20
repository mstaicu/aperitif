# Features Database

This package builds the `features-migrate` unit. Flyway owns the features
database schema history.

## Model

Postgres is layered like this:

```text
Postgres server or instance
  features database
      public schema
      feature_definitions
      tenant_projection
      tenant_membership_projection
      tenant_feature_grants
      tenant_features
      features_version_seq
      outbox_events
      flyway_schema_history
```

`feature_definitions` is the tenant-level feature vocabulary. Current feature
values are deliberately limited to booleans and numbers because those are the
only merge strategies this domain currently supports.

`tenant_projection` and `tenant_membership_projection` are local copies of
tenancy authority built from tenancy events. Projection writes are idempotent
through natural keys and projection `version`.

`tenant_feature_grants` records current tenant-specific inputs that grant
feature values. `tenant_features` stores the current feature values for each
tenant after grants are merged. `outbox_events` is the durable publisher queue
for tenant feature events.

Feature authority rows store tenancy-owned `tenant_id` values, but they are not
foreign-key children of projection tables. Rebuilding tenancy projections must
not delete feature grants or tenant feature rows.

Grant-writing code updates `tenant_features` and inserts the matching
`outbox_events` row in the same transaction.

The domain boundary is the database. Other domains must not connect to it
directly.

## Files

- `bootstrap/managed-postgres.sql`: admin-run managed DB role/grant bootstrap.
- `migrations/`: production Flyway migrations, named `V###__description.sql`.
- `repeatable/`: rerunnable database objects or stable reference data.
- `seeds/`: non-live deterministic seed data.
- `checks/`: fixtures and assertions for migration upgrade checks.

The current migration image copies only `migrations/`. Add other folders back
to the Dockerfile only when a workflow actually uses them.

`V002__seed_feature_definitions.sql` seeds a few simple tenant-level feature
definitions used to prove feature grants.

## Flyway Rules

Copying a folder into the image does not make Flyway run it. Flyway scans only
the folders listed in `FLYWAY_LOCATIONS`.

Within those folders, Flyway recognizes files by filename prefix:

```text
V001__init.sql       versioned migration, applied once in version order
R__refresh_view.sql  repeatable migration, rerun when the file changes
```

Arbitrary files such as `seed.sql` or `assert.sql` are ignored by Flyway unless
another command runs them. `seeds/` should only be included by non-prod
locations. `checks/` is for future CI/database validation, not the normal
production migration Job.

## Roles

| Role                | Login | Used by                 | Purpose                         |
| ------------------- | ----- | ----------------------- | ------------------------------- |
| `postgres`          | yes   | local/CI init only      | placeholder bootstrap superuser |
| `features_migrator` | yes   | Flyway Job              | create/change schema objects    |
| `features_api`      | yes   | API Deployment          | runtime table access            |
| `features_worker`   | yes   | Worker Deployment       | runtime table access            |
| `features_runtime`  | no    | inherited by API/worker | shared runtime grants           |

Services connect with login roles only. `features_runtime` is a no-login role
so runtime grants have one stable target.

## Flow

1. Local/CI starts the placeholder Postgres image with `POSTGRES_DB=features`
   and overlay `POSTGRES_PASSWORD=postgres`.
2. On an empty data directory, Postgres runs
   `infra/postgres/overlays/{dev,live}/features-postgres-init.sql` as the
   `postgres` superuser.
3. That init SQL creates `features_migrator`, `features_api`,
   `features_worker`, and `features_runtime`, then grants base database/schema
   access.
4. The migrate Job reads `FLYWAY_*` from `features-migrate-db` and connects as
   `features_migrator`.
5. Flyway applies this package's migrations. Migrations create objects and grant
   table/sequence access to `features_runtime`.
6. The API and worker read `DATABASE_URL` from `features-api-db` and
   `features-worker-db`, then connect as `features_api` and `features_worker`.
   Both inherit `features_runtime`.
7. The worker consumes tenancy events into projection tables and publishes
   feature events from `outbox_events` to NATS JetStream.

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
with real passwords before Flux reconciles `features-migrate`.

Secrets are scoped per deployable unit even when values match. The migrator
uses `features_migrator`; the API uses `features_api`; the worker uses
`features_worker`.

## Image

The migration image is built from this package directory:

```sh
docker build -t mdstaicu/features-migrate:<tag> domains/features/packages/database
```

Use a real immutable release tag for production. Use `:local` only for manual
testing. Normally use `make deploy-features`; Skaffold builds and tags this
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
make deploy-features
```

Current local and placeholder-live order is `postgres -> migrate -> api/worker`.
