# Event Bus

NATS JetStream infrastructure.

Domains own streams, consumers, event contracts, outbox tables, and workers.

## Operations

```sh
make deploy-event-bus
```

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
