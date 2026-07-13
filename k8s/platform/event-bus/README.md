# Event Bus

NATS JetStream infrastructure.

Domains own streams, consumers, event contracts, outbox tables, and workers.

## Capacity model

NATS pods are storage nodes. A stream replica is a full copy, not a shard:

```text
physical stream storage = max_bytes * stream replicas
```

The current three-node cluster gives each NATS pod its own 1 GiB PVC and lets
JetStream use 80%:

```text
1,024 MiB * 0.80 = 819.2 MiB available per NATS pod

Accounts       400 MiB * R3 = one 400 MiB copy on each pod
Entitlements   400 MiB * R3 = one 400 MiB copy on each pod
                              ----------------------------
                              800 MiB used per pod
```

This fits below 819.2 MiB, reserves 20% of each PVC for storage overhead, and
uses R3 so one NATS server can fail without losing stream quorum. Because the
streams use `DiscardPolicy.New`, reaching `max_bytes` rejects new events.

### Adding or resizing a product stream

1. Measure the stream's daily growth from its `state.bytes` change.
2. Choose the required replay window and calculate:

   ```text
   max_bytes = daily growth * retention days * safety margin
   ```

3. Set the product-owned `NATS_STREAM_MAX_BYTES` and
   `NATS_STREAM_REPLICAS` in
   `domains/<domain>/components/worker/infra/overlays/<environment>/*-worker-depl.yaml`.
4. For the current three-server/R3 design, add every stream's `max_bytes`.
   That total must remain below 80% of one NATS PVC.
5. If it does not fit, calculate `required PVC = total max_bytes / 0.80`, then
   increase the PVC in `platform/event-bus/overlays/<environment>/nats-depl.yaml`
   and set `max_file_store` to 80% of it in the adjacent `nats.conf`.

The NATS server count lives in `platform/event-bus/base/nats-depl.yaml`.
Changing an existing stream or PVC requires an explicit update/resize; changing
the initial manifests alone only configures newly created resources.

## Operations

```sh
make -C platform/event-bus deploy
```

For the mental model, health checks, NATS CLI queries, and step-by-step
troubleshooting, see [DEBUG.md](DEBUG.md).

## Rule

Critical authority events use:

```text
domain DB transaction -> outbox_events -> domain worker -> JetStream
```

Request handlers do not directly publish those events.

## Checks

```sh
kubectl kustomize platform/event-bus/overlays/ephemeral
kubectl kustomize platform/event-bus/overlays/prod-eu
```
