# Identities Domain

Identities owns passkey registration, passkey login, session token lifecycle, and the identity signing keys exposed through JWKS.

## Domain Boundary

Identities owns authentication identity, not product authority.

- `users` are stable first-party subject identifiers.
- `passkey_credentials` are WebAuthn/passkey credentials for those subjects.
- `challenges` are short-lived WebAuthn registration/login challenges.
- `sessions` are refresh-token backed identity sessions.
- JWKS is the public verification contract for identity-issued access tokens.

Identities must not own spaces, memberships, admissions, onboarding requirements, tenant authority, or product permissions. Other domains consume identity through access tokens/JWKS and store their own authorization state.

The intended integration is:

```text
identities authenticates a subject
identities issues a shared product API access token
domain APIs verify the token through JWKS
domain APIs authorize from their own state
```

If external IdPs, M2M, or agents are added later, keep them behind the same verification boundary: token issuer -> verified subject/actor -> domain-owned authorization.

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

- `ui`: React Router UI under `ui/`. Add `infra/ui`, Skaffold, and Flux wiring before treating it as a deployable unit.
- `worker`: NATS worker under `worker/`. Add `infra/worker`, Skaffold, and Flux wiring before treating it as a deployable unit.

Keep each deployable unit independently addressable. Do not hide `db`, `migrate`, `api`, `ui`, or `worker` behind a fake all-in-one abstraction.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `identities-db-dev` applies `infra/db/overlays/dev`.
- `identities-migrate-dev` builds `mdstaicu/identities-migrate` from `migrations/` and applies `infra/migrate/overlays/dev`.
- `identities-api-dev` builds `mdstaicu/identities-api` from `api/`, applies `infra/api/overlays/dev`, and syncs `api/src/**/*`.

The Makefile should preserve the startup order: run `db`, run `migrate`, wait for the migration Job to complete, then start `api` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `identities-db` points at `domains/identities/infra/db/overlays/live`.
- `identities-migrate` points at `domains/identities/infra/migrate/overlays/live`, depends on `identities-db`, and should use `force: true`.
- `identities-api` points at `domains/identities/infra/api/overlays/live`, depends on `identities-migrate` and platform ingress.

The live order must remain `db -> migrate -> api`. Migration and API images are Flux-managed through `clusters/prod-eu/image-automation/identities.yaml`.

Secrets are per deployable unit even when they contain the same database URL. Keep `identities-api-db` and `identities-migrate-db` as separate Secret names so each unit owns the contract it consumes.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served by the API at `/docs` behind the `/identities` gateway prefix.
- Public identity contract: JWKS is exposed at `/.well-known/jwks.json` for other domains to validate identity-issued tokens.
- Events: no committed event contract is currently defined for this domain. If eventing is added, document subject names and payload schemas beside the producer/consumer and add worker deployment wiring explicitly.
- Database: identities owns its schema and migrations in `migrations/`. Other domains must not read or write this database directly.

## Agent Notes

- Copy the folder shape first: `api/`, `infra/db`, `infra/migrate`, `infra/api`, `migrations/`, `skaffold.yaml`, and optional `ui/` or `worker/`.
- Preserve unit boundaries. Route handlers call domain functions; domain functions use the domain context; platform code owns shared concerns like persistence, security, observability, and request problem details.
- Keep API contracts LLM/tool-ready: explicit TypeBox request and response schemas, stable operation summaries, domain-specific error responses, and no implicit response shapes.
- Keep Kubernetes names domain-prefixed except shared service names inside the namespace, such as `postgres-srv`.
- Keep network policy intent simple: ingress reaches APIs through Traefik; APIs reach their own PostgreSQL; APIs or workers reach NATS only when the domain needs eventing.
