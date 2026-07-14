# Event Bus

This unit runs a three-server NATS JetStream cluster. It transports durable
cross-domain events; domains own their streams, consumers, contracts,
publishers, and projectors.

Deploy it locally with:

```sh
make -C platform/event-bus deploy
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
ENTITLEMENTS   400 MiB
               -------
               800 MiB per pod
```

That fits below the `819.2 MiB` server ceiling. The remaining 20% of each PVC
is outside JetStream's configured file-store budget.

To size another stream:

```text
stream max_bytes = measured daily growth * retained days * safety factor
required PVC      = sum of R3 stream limits / 0.80
```

Set a stream's `NATS_STREAM_MAX_BYTES` and `NATS_STREAM_REPLICAS` in its owning
outbox-publisher overlay. Then keep `max_file_store` at 80% of the PVC. Existing
streams and PVCs require an explicit update or resize; changing initial
manifests does not mutate them automatically.

Reaching a stream limit rejects new events because the streams use
`DiscardNew`. Publishers then leave their outbox rows unpublished for retry.

## Event rule

```text
domain DB transaction -> outbox row -> publisher -> JetStream
```

Request handlers do not directly publish authority events. The NATS
NetworkPolicy must list every publisher and projector allowed to connect.

Render both environments with:

```sh
kubectl kustomize platform/event-bus/overlays/ephemeral >/dev/null
kubectl kustomize platform/event-bus/overlays/prod-eu >/dev/null
```

See [DEBUG.md](DEBUG.md) when the cluster or an event path is unhealthy.
