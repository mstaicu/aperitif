# Spaces Domain

Spaces owns tenant authority: accounts, optional spaces, memberships, admissions, and requirement tracking.

## Domain Boundary

Spaces owns the authority topology for accounts and optional spaces.

- `accounts` are the tenant/customer ownership root.
- `account_requirements` are the requirement rows that must be fulfilled before an account can become active.
- `account_memberships` grant tenant/control-plane authority.
- `spaces` are optional authority containers owned by accounts.
- `space_memberships` are the materialized authority grants: user X has role Y in space Z.
- `space_admissions` are the process records that may produce authority.
- `space_admission_requirements` are the requirement rows that must be fulfilled before an admission can complete.

Use accounts only when the product has one authority context: consumer SaaS, personal finance, household subscription, creator account, or simple team account. Add spaces only when an account needs multiple independent authority contexts: projects, workspaces, branches, offices, teams, contractor pools, approval groups, or customer-managed sub-tenants.

Account membership is not implicit authority inside every space. A user needs explicit `space_membership` for space/business authority.

Step domains own evidence collection and validation. For example, a future `profiles` domain owns profile data and decides whether a `profile` requirement is complete. Step domains must not write the spaces database and must not create memberships directly.

The intended integration is:

```text
spaces creates admission + requirement rows
step domains collect and validate evidence
step domains publish requirement completed/failed events
spaces consumes those events
spaces updates requirement status
spaces finalizes authority when all requirements are completed
```

This keeps authority finalization in spaces while allowing each onboarding step to remain independently owned.

Baseline onboarding is identity-first and requirement-driven:

```text
user authenticates through identities
user creates or selects an account
spaces creates account requirements from the account requirement array
account is active immediately if that array is empty
product may stop here for account-only authority
account owner creates a space
space owner creates an admission
recipient claims the admission if it is unbound
step domains publish domain facts, such as profile completed
spaces maps those facts to open requirements for that user
spaces grants membership only when all requirements complete
```

Direct space creation is account-scoped and optional: `POST /accounts/:accountId/spaces` creates a space and owner membership immediately when the product needs a sub-authority context. `POST /admissions/:admissionId/claim` is reserved for unbound space admissions created by an existing space owner.

Space memberships are materialized authority. They are created only by space creation for the creator owner, or by admission completion after requirements are satisfied. Do not directly grant space membership from the public API.

Account requirements gate account activation. Space admission requirements gate space membership. Empty requirement arrays make the lifecycle immediate; non-empty arrays create pending requirement rows.

Core API shape:

```text
GET/POST /accounts
GET /accounts/:accountId
GET /accounts/:accountId/memberships
PUT/DELETE /accounts/:accountId/memberships/:userId
GET /accounts/:accountId/requirements
POST /accounts/:accountId/requirements/:type/complete
GET/POST /accounts/:accountId/spaces
GET /spaces/:spaceId
GET /spaces/:spaceId/memberships
DELETE /spaces/:spaceId/memberships/:userId
GET/POST /spaces/:spaceId/admissions
GET /admissions/:admissionId
POST /admissions/:admissionId/claim
POST /admissions/:admissionId/requirements/:type/complete
```

## Onboarding Examples

The same model supports different product shapes by deciding what the UI exposes and what requirements are created.

Consumer SaaS, account-only:

```text
user registers
POST /accounts { kind: "personal", name: "<user display name>" }
```

The UI does not need to show accounts. The account is enough for billing, subscription ownership, profiles, settings, content ownership, API clients, or future sharing.

Consumer SaaS with sharing later:

```text
user registers
POST /accounts { kind: "personal", name: "<user display name>" }
later, only if a separate sharing context is needed:
POST /accounts/:accountId/spaces { name: "Family" }
```

Do not create a default space unless the product needs separate membership or admission rules beneath the account.

If account requirements are empty, the account is `active` immediately. If they are non-empty, the account is `pending_activation` until the requirements complete.

Team SaaS:

```text
founder registers
POST /accounts { kind: "organization", name: "Acme Ltd" }
POST /accounts/:accountId/spaces { name: "Product Team" }
PUT /accounts/:accountId/memberships/:userId { role: "member" }
POST /spaces/:spaceId/admissions { requested_role: "member" }
recipient opens join link
POST /admissions/:admissionId/claim
```

Account membership lets a user help manage the tenant. Space admission grants authority inside a specific team/workspace/project.

Marketplace or contractor onboarding:

```text
company owner creates account and space
POST /spaces/:spaceId/admissions { requested_role: "contractor" }
contractor claims admission
requirements returned: profile, terms, documents, checks
step domains complete requirements
spaces creates space_membership when all requirements complete
```

