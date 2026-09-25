# Operations

## Local and disposable clusters

Install the pinned tools with `brew bundle`. Apply only the shared capabilities
needed by the scenario:

```sh
kubectl apply -k platform/cluster/ingress/overlays/local
kubectl apply -k platform/cluster/event-bus/overlays/local
kubectl apply -k platform/cluster/observability/overlays/local
```

| Capability | Needed for |
| --- | --- |
| Ingress | Browser and HTTP testing through `http://localhost` |
| Event bus | Outbox relays, state feeds and projections |
| Observability | Local traces, logs and cluster telemetry |

Use the domain interface:

```sh
make -C domains/<domain> check
make -C domains/<domain> up
make -C domains/<domain> dev
make -C domains/<domain> down
```

`up` deploys PostgreSQL, runs the migration Job, waits for it, and then deploys
runtime workloads. `dev` performs the same preparation before starting the
Skaffold development loop. `down` removes resources in that domain's Skaffold
graph. A completed migration Job is not rerun automatically; delete it explicitly
before rerunning migrations against a disposable database.

Start real domain dependencies explicitly. Auth must precede APIs that validate
its JWTs. Accounts and the event bus must precede Plans when testing its Account
initializer.

Local traffic uses `http://localhost` on port 80. A cluster with LoadBalancer
support exposes it directly. With Kind or another cluster without that support:

```sh
kubectl port-forward --namespace=traefik service/traefik-public 80:80
```

The Traefik dashboard is available at `http://localhost/dashboard/`.

## E2E composition

An E2E overlay would duplicate environment configuration and eventually drift.
The `local` overlay already describes how each component runs in a disposable
cluster. E2E composition only selects and orders existing units:

```text
cluster
  + required platform capabilities
  + provider domains or boundary fixtures
  + target domain
  + test process
```

For a domain-isolated suite, deploy the target and required platform capabilities,
then seed upstream state at the domain boundary. For example, a Plans suite may
publish a valid Accounts snapshot rather than deploy Accounts.

For an integration suite, deploy the real providers:

```sh
kubectl apply -k platform/cluster/ingress/overlays/local
kubectl apply -k platform/cluster/event-bus/overlays/local
make -C domains/auth up
make -C domains/accounts up
make -C domains/plans up
```

Both forms use the same component and domain manifests. The only new artifact is
the explicit scenario runner that performs these commands and cleanup. Add it
with the first real cross-domain suite rather than inventing a generic environment
language now.

Auth browser E2E expects Traefik at `http://localhost` by default. Set
`PLAYWRIGHT_BASE_URL` to run the same suite against an already deployed
environment.

## Production GitOps

Flux reconciles `master` from `clusters/prod-eu`. Git is the normal production
interface after bootstrap:

```text
merge to master
  -> build and scan each changed first-party image
  -> promote its immutable digest behind latest
  -> Flux observes the new digest
  -> Flux writes it into clusters/prod-eu/domains/<domain>/<component>.yaml
  -> Flux reconciles the component's production overlay
```

Bootstrap against the selected production cluster:

```sh
export GITHUB_TOKEN=<github-token>
export SOPS_AGE_KEY_FILE=/path/to/production-age-key
make -C clusters/prod-eu bootstrap
```

The GitHub token is used to install a read/write deploy key. The Age identity is
stored in `flux-system` for SOPS decryption. Do not commit either credential.

Inspect reconciliation with:

```sh
flux get kustomizations --all-namespaces
flux get images repository --all-namespaces
flux get images policy --all-namespaces
flux get images update --all-namespaces
flux reconcile source git flux-system
flux reconcile kustomization <name> --with-source
```

Flux does not make a multi-image release atomic. Use backward-compatible,
expand/contract database and event changes.

## Event bus and Relay

NATS runs three servers in production. Domains own streams, contracts, outbox
rows, consumers and projections. Relay is shared executable code deployed and
configured by each publishing domain.

Relay reads the next locked outbox row, validates transport headers, publishes
with the subject's expected JetStream sequence, and deletes only after PubAck.
Failures roll back and exit so Kubernetes restarts it. Retries may duplicate
delivery; consumers must remain idempotent.

The domain-owned table is:

| Column | Meaning |
| --- | --- |
| `id` | Stable message and JetStream deduplication ID |
| `subject` | NATS subject captured by an owned stream |
| `payload` | Complete JSON message |
| `headers` | String-valued transport headers |
| `queued_at` | Retry and scan ordering |

Producers inject trace context into headers. Relay rejects malformed values and
producer-supplied `Nats-*` publication controls. A failed row remains queued.

Diagnose from infrastructure toward business state:

```sh
kubectl get statefulset,pod,pvc,service -n nats
kubectl logs -n nats -l app=nats --prefix --since=10m
kubectl port-forward -n nats service/nats-client 4222:4222
NATS_URL=nats://127.0.0.1:4222 nats --no-context stream info ACCOUNTS
NATS_URL=nats://127.0.0.1:4222 nats --no-context consumer report --leaders ACCOUNTS
```

An old unpublished row points to its producer, Relay or NATS. Consumer backlog
points to the projector.

## State-feed recovery

JetStream is a recoverable distribution layer. The producer database remains
authoritative. Each state producer must eventually provide an on-demand reseed
command with these properties:

1. Read authoritative resources in bounded batches.
2. Lock each source resource using the same lock used by normal mutations.
3. Build the current contract version from the locked row.
4. Preserve the resource's existing `data.version`.
5. Generate a new CloudEvent ID and timestamp.
6. Insert through the normal outbox path in the same transaction.
7. Never publish directly to NATS.
8. Be safe to stop and restart.

Using the normal source lock matters: a concurrent mutation must either happen
before the reseed reads the resource or afterward and replace the older pending
snapshot. The reseed must never overwrite a newer pending version.

Recovery is then explicit:

```text
recreate stream from the domain's streams.json
  -> run the producer's one-shot reseed Job
  -> Relay republishes current snapshots
  -> recreate or restart lost projections
  -> verify stream subjects, outbox age and consumer lag
```

The Job needs database access but no NATS access. It is invoked during recovery,
not continuously reconciled by Flux. No reseed command exists yet.

## Ingress and observability

Traefik owns ingress and TLS entrypoints. Domains own standard Kubernetes Ingress
resources. Local routes are hostless; production routes use `puuury.com` and
Cloudflare DNS-01.

Applications send OTLP to `otel-collector.otel`. The node agent collects
container logs and Kubernetes metrics. OpenObserve is intentionally non-HA until
telemetry durability becomes a product requirement. Access it locally with:

```sh
kubectl port-forward --namespace=otel service/openobserve 5080:5080
```

The operations dashboard under `platform/cluster/observability` is imported
manually and is not reconciled.

## Validation

```sh
make -C domains/accounts check
make -C domains/auth check
make -C domains/plans check
make -C platform/runtime check
make -C clusters/prod-eu check
```

Domain checks run package tests, render production overlays and render the full
local Skaffold graph. The cluster check recursively builds the Flux inventory.
