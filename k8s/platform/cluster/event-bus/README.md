# Event Bus

This unit runs a three-server NATS JetStream cluster. It transports durable
cross-domain messages; every domain owns its contracts, outbox table, streams,
consumers, and projections.

```sh
make -C platform/cluster/event-bus deploy
```

Applications use `nats-client.nats.svc.cluster.local:4222`. The headless service
and port `6222` exist only for NATS server clustering.

## Current storage configuration

Each NATS pod has a `1Gi` PVC. JetStream may use 80% of that volume:

```text
1,024 MiB × 0.80 = 819.2 MiB per pod
```

`ACCOUNTS` and `PLANS` each declare `400 MiB`, file storage, and three replicas.
A JetStream replica is a complete copy, not a shard, so each pod currently stores
both streams:

```text
ACCOUNTS + PLANS = 800 MiB per pod
```

That fits the current configured ceiling but is only an initial allocation. Before
a production product, derive every stream budget from measured representation
size, retained resource count or fact rate, concurrently retained schema versions,
and a safety factor. Then size the NATS PVC and `max_file_store` from the sum of
replicated stream budgets. See [TODO.md](../../../TODO.md#set-resource-and-retention-budgets).

```text
current-resource stream = retained resources × average representation size × safety factor
fact stream             = measured daily growth × retained days × safety factor
```

Set each stream's `max_bytes` in its owning
`workloads/outbox-relay/infra/base/streams.json`. At the limit, NATS rejects the
publication; Relay leaves the outbox row for retry. Monitor the oldest pending
outbox row and consumer lag.

## Message path and access

```text
domain database transaction -> outbox row -> Outbox Relay -> JetStream
```

Request handlers do not publish authority-changing messages directly. The NATS
NetworkPolicy explicitly allows every Relay and projection workload that connects
to the cluster. Add a new domain client there when it is introduced.

Current-resource feeds retain one complete latest representation per subject.
Facts, when a product needs occurrence history, use a separate append-only stream
with independently chosen retention.

## Validate and diagnose

```sh
kubectl kustomize platform/cluster/event-bus/overlays/ephemeral >/dev/null
kubectl kustomize platform/cluster/event-bus/overlays/prod-eu >/dev/null
```

See [DEBUG.md](DEBUG.md) for NATS, Relay, stream, consumer, and projection
failure procedures.
