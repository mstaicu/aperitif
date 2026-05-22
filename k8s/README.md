# Aperitif Kubernetes

This repo is the Kubernetes and delivery spine for Aperitif. It keeps platform capabilities and domain capabilities explicit, composable, and deployable through the same mental model in local development and Flux-managed environments.

Treat this `k8s/` directory as the project root. All paths, Make targets, Skaffold commands, Flux paths, GitHub workflows, and checks in this README are relative to this directory, even when the parent Git repository contains other folders.

The project intentionally does not hide deployment units behind a fake "app" abstraction. A domain is composed from small units with clear ownership:

```text
postgres -> migrate -> api/ui/worker
```

`ui` and `worker` exist only when the domain actually owns those capabilities.

## Principles

- Keep deployable unit boundaries honest. `db`, `migrate`, `api`, `ui`, and `worker` are separate units with separate manifests and lifecycle.
- Keep local and live composition on the same spine. Local uses Skaffold and Make; live uses Flux Kustomizations.
- Keep contracts explicit. HTTP contracts are OpenAPI/TypeBox; event contracts must name subjects and payloads; database ownership is per domain.
- Keep platform dependencies explicit. A domain should not silently assume platform capabilities unless those capabilities are deployed by the environment.
- Keep deleting fake abstractions. Prefer direct, readable wiring over clever layers that hide ownership.

## Current Shape

```text
.github/
  workflows/              pull request integration workflows

clusters/
  prod-eu/
    platform/             Flux Kustomizations for platform units
    domains/              Flux Kustomizations for domain units
    image-automation/     Flux image repositories, policies, and updates
    flux-system/          bootstrap notes; Flux creates runtime sync resources
  staging-eu/
    flux-system/          bootstrap notes

platform/
  ingress/                Traefik, Gateway API CRDs, Gateways, HTTPRoutes
  event-bus/              NATS JetStream for durable domain events
  observability/          OpenTelemetry Collector
  mesh/                   present, not currently composed

domains/
  identity/                passkeys, sessions, JWKS, identity signing keys
  tenancy/                tenant authority, memberships, workspaces
  features/               feature authority and tenancy projection
  documents/              product-domain ABAC proof using tenancy/features projections

Makefile                  local orchestration
Brewfile                  local toolchain
.sops.yaml                SOPS age recipient rules
skaffold.yaml             root Skaffold composition
```

The currently composed platform units are ingress, event-bus, and observability. Mesh exists, but it is not part of the active local/prod-eu spine unless explicitly added.

## Agent Context

Repo-wide agent instructions live in the root `AGENTS.md`. Do not add scoped
agent files by default. If an agent instruction is discoverable from code,
README files, tests, or Make targets, fix that source instead of adding
agent-only context.

## Domain Model

Each domain should document itself in `domains/<domain>/README.md`.

Current domains:

- `identity`: owns passkey registration/login, sessions, token signing, and JWKS.
- `tenancy`: owns tenant authority, tenant memberships, and workspaces.
- `features`: owns feature definitions, tenant feature grants, and effective feature events.
- `documents`: owns workspace-scoped documents and proves product-domain ABAC from identity, tenancy, and features projections.

Each domain owns its database schema and migrations. Other domains must call the owning API or consume declared events; they must not read or write another domain database directly.

## Deployment Units

Each domain follows this order:

```text
postgres -> migrate -> api/worker/ui
```

If a domain owns async event publishing or consumption, add `worker` as a separate deployable unit:

```text
postgres -> migrate -> api/worker
```

If a domain owns a browser surface, add `ui` as a separate deployable unit.

HTTP route ownership lives in the unit that serves HTTP, usually `api` and sometimes `ui`. Postgres and migrate units should stay out of gateway concerns.

Migration units are one-shot Kubernetes Jobs. In live, migration Kustomizations must be Flux-managed and use `force: true` so reconciliation can recreate completed Jobs when migration image content changes. Prefer immutable image tags or digests for migrations; do not rely on a static `latest` tag when migration content needs to trigger a rerun.

Database access has three layers:

