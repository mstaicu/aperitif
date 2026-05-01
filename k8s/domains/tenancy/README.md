# Tenancy Domain

Tenancy owns the customer/tenant relationship with the app: account lifecycle, account membership, and account activation requirements.

## Domain Boundary

- `accounts` are the tenant/customer ownership root.
- `account_memberships` grant account-level authority to authenticated identities.
- `account_requirements` are activation requirement rows that must be completed before an account becomes active.

Identity stays in `identities`. Plans, subscriptions, invoices, payments, profiles, documents, notifications, workflow, and integrations should live in their own domains and reference `account_id` when they own account-scoped resources.

Step domains own evidence collection and validation. For example, a future billing domain owns payment setup, a future verification domain owns KYC/KYB, and a future terms domain owns terms acceptance. They should not write the tenancy database directly.

The intended integration is:

```text
tenancy creates account requirement rows
step domains collect and validate evidence
step domains publish requirement completed events
tenancy consumes those events
tenancy updates requirement status
tenancy activates the account when all requirements are completed
```

The current completion endpoint is a manual/internal seam until the first fulfillment domain and event consumer exist.

## Core Model

```text
identity = who the actor is
account = customer/tenant/ownership relationship with the app
account_membership = who can act in that account
account_requirement = what must happen before the account is active
```

Product resources in other domains should generally be account-owned:

```text
resource.account_id
```

Request handling should normally derive `user_id` from the bearer token and get `account_id` from the route, body, or loaded resource. Product operations should require account membership and an active account. Setup/onboarding operations may allow `pending` accounts.

## Core API

```text
GET/POST /tenancy/v1/accounts
GET /tenancy/v1/accounts/:accountId
GET /tenancy/v1/accounts/:accountId/memberships
GET /tenancy/v1/accounts/:accountId/memberships/:userId
PUT /tenancy/v1/accounts/:accountId/memberships/:userId
DELETE /tenancy/v1/accounts/:accountId/memberships/:userId
GET /tenancy/v1/accounts/:accountId/requirements
POST /tenancy/v1/accounts/:accountId/requirements/:type/complete
```

## Onboarding Examples

Consumer SaaS without required onboarding:

```text
user registers through identities
POST /tenancy/v1/accounts { kind: "personal", name: "<display name>" }
account.status = active
```

Consumer SaaS with required onboarding:

```text
user registers through identities
POST /tenancy/v1/accounts { kind: "personal", name: "<display name>" }
account.status = pending
GET /tenancy/v1/accounts/:accountId/requirements
step domains complete terms, verification, risk, or billing requirements
account.status = active when all requirements complete
```

B2B SaaS:

```text
founder registers through identities
POST /tenancy/v1/accounts { kind: "organization", name: "Acme Ltd" }
PUT /tenancy/v1/accounts/:accountId/memberships/:userId { role: "member" }
```

Regulated fintech-style account:

```text
POST /tenancy/v1/accounts { kind: "personal", name: "<legal/customer name>" }
requirements = terms_acceptance, identity_verification, address_verification, risk_screening
verification/risk/terms domains complete their owned requirements
account.status = active when all required checks pass
```

## Deployment Units

The domain unit spine is:

```text
db -> migrate -> api -> ui/worker
```

Current Kubernetes-expressed units:

- `db`: PostgreSQL owned by this domain under `infra/db/overlays/{dev,live}`.
- `migrate`: one-shot migration Job built from `migrations/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `api/` and deployed from `infra/api/overlays/{dev,live}`.
- `worker`: outbox publisher built from `worker/` and deployed from `infra/worker/overlays/{dev,live}` when event-bus is composed into the environment.

Current source-only units:

- `ui`: not present yet. Add it only when this domain owns a browser surface.

Keep each deployable unit independently addressable. Do not hide `db`, `migrate`, `api`, `ui`, or `worker` behind a fake all-in-one abstraction.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `tenancy-db-dev` applies `infra/db/overlays/dev`.
- `tenancy-migrate-dev` builds `mdstaicu/tenancy-migrate` from `migrations/` and applies `infra/migrate/overlays/dev`.
- `tenancy-api-dev` builds `mdstaicu/tenancy-api` from `api/`, applies `infra/api/overlays/dev`, and syncs `api/src/**/*`.
- `tenancy-worker-dev` builds `mdstaicu/tenancy-worker` from `worker/`, applies `infra/worker/overlays/dev`, and syncs `worker/src/**/*`.

The Makefile should preserve the startup order: run platform dependencies, run `db`, run `migrate`, wait for the migration Job to complete, then start `api` and `worker` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `tenancy-db` points at `domains/tenancy/infra/db/overlays/live`.
- `tenancy-migrate` points at `domains/tenancy/infra/migrate/overlays/live`, depends on `tenancy-db`, and uses `force: true`.
- `tenancy-api` points at `domains/tenancy/infra/api/overlays/live`, depends on `tenancy-migrate`, `identities-api`, and platform ingress.
- `tenancy-worker` points at `domains/tenancy/infra/worker/overlays/live`, depends on `tenancy-migrate` and platform event-bus.

The live order must remain `db -> migrate -> api/worker`. Migration, API, and worker images are Flux-managed through `clusters/prod-eu/image-automation/tenancy.yaml`.

Secrets are per deployable unit even when they contain the same database URL. Keep `tenancy-api-db`, `tenancy-migrate-db`, and `tenancy-worker-db` as separate Secret names so each unit owns the contract it consumes.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served by the API at `/docs` behind the `/tenancy` gateway prefix.
- Identity dependency: tenancy validates identity-issued tokens through the identities JWKS URL and the shared product API audience. It does not own identity records.
- Events: the schema includes a transactional `outbox_events` table. The worker ensures the `TENANCY` JetStream stream plus a `tenancy-worker` durable consumer for `tenancy.>`, publishes unpublished rows to that stream, and provides the baseline consumer spine. Event rows carry `subject`, account authority `version`, and a minimal domain payload.
- Database: tenancy owns its schema and migrations in `migrations/`. Other domains must not read or write this database directly.

## Event Publishing Mechanics

Tenancy authority events follow this path:

```text
request handler -> domain function -> DB transaction
DB transaction -> account/account_membership/account_requirement change
DB transaction -> outbox_events row
Postgres trigger -> pg_notify wake-up
worker -> drains unpublished outbox rows
worker -> publishes to TENANCY JetStream stream
worker -> sets published_at after JetStream accepts the event
```

The durable source is `outbox_events`, not the Postgres notification. The notification only wakes the worker. On startup, the worker drains existing unpublished rows before waiting for new notifications.

Request handlers must not publish tenancy authority events directly to NATS. They write state and event intent in the same database transaction.

Current event subjects:

- `tenancy.account.created`
- `tenancy.account.updated`
- `tenancy.account_membership.created`
- `tenancy.account_membership.deleted`
- `tenancy.account_requirement.completed`

Event payloads are intentionally projection-shaped. Consumers store the latest account authority `version` they have applied for each `account.id` and ignore events where `event.version <= projected_account_version`.

```json
{
  "subject": "tenancy.account_membership.created",
  "version": 12,
  "payload": {
    "account": {
      "id": "account-id",
      "kind": "organization",
      "name": "Acme Ltd",
      "status": "active"
    },
    "membership": {
      "account_id": "account-id",
      "role": "member",
      "user_id": "user-id"
    }
  }
}
```

## Agent Context

Agent-specific gotchas live in `AGENTS.md`. Keep this README human-facing and avoid duplicating agent-only rules here.
