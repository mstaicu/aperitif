# Tenancy Domain

Tenancy owns tenant-scoped authority: tenants, tenant membership, and
workspaces.

## Domain Boundary

- `tenants` are the authority root for tenant-scoped resources.
- `tenant_memberships` grant tenant-level authority to authenticated identity.
- `workspaces` are operational resource containers inside a tenant.

Identity stays in `identity`. Feature grants, profiles, documents,
notifications, workflow, and integrations should live in their own domains and
reference `tenant_id` or `workspace_id` when they own tenant/workspace-scoped
resources.

The current API does not expose direct member creation, invite, membership
inspection, membership deletion, or lifecycle toggles. Tenant creation grants
owner membership to the caller. Workspaces are created separately when a domain
needs an operational resource container.

## Core Model

```text
identity = who the actor is
tenant = authority root for tenant-scoped access
tenant_membership = who can act in that tenant
workspace = operational container for resource data inside the tenant
```

Resources in other domains should generally be workspace-owned when
they are operational data:

```text
resource.workspace_id
resource.tenant_id
```

Request handling should normally derive `user_id` from the bearer token and get
`tenant_id` or `workspace_id` from the route, body, or loaded resource. Domain
operations should require tenant membership and the referenced workspace when
they are workspace-scoped.

## Core API

```text
GET /v1/tenants
POST /v1/tenants
POST /v1/tenants/:tenantId/workspaces
```

## Onboarding Examples

Consumer SaaS without required onboarding:

```text
user registers through identity
POST /v1/tenants { name: "<display name>" }
resource domain creates a workspace only if it needs one
POST /v1/tenants/:tenantId/workspaces { name: "<workspace name>" }
```

B2B SaaS:

```text
founder registers through identity
POST /v1/tenants { name: "<organization name>" }
resource domain creates one or more workspaces if it needs operational containers
POST /v1/tenants/:tenantId/workspaces { name: "<workspace name>" }
future invite/provisioning flow creates additional tenant memberships
```

## Deployment Units

The domain unit spine is:

```text
postgres -> migrate -> api/worker
```

Current Kubernetes-expressed units:

- `postgres`: local/CI PostgreSQL unit under `infra/postgres/overlays/{dev,live}`; live currently uses it as a placeholder until a managed database replaces it.
- `migrate`: one-shot Flyway migration Job built from `packages/database/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `packages/api/` and deployed from `infra/api/overlays/{dev,live}`.
- `worker`: outbox publisher built from `packages/worker/` and deployed from `infra/worker/overlays/{dev,live}` when event-bus is composed into the environment.

Current source-only units:

- `ui`: not present yet. Add it only when this domain owns a browser surface.

Keep each deployable unit independently addressable. Do not hide `postgres`, `migrate`, `api`, `ui`, or `worker` behind a fake all-in-one abstraction. A future UI should own `/tenants` on `tma.com`, while the public API keeps `/v1/tenants` on `api.tma.com`.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `tenancy-postgres-dev` applies `infra/postgres/overlays/dev`.
- `tenancy-migrate-dev` builds `mdstaicu/tenancy-migrate` from `packages/database/` and applies `infra/migrate/overlays/dev`.
- `tenancy-api-dev` builds `mdstaicu/tenancy-api` from `packages/api/`, applies `infra/api/overlays/dev`, and syncs `packages/api/src/**/*`.
- `tenancy-worker-dev` builds `mdstaicu/tenancy-worker` from `packages/worker/`, applies `infra/worker/overlays/dev`, and syncs `packages/worker/src/**/*`.

The Makefile should preserve the startup order: run platform dependencies, run `postgres`, run `migrate`, wait for the migration Job to complete, then start `api` and `worker` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `tenancy-postgres` points at `domains/tenancy/infra/postgres/overlays/live`.
- `tenancy-migrate` points at `domains/tenancy/infra/migrate/overlays/live`, depends on `tenancy-postgres`, and uses `force: true`.
- `tenancy-api` points at `domains/tenancy/infra/api/overlays/live`, depends on `tenancy-migrate`, `identity-api`, and platform ingress.
- `tenancy-worker` points at `domains/tenancy/infra/worker/overlays/live`, depends on `tenancy-migrate` and platform event-bus.

The live order must remain `postgres -> migrate -> api/worker`. Migration, API, and worker images are Flux-managed through `clusters/prod-eu/image-automation/tenancy.yaml`.

Secrets are per deployable unit. Keep `tenancy-api-db`, `tenancy-migrate-db`, and `tenancy-worker-db` as separate Secret names because the API, migrator, and worker use different database roles.

When live moves to a managed database, remove `tenancy-postgres` from the Flux graph, run the database bootstrap SQL against the managed database, and keep `tenancy-migrate -> tenancy-api/worker`.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served through `api.tma.com/v1/tenancy/docs`.
- Identity dependency: tenancy validates identity-issued tokens through the identity JWKS URL and the shared API audience. It does not own identity records.
- Events: the schema includes a transactional `outbox_events` table. The worker
  ensures the `TENANCY` JetStream stream and publishes unpublished rows to that
  stream. Outbox rows store the complete event envelope as JSON, so the worker
  publishes the event exactly as recorded in the transaction.
- Event schemas: TypeBox/JSDoc event contracts live in `packages/api/src/events/versions/v1/`. Add a new version folder only when a wire payload shape changes.
- Database: tenancy owns its schema and Flyway migration package in `packages/database/`. Other domains must not read or write this database directly.

## Event Publishing Mechanics

Tenancy authority events follow this path:

```text
request handler -> domain function -> DB transaction
DB transaction -> tenant/tenant_membership/workspace change
DB transaction -> outbox_events row
Postgres trigger -> pg_notify wake-up
worker -> drains unpublished outbox rows
worker -> publishes to TENANCY JetStream stream
worker -> sets published_at after JetStream accepts the event
```

The durable source is `outbox_events`, not the Postgres notification. The notification only wakes the worker. On startup, the worker drains existing unpublished rows before waiting for new notifications.

Request handlers must not publish tenancy authority events directly to NATS. They write state and event intent in the same database transaction.

Current event subjects:

- `tenancy.tenant.updated`
- `tenancy.tenant_membership.updated`
- `tenancy.workspace.updated`

Event payloads are intentionally projection-shaped and minimal. Consumers should
use natural projection keys plus the latest applied event `version` to ignore
duplicate or stale events where `event.version <= projected.version`.

Do not break an existing subject plus `schema_version` in place. Add a new
schema version or subject, deploy consumers that understand it, then switch
producers only after old consumers no longer depend on the previous contract.

Every tenancy event payload must include `payload.tenant.id`, including future
events for teams or other tenant-owned authority changes. Consumers use
`payload.tenant.id` plus event `version` as the projection ordering key. Any
authority-affecting tenancy event must increment `tenants.version` and publish
the new value as the event `version`.

```json
{
  "id": "event-id",
  "subject": "tenancy.tenant_membership.updated",
  "version": 2,
  "schema_version": 1,
  "payload": {
    "tenant": {
      "id": "tenant-id"
    },
    "membership": {
      "tenant_id": "tenant-id",
      "role": "owner",
      "user_id": "user-id"
    }
  }
}
```
