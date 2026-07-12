# Aperitif Kubernetes

Treat this `k8s/` directory as the repo root. GitHub workflows live under
`k8s/.github`.

## Shape

```text
.github/workflows/      integration and deployment workflows
clusters/               Flux cluster graphs
platform/               ingress, event-bus, observability, inactive mesh
domains/                identity, accounts, entitlements, documents
platform/*/Makefile     unit-owned local platform lifecycle
domains/*/Makefile      unit-owned domain lifecycle
clusters/prod-eu/Makefile  Flux bootstrap
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
- `documents`: local-only product proof using account and entitlement
  projections; it is not released by Actions or composed into prod-eu.

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
```

Start only the shared platform units needed for the current work:

```sh
make -C platform/ingress deploy
make -C platform/event-bus deploy
```

Then start each domain being edited in its own terminal. A domain's `dev`
target manages only that domain:

```sh
make -C domains/identity dev
make -C domains/accounts dev
make -C domains/entitlements dev
```

Each domain also exposes its lifecycle operations directly:

```sh
make -C domains/identity check
make -C domains/identity migrate
make -C domains/identity deploy
make -C domains/identity dev
make -C domains/accounts check
make -C domains/accounts migrate
make -C domains/accounts deploy
make -C domains/accounts dev
make -C domains/entitlements check
make -C domains/entitlements migrate
make -C domains/entitlements deploy
make -C domains/entitlements dev
make -C domains/documents check
make -C domains/documents migrate
make -C domains/documents deploy
make -C domains/documents dev
```

For each production domain, `migrate` ensures its disposable database is ready
and reruns its migration Job. `deploy` applies that domain once. `dev` runs
`migrate` and starts only that domain's Skaffold loop; it never deploys shared
platform units or another domain. There is deliberately no repository-wide
application composition or root development loop. Documents remains local-only
but exposes the same domain interface.

Local routing uses the fixed `tma.com` and `api.tma.com` hostnames.

## Flux

Prod starts at `clusters/prod-eu/kustomization.yaml`:

```text
kustomization.yaml -> platform/* + domains/*
```

Domain order:

```text
<domain>-postgres -> <domain>-migrate -> <domain>-api/worker/ui
```

GitHub production workflows build images, push them, update prod-eu image
digests, and commit the manifest changes. Flux image automation is not used.

## Releases

Each production unit has one small path-filtered `cd-<domain>-<unit>.yaml`
caller under `.github/workflows`. The shared `cd-unit.yaml` workflow:

1. builds the exact Git SHA that triggered that unit;
2. publishes the image to GitHub Container Registry with the workflow's
   `GITHUB_TOKEN` and captures its immutable digest;
3. lets GitHub queue releases of the same unit;
4. queues up to 100 short Git promotion jobs across units;
5. updates only that unit's prod-eu Kustomization; and
6. commits the digest for Flux to reconcile.

Builds for different units are independent. The shared queue serializes only
Git desired-state writes, so teams can release their own APIs, workers,
migrations, and UIs without overwriting another unit's manifest update. Actions
does not deploy to Kubernetes; Flux is the only cluster writer.

A Git conflict, failed build, timeout, or full promotion queue fails visibly and
requires a rerun. The workflow never force-pushes or claims an unbounded queue.

Pull requests use one path-filtered `ci-<domain>.yaml` workflow per production
domain. A changed domain calls the shared `ci-domain.yaml` workflow, which runs
that domain's `check` and provisions a disposable Kind cluster for CI. Documents
remains outside this production workflow set.

New GitHub Container Registry packages are private by default. After each image
is published for the first time, make its package public in GitHub so Kubernetes
can pull it anonymously. Keeping packages private instead requires GHCR pull
credentials in every production domain namespace.

Each production unit also exposes GitHub's manual `workflow_dispatch` trigger.
Use it once after this registry migration to publish the initial GHCR image;
normal releases thereafter are triggered only by that unit's source paths.

Releases rely on expand/contract compatibility. For a schema change required by
new code, use separate releases:

```text
merge expansion migration
  -> wait for its workflow and Flux migration Kustomization to succeed
  -> merge compatible API/worker code
  -> remove old schema only in a later contraction release
```

API, worker, UI, and event changes must tolerate old and new versions coexisting
during rollout. If a change cannot do that, its domain needs an explicitly
coordinated release rather than weakening this independent-unit contract.

Bootstrap prod with:

```sh
make -C clusters/prod-eu bootstrap
```

See `clusters/prod-eu/README.md`.

## Secrets

SOPS uses age recipients from `.sops.yaml`.

```sh
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

Keep encrypted Secret manifests encrypted. Do not commit local TLS material.

GitHub CI workflows require the repository secret
`EPHEMERAL_SOPS_AGE_KEY`. It must contain only the age identity for disposable
integration overlays, never a production age identity.

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