```text
bootstrap/admin role -> migrator role -> api/worker runtime roles
```

The bootstrap/admin role creates the database roles and base grants. Flyway uses
the migrator role to create or change schema objects. APIs and workers use
runtime login roles that inherit a shared no-login runtime role. Runtime roles
can use application tables, but should not own schema or perform DDL.

`infra/postgres` is the domain-owned local/CI Postgres unit and the current live
placeholder. When production moves to managed databases, keep `infra/postgres`
for local/CI, remove the live Postgres Flux unit, run the domain bootstrap SQL
against the managed database, and point the encrypted live DB Secrets at the
managed host.

## Platform Model

Ingress and event-bus are the active platform baseline.

Local ingress setup does three jobs:

- Installs Gateway API CRDs.
- Creates local machine trust and host routing with `mkcert` and `/etc/hosts`.
- Applies Traefik and Gateway API manifests through Skaffold/Kustomize.

Live ingress is managed by Flux from `clusters/prod-eu/platform/ingress.yaml` and points at `platform/ingress/overlays/live`.

Traefik Gateway listeners currently allow `HTTPRoute` attachment from all namespaces. This keeps domain route ownership simple: domains own their own `HTTPRoute`s, and the repo review boundary controls what attaches to the shared Gateway. Public browser UIs should use `tma.com`; public APIs should use resource-first paths under `api.tma.com/v1`, such as `/v1/tenants`, `/v1/passkeys`, and `/v1/sessions`. Internal HTTP routes stay on the internal Gateway without hostnames.

Event-bus is NATS JetStream. Domains that emit authority/state events should write a transactional outbox row in the same database transaction as the state change, then let a domain worker publish to JetStream. Request handlers should not publish authority events directly.

Observability is part of the active platform baseline. `make deploy-observability` deploys the OpenTelemetry Collector, and `make dev` plus domain deploy targets run it before OTel-emitting workloads. APIs still register OTel conditionally: `OTEL_EXPORTER_OTLP_ENDPOINT` present means real OTel, absent means no-op.

## Local Development

Install tools:

```sh
brew bundle
```

Start Docker Desktop, kind, or another local Kubernetes cluster, then run one of:

```sh
make dev
make dev-identity
make dev-tenancy
make dev-features
make dev-documents
```

Deploy-and-exit targets are useful for checks and CI-style local testing:

```sh
make deploy-identity
make deploy-tenancy
make deploy-features
make deploy-documents
```

The Make targets intentionally run the same dependency order as live:

```text
declared platform deps -> postgres -> migrate -> wait for migration Job -> api/ui/worker
```

Use `make deploy-ingress` when you only need Traefik, Gateway API CRDs, local TLS, and local host routing.

Use `make deploy-observability` when you only need the OpenTelemetry Collector.

The default local domain is `tma.com`. Override it when needed:

```sh
make deploy-ingress DOMAIN=example.test
```

## Pull Request Integration

The GitHub workflow under `.github/workflows/domains.yaml` detects changed
domains under `domains/**`, runs each domain's `pre-deploy` target, creates a
kind cluster, deploys each selected domain through the matching root
`deploy-<domain>` target, port-forwards Traefik, and runs each domain's
`post-deploy` target.

This intentionally reuses the same dev overlays and Make/Skaffold path used locally.

## Live Deployment With Flux

Flux live composition starts at:

```text
clusters/prod-eu/kustomization.yaml
```

That file includes:

- `image-automation`
- `platform.yaml`
- `domains.yaml`

`platform.yaml` reconciles platform units. `domains.yaml` reconciles domain units.

For each domain, live Flux Kustomizations should preserve this dependency order:

```text
<domain>-postgres -> <domain>-migrate -> <domain>-api/worker/ui
```

The API Kustomization depends on ingress and the domain migration unit. A UI
Kustomization depends on ingress and, when it calls the domain API, the API
unit. The migration Kustomization depends on the Postgres unit and uses
`force: true`.

When production uses a managed database, remove the live Postgres Kustomization
from the domain graph. The managed database and its bootstrap roles become an
external precondition before Flux reconciles the migrate unit.

