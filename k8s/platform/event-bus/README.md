# Event-Bus Platform

Event-bus owns NATS JetStream infrastructure. Domains own streams, consumers,
event schemas, outbox tables, and workers.

## Unit

```text
event-bus
```

Manifests live under:

```text
platform/event-bus/overlays/{ephemeral,prod-eu}
```

## Operations

```sh
make deploy-event-bus
```

Flux prod-eu entry:

```text
clusters/prod-eu/platform/event-bus.yaml
```

## Event Rule

Authority/state events use:

```text
domain DB transaction -> outbox_events -> domain worker -> JetStream
```

Request handlers do not directly publish critical authority events.

## Checks

```sh
kubectl kustomize platform/event-bus/overlays/ephemeral
kubectl kustomize platform/event-bus/overlays/prod-eu
```