Spaces owns the authority decision. Requirement domains own evidence and validation.

Enterprise customer with multiple contexts:

```text
POST /accounts { kind: "organization", name: "Global Corp" }
POST /accounts/:accountId/spaces { name: "UK Office" }
POST /accounts/:accountId/spaces { name: "Finance" }
POST /accounts/:accountId/spaces { name: "External Vendors" }
```

Account owners manage tenant structure. Space owners manage access within each space. Account ownership is not implicit space authority.

Zero-requirement admission:

```text
POST /spaces/:spaceId/admissions { requested_role: "member" }
POST /admissions/:admissionId/claim
```

If the admission has no requirements, claiming it completes the admission and creates the membership immediately.

Requirement-based admission:

```text
POST /spaces/:spaceId/admissions { requested_role: "member" }
POST /admissions/:admissionId/claim
GET /admissions/:admissionId
```

The claim response returns pending requirements. The UI or agent sends the user to the domains that fulfill those requirements.

Account activation:

```text
POST /accounts { kind: "personal", name: "Mircea" }
GET /accounts/:accountId/requirements
POST /accounts/:accountId/requirements/:type/complete
```

When all account requirements are completed, spaces sets the account status to `active`. Later, workers should call the same domain operation from events such as `terms.accepted`, `identity.verified`, or `billing.active`.

Admission finalization:

```text
POST /spaces/:spaceId/admissions { requested_role: "member" }
POST /admissions/:admissionId/claim
POST /admissions/:admissionId/requirements/:type/complete
```

When all admission requirements are completed and the admission is claimed, spaces sets the admission status to `completed` and creates the `space_membership`.

## Deployment Units

The domain unit spine is:

```text
db -> migrate -> api -> ui/worker
```

Current Kubernetes-deployed units:

- `db`: PostgreSQL owned by this domain under `infra/db/overlays/{dev,live}`.
- `migrate`: one-shot migration Job built from `migrations/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `api/` and deployed from `infra/api/overlays/{dev,live}`.

Current source-only units:

- `ui`: not present yet. Add it only when this domain owns a browser surface.
- `worker`: not present yet. Add it only when this domain owns async event processing.

Keep each deployable unit independently addressable. Do not hide `db`, `migrate`, `api`, `ui`, or `worker` behind a fake all-in-one abstraction.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `spaces-db-dev` applies `infra/db/overlays/dev`.
- `spaces-migrate-dev` builds `mdstaicu/spaces-migrate` from `migrations/` and applies `infra/migrate/overlays/dev`.
- `spaces-api-dev` builds `mdstaicu/spaces-api` from `api/`, applies `infra/api/overlays/dev`, and syncs `api/src/**/*`.

The Makefile should preserve the startup order: run `db`, run `migrate`, wait for the migration Job to complete, then start `api` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `spaces-db` points at `domains/spaces/infra/db/overlays/live`.
- `spaces-migrate` points at `domains/spaces/infra/migrate/overlays/live`, depends on `spaces-db`, and should use `force: true`.
- `spaces-api` points at `domains/spaces/infra/api/overlays/live`, depends on `spaces-migrate` and platform ingress.

The live order must remain `db -> migrate -> api`. Migration and API images are Flux-managed through `clusters/prod-eu/image-automation/spaces.yaml`.

Secrets are per deployable unit even when they contain the same database URL. Keep `spaces-api-db` and `spaces-migrate-db` as separate Secret names so each unit owns the contract it consumes.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served by the API at `/docs` behind the `/spaces` gateway prefix.
- Identity dependency: spaces validates identity-issued tokens through the identities JWKS URL and the shared product API audience. It does not own identity records.
- Events: no committed event contract is currently defined for this domain. Existing TODOs should become explicit subject names, payload schemas, and transactional outbox/consumer wiring before NATS is treated as a required dependency.
- Database: spaces owns its schema and migrations in `migrations/`. Other domains must not read or write this database directly.

## Agent Notes

- Copy the folder shape first: `api/`, `infra/db`, `infra/migrate`, `infra/api`, `migrations/`, `skaffold.yaml`, and optional `ui/` or `worker/`.
- Preserve unit boundaries. Route handlers call domain functions; domain functions use the domain context; platform code owns shared concerns like persistence, security, observability, and request problem details.
- Keep API contracts LLM/tool-ready: explicit TypeBox request and response schemas, stable operation summaries, domain-specific error responses, and no implicit response shapes.
- Keep Kubernetes names domain-prefixed except shared service names inside the namespace, such as `postgres-srv`.
- Keep network policy intent simple: ingress reaches APIs through Traefik; APIs reach their own PostgreSQL; APIs or workers reach NATS only when the domain needs eventing.
