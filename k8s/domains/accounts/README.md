# Accounts Domain

Accounts owns the customer/tenant relationship with the app: account lifecycle, account membership, and account activation requirements.

## Domain Boundary

- `accounts` are the tenant/customer ownership root.
- `account_memberships` grant account-level authority to authenticated identities.
- `account_requirements` are activation requirement rows that must be completed before an account becomes active.

Identity stays in `identities`. Plans, subscriptions, invoices, payments, profiles, documents, notifications, workflow, and integrations should live in their own domains and reference `account_id` when they own account-scoped resources.

Step domains own evidence collection and validation. For example, a future billing domain owns payment setup, a future verification domain owns KYC/KYB, and a future terms domain owns terms acceptance. They should not write the accounts database directly.

The intended integration is:

```text
accounts creates account requirement rows
step domains collect and validate evidence
step domains publish requirement completed/failed events
accounts consumes those events
accounts updates requirement status
accounts activates the account when all requirements are completed
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

Request handling should normally derive `user_id` from the bearer token and get `account_id` from the route, body, or loaded resource. Product operations should require account membership and an active account. Setup/onboarding operations may allow `pending_activation` accounts.

## Core API

```text
GET/POST /accounts
GET /accounts/:accountId
GET /accounts/:accountId/memberships
PUT /accounts/:accountId/memberships/:userId
DELETE /accounts/:accountId/memberships/:userId
GET /accounts/:accountId/requirements
POST /accounts/:accountId/requirements/:type/complete
```

## Onboarding Examples

Consumer SaaS without required onboarding:

```text
user registers through identities
POST /accounts { kind: "personal", name: "<display name>" }
account.status = active
```

Consumer SaaS with required onboarding:

```text
user registers through identities
POST /accounts { kind: "personal", name: "<display name>" }
account.status = pending_activation
GET /accounts/:accountId/requirements
step domains complete terms, verification, risk, or billing requirements
account.status = active when all requirements complete
```

B2B SaaS:

```text
founder registers through identities
POST /accounts { kind: "organization", name: "Acme Ltd" }
PUT /accounts/:accountId/memberships/:userId { role: "member" }
```

Regulated fintech-style account:

```text
POST /accounts { kind: "personal", name: "<legal/customer name>" }
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

- `accounts-db-dev` applies `infra/db/overlays/dev`.
- `accounts-migrate-dev` builds `mdstaicu/accounts-migrate` from `migrations/` and applies `infra/migrate/overlays/dev`.
- `accounts-api-dev` builds `mdstaicu/accounts-api` from `api/`, applies `infra/api/overlays/dev`, and syncs `api/src/**/*`.

The Makefile should preserve the startup order: run `db`, run `migrate`, wait for the migration Job to complete, then start `api` in `skaffold dev`.

The worker overlay exists, but it should be added to Skaffold only when event-bus is composed into the local environment.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `accounts-db` points at `domains/accounts/infra/db/overlays/live`.
- `accounts-migrate` points at `domains/accounts/infra/migrate/overlays/live`, depends on `accounts-db`, and uses `force: true`.
- `accounts-api` points at `domains/accounts/infra/api/overlays/live`, depends on `accounts-migrate`, `identities-api`, and platform ingress.

The live order must remain `db -> migrate -> api`. Migration and API images are Flux-managed through `clusters/prod-eu/image-automation/accounts.yaml`.

The worker overlay exists, but it should be added to Flux only with an explicit event-bus dependency.

Secrets are per deployable unit even when they contain the same database URL. Keep `accounts-api-db` and `accounts-migrate-db` as separate Secret names so each unit owns the contract it consumes.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served by the API at `/docs` behind the `/accounts` gateway prefix.
- Identity dependency: accounts validates identity-issued tokens through the identities JWKS URL and the shared product API audience. It does not own identity records.
- Events: the schema includes a transactional `outbox_events` table. The worker ensures the `ACCOUNTS` JetStream stream for `accounts.>` and publishes unpublished rows to that stream. Event subjects and payload contracts are still intentionally minimal.
- Database: accounts owns its schema and migrations in `migrations/`. Other domains must not read or write this database directly.

## Agent Notes

- Copy the folder shape first: `api/`, `infra/db`, `infra/migrate`, `infra/api`, `migrations/`, `skaffold.yaml`, and optional `ui/` or `worker/`.
- Preserve unit boundaries. Route handlers call domain functions; domain functions use the domain context; API platform code owns shared concerns like persistence, security, observability, and request problem details.
- Keep workers on the same spine as APIs: `index` loads config, `worker` wires runtime, `platform` owns infrastructure adapters, and publisher/listener modules own async work.
- Keep API contracts LLM/tool-ready: explicit TypeBox request and response schemas, stable operation summaries, domain-specific error responses, and no implicit response shapes.
- Keep Kubernetes names domain-prefixed except shared service names inside the namespace, such as `postgres-srv`.
- Keep network policy intent simple: ingress reaches APIs through Traefik; APIs reach their own PostgreSQL; APIs or workers reach NATS only when the domain needs eventing.
