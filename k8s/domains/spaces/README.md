# Spaces Domain

Spaces owns space lifecycle, membership management, admissions, and requirement tracking for joining or preparing a space.

## Domain Boundary

Spaces owns the authority topology for spaces.

- `spaces` are the authority containers.
- `space_memberships` are the materialized authority grants: user X has role Y in space Z.
- `space_admissions` are the process records that may produce authority.
- `space_admission_requirements` are the requirement rows that must be fulfilled before an admission can complete.

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

Baseline onboarding is identity-first:

```text
user authenticates through identities
user creates a self-started admission
spaces binds the admission to that user immediately
step domains publish domain facts, such as profile completed
spaces maps those facts to open requirements for that user
spaces grants membership only when all requirements complete
```

Direct space creation remains a separate no-requirement path: `POST /spaces` creates a space and owner membership immediately. Self-started admissions are post-auth only. `POST /admissions/:admissionId/claim` is reserved for unbound space admissions created by an existing space owner.

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
- Identity dependency: spaces validates identity-issued tokens through the identities JWKS URL. It does not own identity records.
- Events: no committed event contract is currently defined for this domain. Existing TODOs should become explicit subject names, payload schemas, and transactional outbox/consumer wiring before NATS is treated as a required dependency.
- Database: spaces owns its schema and migrations in `migrations/`. Other domains must not read or write this database directly.

## Agent Notes

- Copy the folder shape first: `api/`, `infra/db`, `infra/migrate`, `infra/api`, `migrations/`, `skaffold.yaml`, and optional `ui/` or `worker/`.
- Preserve unit boundaries. Route handlers call domain functions; domain functions use the domain context; platform code owns shared concerns like persistence, security, observability, and request problem details.
- Keep API contracts LLM/tool-ready: explicit TypeBox request and response schemas, stable operation summaries, domain-specific error responses, and no implicit response shapes.
- Keep Kubernetes names domain-prefixed except shared service names inside the namespace, such as `postgres-srv`.
- Keep network policy intent simple: ingress reaches APIs through Traefik; APIs reach their own PostgreSQL; APIs or workers reach NATS only when the domain needs eventing.
