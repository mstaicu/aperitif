# Event Bus

This unit runs a three-server NATS JetStream cluster. It transports durable
cross-domain events; domains own their streams, consumers, contracts,
outbox tables, and projections.

Deploy it locally with:

```sh
make -C platform/cluster/event-bus deploy
```

Applications connect to `nats-client.nats.svc.cluster.local:4222`. The
headless service and port `6222` are only for server clustering.

## Storage model

Each NATS pod has its own `1Gi` PVC. JetStream may use 80% of each PVC:

```text
1,024 MiB * 0.80 = 819.2 MiB per pod
```

A stream replica is a complete copy, not a shard. Both current streams use R3,
so every pod stores one copy of each:

```text
ACCOUNTS       400 MiB
PLANS          400 MiB
               -------
               800 MiB per pod
```

That fits below the `819.2 MiB` server ceiling. The remaining 20% of each PVC
is outside JetStream's configured file-store budget.

To size a time-bounded fact stream:

```text
stream max_bytes = measured daily growth * retained days * safety factor
required PVC      = sum of R3 stream limits / 0.80
```

For a compacted resource-projection stream:

```text
stream max_bytes = retained resource count * average representation size * safety factor
```

Set a stream's limits in its owning `deploy/relay/base/streams.json`. Then
keep `max_file_store` at 80% of the PVC. Existing
streams and PVCs require an explicit update or resize; changing initial
manifests does not mutate them automatically.

At a stream limit, a rejected publication remains in the outbox for retry.

## Event rule

```text
domain DB transaction -> outbox row -> Relay -> JetStream
```

Request handlers do not directly publish authority events. The NATS
NetworkPolicy must list every Relay and projection component allowed to
connect.

Render both environments with:

```sh
kubectl kustomize platform/cluster/event-bus/overlays/ephemeral >/dev/null
kubectl kustomize platform/cluster/event-bus/overlays/prod-eu >/dev/null
```

See [DEBUG.md](DEBUG.md) when the cluster or an event path is unhealthy.
