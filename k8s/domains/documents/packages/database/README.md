# Documents Database

This package builds the `documents-migrate` unit. Flyway owns schema history for
the documents database.

## Model

```text
Postgres server or instance
  documents database
    public schema
      tenant_projection
      tenant_membership_projection
      workspace_projection
      tenant_feature_projection
      documents
      flyway_schema_history
```

The projection tables are local authorization inputs copied from tenancy and
features events. `documents` is the only product table owned by this domain.
Other domains must not connect to this database.

## Roles

| Role                 | Login | Used by            | Purpose                         |
| -------------------- | ----- | ------------------ | ------------------------------- |
| `postgres`           | yes   | local/CI init only | placeholder bootstrap superuser |
| `documents_migrator` | yes   | Flyway Job         | create/change schema objects    |
| `documents_api`      | yes   | API Deployment     | runtime table access            |
| `documents_worker`   | yes   | Worker Deployment  | projection table access         |
| `documents_runtime`  | no    | API/worker inherit | shared runtime grants           |

## Flow

1. Local/CI starts placeholder Postgres with `POSTGRES_DB=documents` and
   `POSTGRES_PASSWORD=postgres`.
2. On an empty data directory, Postgres runs
   `infra/postgres/overlays/{dev,live}/documents-postgres-init.sql` as the
   `postgres` superuser.
3. Init SQL creates `documents_migrator`, `documents_api`,
   `documents_worker`, and `documents_runtime`, then grants base database/schema
   access.
4. The migrate Job reads `FLYWAY_*` from `documents-migrate-db`, connects as
   `documents_migrator`, and applies `migrations/`.
5. The API and worker read their own `DATABASE_URL` Secrets and connect as
   `documents_api` and `documents_worker`.

Bootstrap creates roles and base permissions. Flyway creates tables, indexes,
comments, and object-level runtime grants.

## Managed Postgres

For managed production Postgres, run this before Flux reconciles
`documents-migrate`:

```sh
/opt/homebrew/opt/libpq/bin/psql "$DOCUMENTS_ADMIN_DATABASE_URL" \
  -v documents_migrator_password='real-migrator-password' \
  -v documents_api_password='real-api-password' \
  -v documents_worker_password='real-worker-password' \
  -f domains/documents/packages/database/bootstrap/managed-postgres.sql
```

Then put the matching credentials into the live SOPS Secrets for migrate, API,
and worker.

## Flyway

The migration image copies only `migrations/` and the Job hardcodes:

```text
FLYWAY_LOCATIONS=filesystem:/db/migrations
```

Flyway applies `V###__description.sql` files once, in version order. Repeatable
or seed folders can be added later, but they are not part of this unit today.

Build the production migration image from this package:

```sh
docker build -t mdstaicu/documents-migrate:<tag> domains/documents/packages/database
```

Normally use the domain deployment path instead:

```sh
make deploy-documents
```

## Migration Style

Use expand/contract for changes that can affect running code or existing data.
The migration unit may deploy before, after, or without the matching API/worker
image, so each migration should be one small release-safe step.
