# Aperitif Kubernetes

Treat this `k8s/` directory as the repo root. GitHub workflows intentionally
live under `k8s/.github`.

This repo owns Kubernetes manifests, local deploy loops, Flux reconciliation, and
domain delivery wiring.

## Shape

```text
.github/workflows/      integration and deployment workflows
clusters/prod-eu/       Flux prod-eu graph
clusters/staging-eu/    Flux bootstrap notes
platform/               ingress, event-bus, observability, inactive mesh
domains/                identity, accounts, capabilities, documents
Makefile                local orchestration
skaffold.yaml           local module graph
.sops.yaml              encrypted Secret rules
AGENTS.md               non-obvious agent rules
```

```text
postgres -> migrate -> api/worker/ui
```

Domain units stay separate. `ui` and `worker` exist only when the domain owns
that capability.

## Domains

- `identity`: passkeys, sessions, access tokens, JWKS.
- `accounts`: accounts, memberships, roles, permissions.
- `capabilities`: capability definitions, account grants, effective capability events.
- `documents`: product-domain proof using local accounts/capability projections.

Domains own their databases. Other domains use APIs or declared events.

## Status

- Core: `identity`, `accounts`, `capabilities`, outbox/projection spine.
- Product proof: `documents`.
- Platform: `ingress`, `event-bus`, `observability`.
- Inactive: `mesh`.

## Platform

- `ingress`: Traefik CRDs, Traefik, local TLS, public/internal routes.
- `event-bus`: NATS JetStream for durable domain events.
- `observability`: OpenTelemetry Collector, composed in the active spine.
- `mesh`: Linkerd manifests exist but are not currently composed.

Domain HTTP units own their own Traefik `IngressRoute`s. Authority/state events use:

```text
domain DB transaction -> outbox_events -> worker -> NATS JetStream
```

Postgres notifications only wake workers; the outbox is the durable source.

## Local

```sh
brew bundle
make deploy-core
make dev
```

```sh
make dev-all
make deploy-all
```

```sh
make deploy-platform
make deploy-identity
make deploy-accounts
make deploy-capabilities
make deploy-documents
```

`deploy-*` targets deploy only the named platform/domain boundary.
`integration-*`, `deploy-core`, `deploy-all`, and `dev-all` compose dependency
chains explicitly.

Default local domain is `tma.com`; override with `DOMAIN=example.test`.

## Live

Flux starts at `clusters/prod-eu/kustomization.yaml`:

```text
platform.yaml -> domains.yaml
```

Domain Flux order remains:

```text
<domain>-postgres -> <domain>-migrate -> <domain>-api/worker/ui
```

Migration Kustomizations use `force: true` so completed Jobs can rerun on image
digest changes.

Deployment workflows build images, push them, update prod-eu overlay tags/digests,
and commit the manifest changes. Flux reconciles Git; Flux image automation is
not installed.

Bootstrap docs:

- `clusters/prod-eu/README.md`
- `clusters/staging-eu/README.md`

Prod first-time bootstrap entrypoint: `make flux-bootstrap-prod-eu`.

## Secrets

SOPS uses age recipients from `.sops.yaml`. The private key is never committed.

```sh
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

Secrets are scoped per deployable unit even when values match. Migrator Secrets
contain `FLYWAY_*`; API/worker Secrets contain `DATABASE_URL`.

## Contracts

- HTTP APIs are Fastify + TypeBox and expose OpenAPI docs.
- Event contracts must name subject, schema version, payload, producer, and consumers.
- Cross-domain events are current-state facts, not replay deltas.
- Consumers apply newer `version` values and ack stale messages.
- Account-scoped hot-path authorization uses local projections, not synchronous
  calls to authority domains.

Event catalog:

| Subject | Producer | Consumers | Meaning |
| --- | --- | --- | --- |
| `accounts.account_member.updated` | `accounts` | `capabilities`, `documents` | Account existence, member state, role, and permissions snapshot. |
| `capabilities.account_capabilities.updated` | `capabilities` | `documents` | Account capability snapshot. |

## Agent Notes

- Prefer Make targets for local/integration deploy checks.
- Do not collapse domain units into one Kubernetes app abstraction.
- Do not replace encrypted Secret manifests with plaintext.
- Do not reintroduce mesh/observability assumptions unless those units are composed.
- If a README explains obvious code, delete that prose and keep the rule close
  to the code, test, Make target, or manifest.

## Checks

Use the narrowest check that covers the change:

```sh
make -C domains/identity pre-deploy-infra
make -C domains/accounts pre-deploy-infra
make -C domains/capabilities pre-deploy-infra
make -C domains/documents pre-deploy-infra
git diff --check
```

Render overlays changed by the patch. KSOPS overlays require:

```sh
kustomize build --enable-alpha-plugins --enable-exec <overlay>
```
