# Tenancy Domain

Tenancy owns tenant-scoped authority: tenant lifecycle, tenant membership, and tenant activation requirements.

## Domain Boundary

- `tenants` are the product authority root for tenant-scoped resources.
- `tenant_memberships` grant tenant-level authority to authenticated identity.
- `tenant_requirements` are activation requirement rows that must be completed before a tenant becomes active.

Identity stays in `identity`. Plans, subscriptions, invoices, payments, profiles, documents, notifications, workflow, and integrations should live in their own domains and reference `tenant_id` when they own tenant-scoped resources.

Step domains own evidence collection and validation. For example, a future billing domain owns payment setup, a future verification domain owns KYC/KYB, and a future terms domain owns terms acceptance. They should not write the tenancy database directly.

The intended integration is:

```text
tenancy creates tenant requirement rows when onboarding requirements exist
step domains collect and validate evidence
step domains publish fulfillment events
tenancy consumes those events through an internal worker path
tenancy updates requirement status
tenancy activates the tenant when all requirements are completed
```

The current API does not expose direct member creation/invite or manual requirement completion. Tenant creation grants owner membership to the caller. Future member adds should come from invite, provisioning, or another explicit proof workflow. Future requirement completion should be consumed from fulfillment-domain events, not called synchronously from a public route.

## Core Model

```text
identity = who the actor is
tenant = authority root for tenant-scoped product access
tenant_membership = who can act in that tenant
tenant_requirement = what must happen before the tenant is active
```

Product resources in other domains should generally be tenant-owned:

```text
resource.tenant_id
```

Request handling should normally derive `user_id` from the bearer token and get `tenant_id` from the route, body, or loaded resource. Product operations should require tenant membership and an active tenant. Setup/onboarding operations may allow `pending` tenants.

## Core API

```text
GET/POST /v1/tenants
GET /v1/tenants/:tenantId
GET /v1/tenants/:tenantId/memberships
GET /v1/tenants/:tenantId/memberships/:userId
DELETE /v1/tenants/:tenantId/memberships/:userId
GET /v1/tenants/:tenantId/requirements
```

## Onboarding Examples

Consumer SaaS without required onboarding:

```text
user registers through identity
POST /v1/tenants { kind: "personal", name: "<display name>" }
tenant.status = active
```

Consumer SaaS with required onboarding:

```text
user registers through identity
POST /v1/tenants { kind: "personal", name: "<display name>" }
tenant.status = pending
GET /v1/tenants/:tenantId/requirements
step domains fulfill terms, verification, risk, or billing requirements
tenancy consumes fulfillment events
tenant.status = active when all requirements complete
```

B2B SaaS:

```text
founder registers through identity
POST /v1/tenants { kind: "organization", name: "Acme Ltd" }
future invite/provisioning flow creates additional tenant memberships
```

Regulated fintech-style tenant:

```text
POST /v1/tenants { kind: "personal", name: "<legal/customer name>" }
requirements = terms_acceptance, identity_verification, address_verification, risk_screening
verification/risk/terms domains complete their owned requirements
tenant.status = active when all required checks pass
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

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served through `api.tma.com/v1/tenants/docs`.
- Identity dependency: tenancy validates identity-issued tokens through the identity JWKS URL and the shared product API audience. It does not own identity records.
- Events: the schema includes a transactional `outbox_events` table. The worker ensures the `TENANCY` JetStream stream plus a `tenancy-worker` durable consumer for `tenancy.>`, publishes unpublished rows to that stream, and provides the baseline consumer spine. Event rows carry the stable event `id`, `subject`, tenant authority `version`, `occurred_at`, `producer`, `schema_version`, and a minimal domain payload.
- Event schemas: TypeBox/JSDoc event contracts live in `packages/api/src/events/versions/v1/`. Add a new version folder only when a wire payload shape changes.
- Database: tenancy owns its schema and Flyway migration package in `packages/database/`. Other domains must not read or write this database directly.

## Event Publishing Mechanics

Tenancy authority events follow this path:

```text
request handler -> domain function -> DB transaction
DB transaction -> tenant/tenant_membership/tenant_requirement change
DB transaction -> outbox_events row
Postgres trigger -> pg_notify wake-up
worker -> drains unpublished outbox rows
worker -> publishes to TENANCY JetStream stream
worker -> sets published_at after JetStream accepts the event
```

The durable source is `outbox_events`, not the Postgres notification. The notification only wakes the worker. On startup, the worker drains existing unpublished rows before waiting for new notifications.

Request handlers must not publish tenancy authority events directly to NATS. They write state and event intent in the same database transaction.

Current event subjects:

- `tenancy.tenant.created`
- `tenancy.tenant_membership.created`
- `tenancy.tenant_membership.deleted`

Event payloads are intentionally projection-shaped. Consumers store each processed event `id` for idempotency, store the latest tenant authority `version` they have applied for each `tenant.id`, and ignore duplicate or stale events where `event.version <= projected_tenant_version`.

```json
{
  "id": "event-id",
  "subject": "tenancy.tenant_membership.created",
  "version": 2,
  "occurred_at": "2026-05-02T10:15:30.000Z",
  "producer": "tenancy",
  "schema_version": 1,
  "payload": {
    "tenant": {
      "id": "tenant-id",
      "kind": "organization",
      "name": "Acme Ltd",
      "status": "active"
    },
    "membership": {
      "tenant_id": "tenant-id",
      "role": "owner",
      "user_id": "user-id"
    }
  }
}
```

## Agent Context

Agent-specific gotchas live in `AGENTS.md`. Keep this README human-facing and avoid duplicating agent-only rules here.