Bootstrap details live in:

- `clusters/prod-eu/flux-system/README.md`
- `clusters/staging-eu/flux-system/README.md`

## Secrets

SOPS uses age recipients from `.sops.yaml`. The private key is never committed.

Set your local key path:

```sh
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

Useful commands:

```sh
make sops-pubkey
make sops-updatekeys
make sops-secret
```

`make sops-secret` creates the Flux `sops-age` secret in `flux-system` from `SOPS_AGE_KEY_FILE`.

Secrets are scoped per deployable unit. Even if two units use the same database URL, they should consume separate Secret names, for example `identity-api-db` and `identity-migrate-db`.

Database Secrets are client credentials. They are not the Postgres bootstrap
admin credentials. Migrator Secrets contain `FLYWAY_*` values for Flyway. API
and worker Secrets contain `DATABASE_URL` values with the runtime login user in
the URL.

## Contracts

APIs are Fastify services with TypeBox schemas and OpenAPI docs. Public API
resources are resource-first under `api.tma.com/v1`, while generated docs are
domain-scoped under `/v1/<domain>/docs`.

Route work should preserve:

- Explicit request schemas.
- Explicit success response schemas.
- Explicit domain error responses.
- Stable OpenAPI operation descriptions that are useful to generated clients and LLM tools.

Events are not implicit. If a domain emits or consumes an event, document the subject, payload schema, consumers, and delivery expectation.

Database ownership is exclusive to the owning domain. Migration packages live in `domains/<domain>/packages/database`.

Tenant/workspace-scoped domains should authorize from local projections of tenancy authority. If a domain owns tenant/workspace-scoped resources or performs tenant-scoped authorization on hot request paths, it must consume tenancy events into local projection tables such as `tenant_projection`, `tenant_membership_projection`, and `workspace_projection`. Do not read the tenancy database. Do not call tenancy synchronously for hot-path authorization.

## How To Work Here

When changing manifests:

- Render the exact overlay you changed with `kubectl kustomize` or `kustomize build --enable-alpha-plugins --enable-exec` when KSOPS generators are involved.
- Check local and live parity if the change affects deployable unit structure.
- Keep generated Secrets and ConfigMaps in the intended namespace.
- Do not make platform assumptions from domain manifests unless the platform unit is composed in that environment.

When changing a domain API:

- Keep route handlers thin.
- Put business decisions in `packages/api/src/services/*`.
- Put shared process concerns in `packages/api/src/platform/*`.
- Keep TypeBox/OpenAPI schemas in sync with actual responses.
- Treat request validation errors and domain errors as part of the API contract.

When adding a new domain:

- Create `domains/<domain>` using `identity`, `tenancy`, and `features` as examples.
- Copy the unit spine you need: `identity` is the example for auth API and
  Remix UI, `tenancy` is the example for tenant authority, and `features` is
  the example for feature authority. `documents` is the example for a product
  API using local tenancy and features projections for ABAC.
- Replace copied domain behavior; keep the deployment-unit shape and wiring patterns.
- Add `domains/<domain>/README.md`.
- Add Skaffold modules for local units.
- Add Flux Kustomizations for live units.
- Add image automation only for images Flux should update.
- Add network policies for only the traffic the unit actually needs.
- Tenant/workspace-scoped domains must authorize from local tenancy
  projections, not by reading the tenancy database or calling tenancy
  synchronously on hot paths.

## Checks

Prefer domain-owned checks:

```sh
make -C domains/identity pre-deploy-infra
make -C domains/tenancy pre-deploy-infra
make -C domains/features pre-deploy-infra
make -C domains/documents pre-deploy-infra
git diff --check
```

Use narrower checks when changing a narrow part of the repo. Dev overlays with
encrypted Secrets must render with KSOPS:

```sh
kustomize build --enable-alpha-plugins --enable-exec <overlay>
```

Use the full spine checks when changing shared structure, deployment ordering,
namespaces, Gateway routing, secrets, or image automation.
