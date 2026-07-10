# Aperitif Kubernetes

Treat this `k8s/` directory as the repo root. GitHub workflows live under
`k8s/.github`.

## Shape

```text
.github/workflows/      integration and deployment workflows
clusters/               Flux cluster graphs
platform/               ingress, event-bus, observability, inactive mesh
domains/                identity, accounts, entitlements, documents
Makefile                local orchestration
skaffold.yaml           local dev graph
.sops.yaml              encrypted Secret recipients
AGENTS.md               non-obvious agent rules
```

Domain unit shape:

```text
postgres -> migrate -> api/worker/ui
```

Units stay independently deployable. A domain only has the units it needs.
Database SQL lives in `packages/database/sql`; `infra/migrate` is the Flyway
job that runs it.

## Domains

- `identity`: users, passkeys, sessions, refresh tokens, operators, JWKS.
- `accounts`: account resource boundary and initial owner membership.
- `entitlements`: account entitlement grants and effective snapshots.
- `documents`: product proof using account and entitlement projections.

Domains own their databases. Cross-domain reads use APIs or declared events,
never another domain's database.

## Platform

- `ingress`: Traefik CRDs, Traefik, local TLS, routes.
- `event-bus`: NATS JetStream.
- `observability`: OpenTelemetry Collector.
- `mesh`: Linkerd manifests, not currently composed.

Authority/state event path:

```text
domain DB transaction -> outbox_events -> worker -> NATS JetStream
```

Postgres notifications only wake workers. The outbox is the durable source.
Outbox tables use `id`, `event`, `created_at`, `published_at`, and an insert
trigger that notifies `outbox_events`.

## Local

```sh
brew bundle
make deploy-core
make dev
```

Useful deploy targets:

```sh
make deploy-platform
make deploy-identity
make deploy-accounts
make deploy-entitlements
make deploy-documents
make deploy-all
```

Default local domain is `tma.com`; override with `DOMAIN=example.test`.

## Flux

Prod starts at `clusters/prod-eu/kustomization.yaml`:

```text
kustomization.yaml -> platform/* + domains/*
```

Domain order:

```text
<domain>-postgres -> <domain>-migrate -> <domain>-api/worker/ui
```

GitHub deployment workflows build images, push them, update prod-eu image
digests, and commit the manifest changes. Flux image automation is not used.

Bootstrap prod with:

```sh
make flux-bootstrap-prod-eu
```

See `clusters/prod-eu/README.md`.

## Secrets

SOPS uses age recipients from `.sops.yaml`.

```sh
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

Keep encrypted Secret manifests encrypted. Do not commit local TLS material.

## Contracts

- HTTP APIs use Fastify + TypeBox and expose OpenAPI docs.
- Event contracts live in the producing domain's `packages/contracts`.
- Events use the CloudEvents JSON shape.
- Cross-domain events are current-state facts, not replay deltas.
- Event `type` is versioned, for example `accounts.account.opened.v1`.
- `data.version` is producer state version for stale/out-of-order protection.

Current event catalog:

| Type | Producer | Consumers |
| --- | --- | --- |
| `accounts.account.opened.v1` | `accounts` | `entitlements`, `documents` |
| `entitlements.account_entitlements.updated.v1` | `entitlements` | `documents` |

## Checks

Use the narrowest check that covers the change:

```sh
make -C domains/identity check
make -C domains/accounts check
make -C domains/entitlements check
make -C domains/documents check
git diff --check
```

Render changed KSOPS overlays with:

```sh
kustomize build --enable-alpha-plugins --enable-exec <overlay>
```
