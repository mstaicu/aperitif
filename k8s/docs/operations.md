# Operations

## Local cluster

Install local tools with `brew bundle`. Deploy only the shared capability a
domain needs:

```sh
make -C platform/cluster/ingress deploy
make -C platform/cluster/event-bus deploy
make -C platform/cluster/observability deploy
```

Then use the domain interface:

```sh
make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
make -C domains/<domain> dev
```

`ingress deploy` changes the local workstation and selected cluster: it installs
mkcert, local host entries, and temporary TLS. Do not run it against production.

## Production EU

Flux reconciles `master` from `k8s/clusters/prod-eu`. After bootstrap, Git is
the normal way to change the cluster.

```sh
export GITHUB_TOKEN=<github-token>
export SOPS_AGE_KEY_FILE=/path/to/production-age-key
make -C clusters/prod-eu bootstrap
```

Before bootstrap, select the production context, provide the production Age key,
and make every referenced image pullable. Bootstrap creates Flux, its SOPS key,
a deploy key, and the root reconciliation; commit the generated `flux-system/`
directory when instructed.

```text
merge to master
  -> build, scan, and promote changed first-party images
  -> Flux observes the promoted digest
  -> Flux writes the digest into the production domain overlay
  -> Flux reconciles the affected workload
```

Infrastructure-only changes reconcile directly from Git. Flux does not make a
multi-workload release atomic; use expand/contract for schema and application
changes. Its usual inspection commands are:

```sh
flux get kustomizations --all-namespaces
flux get images repository --all-namespaces
flux get images policy --all-namespaces
flux get images update --all-namespaces
flux reconcile source git flux-system
flux reconcile kustomization <name> --with-source
```

`clusters/prod-eu` contains the root inventory, shared cluster graph,
domain reconciliation graphs, and image policies. A domain owns its workload
overlays; the platform owns only cluster-wide capabilities.

## Shared capabilities

### NATS JetStream

NATS runs three servers. Domains own contracts, outbox rows, streams, consumers,
and projections. Relay connects to
`nats-client.nats.svc.cluster.local:4222`; port `6222` is server clustering only.

Each state stream retains one message per resource subject. The current cluster
has three 1 GiB NATS PVCs, an approximately 819 MiB JetStream file budget per
pod, and two 400 MiB replicated state streams. This is an initial allocation,
not a product sizing model.

Before production sizing, set each stream's `max_bytes` from retained-resource
count, measured representation size, concurrent feed versions, and headroom.
Size NATS PVCs and `max_file_store` from the replicated stream total. When a
stream is full, NATS rejects publication and Relay keeps the outbox row for
retry.

For diagnosis, work inward:

```text
Kubernetes -> NATS -> stream -> consumer -> Relay/projector -> local table
```

```sh
kubectl get statefulset,pod,pvc,service -n nats
kubectl logs -n nats -l app=nats --prefix --since=10m
kubectl port-forward -n nats service/nats-client 4222:4222
NATS_URL=nats://127.0.0.1:4222 nats --no-context stream info ACCOUNTS
NATS_URL=nats://127.0.0.1:4222 nats --no-context consumer report --leaders ACCOUNTS
```

An unpublished outbox row points to Relay or NATS. A growing consumer backlog
points to its projector. Do not purge streams, consumers, PVCs, or the `nats`
namespace while diagnosing.

### Relay

Outbox Relay is shared polling code, not a domain capability. A domain owns its
Relay Deployment, `outbox_events`, NATS stream definitions, and database/NATS
access. Relay locks a queued row, reads its subject's last JetStream sequence,
checks the database session, and publishes with that sequence as an expectation.
It deletes only after PubAck. Failures roll back and exit; the Deployment restarts
Relay to read the current outbox again. Retries can duplicate publications, so
projectors must be idempotent. The sequence guard does not impose business
revision order on append-only facts or deltas.

Its required outbox columns are `id`, `subject`, `event`, optional
`traceparent` and `tracestate`, and `queued_at`; index `(queued_at, id)`.

### Ingress and telemetry

Traefik owns its controller, CRDs, and TLS entry points. Domains own
`IngressRoute`s. Production uses Cloudflare DNS-01; redundant ingress and
direct-origin restriction remain roadmap work.

Applications send OTLP to `otel-collector.otel.svc.cluster.local`. The Collector
receives application telemetry and Kubernetes workload state; the node agent
collects container logs and kubelet metrics. Current overlays use one
non-HA OpenObserve instance. Telemetry durability and high availability are not
implemented promises.

## State-feed recovery — documented, not implemented

If a state stream is lost, its source must eventually rebuild it from its own
authoritative database:

1. Recreate the source domain's stream from `streams.json`.
2. Run a manually invoked one-shot Job using that domain's API image.
3. The Job writes one current representation per resource to the normal outbox,
   preserving `data.revision` and using a fresh CloudEvent ID and timestamp.
4. Relay publishes normally; reset dependent projectors so they bootstrap again.

No reseed Job exists yet. It is not a normal deployment step and does not connect
to NATS.

## Validate manifests

```sh
make -C platform/cluster/event-bus check
make -C platform/cluster/ingress check
make -C platform/cluster/observability check
kubectl kustomize clusters/prod-eu >/dev/null
```
