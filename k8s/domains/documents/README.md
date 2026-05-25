# Documents Domain

Documents is the product-domain proof of the platform spine.

## Owns

- `documents`
- `projected_tenants`
- `projected_tenant_memberships`
- `projected_tenant_capabilities`

The projection tables are local authorization inputs copied from tenancy and
capabilities events.

## Does Not Own

- identity records
- tenant authority
- capability authority
- payments, notifications, workflow

The API verifies identity-issued JWTs, then authorizes from local projections.

## Units

```text
postgres -> migrate -> api/worker/ui
```

- `postgres`: local/CI placeholder database.
- `migrate`: Flyway Job from `packages/migrate`.
- `api`: Fastify API from `packages/api`.
- `worker`: projection consumers from `packages/worker`.
- `ui`: server-rendered proof UI from `packages/ui`.

The worker consumes existing streams and does not publish events yet.

## Public Contracts

```text
POST /v1/tenants/:tenant_id/documents
GET /v1/tenants/:tenant_id/documents
GET /documents
```

The command requires:

- valid identity token
- projected tenant
- projected tenant membership
- `documents.enabled = true` in projected tenant capabilities

API docs:

```text
GET /v1/documents/docs
GET /v1/documents/docs/json
```

## Operations

```sh
make deploy-documents
make dev-documents
```

Live Flux units:

```text
documents-postgres -> documents-migrate -> documents-api/documents-worker/documents-ui
```

The worker depends on tenancy and capabilities workers because those streams
must exist before documents consumes them.

## Agent Notes

- Do not call identity, tenancy, or capabilities synchronously for hot-path auth.
- Do not read other domains' databases.
- If managed Postgres replaces the placeholder, remove only `documents-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
