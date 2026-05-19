# Documents Domain

Documents is a small product-domain proof of the platform spine:

```text
JWT identity + tenancy projections + feature projections -> document command
```

It owns only workspace-scoped documents. It does not own identity, tenant
lifecycle, tenant membership, workspaces, feature definitions, feature grants,
payments, notifications, or workflow.

## Boundary

- `documents` stores rows created by this domain.
- `tenant_projection`, `tenant_membership_projection`, and `workspace_projection`
  are local copies of tenancy authority from the `TENANCY` stream.
- `tenant_feature_projection` is a local copy of tenant feature authority from
  the `FEATURES` stream.
- The API verifies identity-issued JWTs through the identity JWKS endpoint.

The domain uses projections for authorization. It never reaches into identity,
tenancy, or features databases.

## API

```text
POST /v1/documents
```

Body:

```json
{
  "workspace_id": "00000000-0000-4000-8000-000000000000",
  "title": "Example"
}
```

The command succeeds only when:

- the access token is valid;
- the workspace exists in the local tenancy projection;
- the caller is an active member of the workspace tenant;
- the tenant has `documents.enabled = true` in the local feature projection.

Docs are served at:

```text
GET /v1/documents/docs
GET /v1/documents/docs/json
```

## Deployment Units

```text
postgres -> migrate -> api/worker
```

- `postgres`: local/CI placeholder Postgres unit.
- `migrate`: Flyway Job from `packages/database`.
- `api`: Fastify API from `packages/api`.
- `worker`: projection consumers from `packages/worker`.

The worker consumes existing platform streams. It does not create a stream and
does not publish events yet.

## Local

```text
make deploy-documents
make dev-documents
```

The root Makefile deploys required dependencies first: identity, tenancy,
event-bus, and features.

Domain-owned checks:

```text
make -C domains/documents pre-deploy
make -C domains/documents post-deploy
```

## Live

Flux Kustomizations live in `clusters/prod-eu/domains/`:

- `documents-postgres`
- `documents-migrate`
- `documents-api`
- `documents-worker`

The live graph keeps `documents-worker` behind `tenancy-worker` and
`features-worker` because those workers create the streams this worker consumes.

When live moves to managed Postgres, remove only `documents-postgres` from the
Flux graph, run `packages/database/bootstrap/managed-postgres.sql` against the
managed database, and keep `documents-migrate -> documents-api/worker`.
