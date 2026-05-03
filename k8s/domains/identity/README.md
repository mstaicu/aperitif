# Identity Domain

Identity owns passkey registration, passkey login, session token lifecycle, and the identity signing keys exposed through JWKS.

## Domain Boundary

Identity owns authentication identity, not product authority.

- `users` are stable first-party subject identifiers.
- `passkey_credentials` are WebAuthn/passkey credentials for those subjects.
- `challenges` are short-lived WebAuthn registration/login challenges.
- `sessions` are refresh-token backed identity sessions.
- JWKS is the public verification contract for identity-issued access tokens.

Identity must not own accounts, memberships, onboarding requirements, account authority, or product permissions. Other domains consume identity through access tokens/JWKS and store their own authorization state.

The intended integration is:

```text
identity authenticates a subject
identity issues a shared product API access token
domain APIs verify the token through JWKS
domain APIs authorize from their own state
```

If external IdPs, M2M, or agents are added later, keep them behind the same verification boundary: token issuer -> verified subject/actor -> domain-owned authorization.

## Deployment Units

The domain unit spine is:

```text
db -> migrate -> api -> ui
```

Current Kubernetes-deployable units:

- `db`: PostgreSQL owned by this domain under `infra/db/overlays/{dev,live}`.
- `migrate`: one-shot migration Job built from `migrations/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `api/` and deployed from `infra/api/overlays/{dev,live}`.
- `ui`: Remix 3 beta UI built from `ui/` and expressed under `infra/ui/overlays/{dev,live}`.

There is no identity worker right now. Add one only when identity has a real event contract, and copy the accounts worker spine instead of reviving ad hoc worker code.

Keep each deployable unit independently addressable. Do not hide `db`, `migrate`, `api`, or `ui` behind a fake all-in-one abstraction.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `identity-db-dev` applies `infra/db/overlays/dev`.
- `identity-migrate-dev` builds `mdstaicu/identity-migrate` from `migrations/` and applies `infra/migrate/overlays/dev`.
- `identity-api-dev` builds `mdstaicu/identity-api` from `api/`, applies `infra/api/overlays/dev`, and syncs `api/src/**/*`.
- `identity-ui-dev` builds `mdstaicu/identity-ui` from `ui/`, applies `infra/ui/overlays/dev`, and syncs `ui/app/**/*`, `ui/public/**/*`, and `ui/server.ts`.

The Makefile preserves the startup order: run `db`, run `migrate`, wait for the migration Job to complete, then start `api` and `ui` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `identity-db` points at `domains/identity/infra/db/overlays/live`.
- `identity-migrate` points at `domains/identity/infra/migrate/overlays/live`, depends on `identity-db`, and should use `force: true`.
- `identity-api` points at `domains/identity/infra/api/overlays/live`, depends on `identity-migrate` and platform ingress.
- `identity-ui` points at `domains/identity/infra/ui/overlays/live`, depends on `identity-api` and platform ingress.

The live order must remain `db -> migrate -> api -> ui`. Migration, API, and UI images are Flux-managed through `clusters/prod-eu/image-automation/identity.yaml`.

Secrets are per deployable unit even when they contain the same database URL. Keep `identity-api-db` and `identity-migrate-db` as separate Secret names so each unit owns the contract it consumes.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served through `api.tma.com/v1/identity/docs`.
- UI: `identity-ui` serves product-shaped public routes on `tma.com`: `GET /signup`, `POST /signup/challenge`, `POST /signup`, `GET /login`, `POST /login/challenge`, and `POST /login`. Browser bundles stay namespaced under `/identity/assets/*`.
- Public identity contract: JWKS is exposed at `api.tma.com/.well-known/jwks.json` for other domains to validate identity-issued tokens.
- Session token endpoints use explicit token nouns: `POST /v1/sessions/access-token` creates a short-lived product API access token from a refresh token, and `POST /v1/sessions/refresh-token` rotates the refresh token for the current identity session.
- Observability: `identity-api` and `identity-ui` emit traces only when their overlays configure `OTEL_EXPORTER_OTLP_ENDPOINT`; metrics and logs stay disabled for both domain units.
- Events: no committed event contract is currently defined for this domain. If eventing is added, document subject names and payload schemas beside the producer/consumer, then add worker source, `infra/worker`, Skaffold, and Flux wiring explicitly.
- Database: identity owns its schema and migrations in `migrations/`. Other domains must not read or write this database directly.

## Agent Context

Agent-specific gotchas live in `AGENTS.md`. Keep this README human-facing and avoid duplicating agent-only rules here.
