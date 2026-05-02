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
tenancy creates account requirement rows when onboarding requirements exist
step domains collect and validate evidence
step domains publish fulfillment events
tenancy consumes those events through an internal worker path
tenancy updates requirement status
tenancy activates the account when all requirements are completed
```

The current API does not expose direct member creation/invite or manual requirement completion. Account creation grants owner membership to the caller. Future member adds should come from invite, provisioning, or another explicit proof workflow. Future requirement completion should be consumed from fulfillment-domain events, not called synchronously from a public route.

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
DELETE /tenancy/v1/accounts/:accountId/memberships/:userId
GET /tenancy/v1/accounts/:accountId/requirements
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
step domains fulfill terms, verification, risk, or billing requirements
tenancy consumes fulfillment events
account.status = active when all requirements complete
```

B2B SaaS:

```text
founder registers through identities
POST /tenancy/v1/accounts { kind: "organization", name: "Acme Ltd" }
future invite/provisioning flow creates additional account memberships
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
db -> migrate -> api/worker
```

Current Kubernetes-expressed units:

- `db`: PostgreSQL owned by this domain under `infra/db/overlays/{dev,live}`.
- `migrate`: one-shot migration Job built from `migrations/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `api/` and deployed from `infra/api/overlays/{dev,live}`.
- `worker`: outbox publisher built from `worker/` and deployed from `infra/worker/overlays/{dev,live}` when event-bus is composed into the environment.

Current source-only units:

- `ui`: not present yet. Add it only when this domain owns a browser surface.

Keep each deployable unit independently addressable. Do not hide `db`, `migrate`, `api`, `ui`, or `worker` behind a fake all-in-one abstraction. A future UI should own `/tenancy` while the API keeps `/tenancy/v1`.

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

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served through the `/tenancy/v1` gateway API prefix.
- Identity dependency: tenancy validates identity-issued tokens through the identities JWKS URL and the shared product API audience. It does not own identity records.
- Events: the schema includes a transactional `outbox_events` table. The worker ensures the `TENANCY` JetStream stream plus a `tenancy-worker` durable consumer for `tenancy.>`, publishes unpublished rows to that stream, and provides the baseline consumer spine. Event rows carry the stable event `id`, `subject`, account authority `version`, `occurred_at`, `producer`, `schema_version`, and a minimal domain payload.
- Event schemas: TypeBox/JSDoc event contracts live in `api/src/events/versions/v1/`. Add a new version folder only when a wire payload shape changes.
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
- `tenancy.account_membership.created`
- `tenancy.account_membership.deleted`

Event payloads are intentionally projection-shaped. Consumers store each processed event `id` for idempotency, store the latest account authority `version` they have applied for each `account.id`, and ignore duplicate or stale events where `event.version <= projected_account_version`.

```json
{
  "id": "event-id",
  "subject": "tenancy.account_membership.created",
  "version": 2,
  "occurred_at": "2026-05-02T10:15:30.000Z",
  "producer": "tenancy",
  "schema_version": 1,
  "payload": {
    "account": {
      "id": "account-id",
      "kind": "organization",
      "name": "Acme Ltd",
      "status": "active"
    },
    "membership": {
      "account_id": "account-id",
      "role": "owner",
      "user_id": "user-id"
    }
  }
}
```

## Agent Context

Agent-specific gotchas live in `AGENTS.md`. Keep this README human-facing and avoid duplicating agent-only rules here.
