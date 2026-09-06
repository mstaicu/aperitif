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
Relay Deployment, `outbox_messages`, NATS stream definitions, and database/NATS
access. Relay locks a queued row, reads its subject's last JetStream sequence,
checks the database session, and publishes with that sequence as an expectation.
It deletes only after PubAck. Failures roll back and exit; the Deployment restarts
Relay to read the current outbox again. Retries can duplicate publications, so
projectors must be idempotent. The sequence guard does not impose business
version order on append-only facts or deltas.

The domain migration defines `outbox_messages` with five columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `UUID PRIMARY KEY` | Stable JetStream message ID across retries. For a CloudEvent, use its `id`. |
| `subject` | Nonempty `TEXT` | NATS routing subject, captured by a configured stream. |
| `payload` | `JSONB` | Complete JSON message, including its envelope if it has one. |
| `headers` | `JSONB` object, default `{}` | String-valued transport headers, including content type and tracing context. |
| `queued_at` | `TIMESTAMPTZ`, default `now()` | Queue age and scan order; index `(queued_at, id)`. |

Producers validate their messages before insertion. Relay does not import domain
contracts or inspect payload fields. It serializes `payload` as JSON; this is
not an arbitrary-binary or exact-original-bytes transport. Snapshot producers
set `Content-Type: application/cloudevents+json`; ordinary JSON messages use
`application/json`. Set `datacontenttype: application/json` inside CloudEvents.

Producers inject OpenTelemetry context into `headers`. Relay extracts that
context, starts a publish span, and injects the outgoing context into NATS
headers. Tracing does not need to be duplicated in the JSON envelope. Header
names must be valid NATS names and values must be strings without newlines.
Producers must leave `Nats-*` publication controls to Relay; Relay does not
enforce this restriction. Header errors raised by the NATS client leave the row
queued and fail the worker; correct the source data before retrying.

The same Relay supports JSON commands and delta events when their domain supplies
the appropriate contracts, stream configuration, and consumer behavior. It does
not coalesce rows, infer business ordering, or implement Core NATS request/reply.

The pre-live V001 migrations were changed in place. Existing databases with
`outbox_events` are not upgraded automatically; recreate disposable domain
databases before running the new producers and Relay. Do not mix old and new
workloads. Existing retained snapshots using `data.revision` also need replacement
with `data.version` before starting the updated consumer; there is no automatic
state-feed reseed yet. Do not clear retained state without a recovery source.

#### Run Relay without Kubernetes

Requires Node.js 26+, an empty disposable PostgreSQL database, a NATS server with
JetStream enabled, and the `psql` and `nats` CLIs. Export `DATABASE_URL` and `NATS_URL`
to those test services in both terminals. Do not use a production database.

Create the outbox:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE outbox_messages (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL CHECK (subject <> ''),
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(headers) = 'object'),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX outbox_messages_queued_at_id ON outbox_messages (queued_at, id);
SQL
```

Save this as `streams.json` and export `NATS_STREAMS_PATH` with its absolute path. This
small demonstration stream retains one JSON representation per resource subject;
its 1 MiB limit is not a production sizing recommendation.

```json
[
  {
    "name": "RELAY_DEMO",
    "subjects": ["relay-demo.resource.*"],
    "storage": "file",
    "retention": "limits",
    "max_msgs_per_subject": 1,
    "max_age": 0,
    "max_bytes": 1048576,
    "discard": "new"
  }
]
```

From the `k8s` root, start Relay:

```sh
npm ci --prefix platform/runtime/outbox-relay
node platform/runtime/outbox-relay/src/main.mjs
```

In the other terminal, check readiness and enqueue a plain JSON message:

```sh
curl --fail http://127.0.0.1:3000/readyz
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO outbox_messages (id, subject, payload, headers)
VALUES (
  gen_random_uuid(), 'relay-demo.resource.1',
  '{"name":"Example","version":1}', '{"Content-Type":"application/json"}'
);
SQL
nats --no-context stream get RELAY_DEMO --last-for=relay-demo.resource.1
psql "$DATABASE_URL" -c 'SELECT * FROM outbox_messages;'
```

Publication is asynchronous: retry the lookup if it precedes the next poll.
Expect the JSON in NATS and an empty outbox after PubAck. Use Ctrl-C to stop Relay.
Outside Kubernetes, a process supervisor must restart it after a delivery failure.
Telemetry is optional; set both `OTEL_EXPORTER_OTLP_ENDPOINT` and
`OTEL_SERVICE_NAME` to enable it.

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
   preserving `data.version` and using a fresh CloudEvent ID and timestamp.
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
