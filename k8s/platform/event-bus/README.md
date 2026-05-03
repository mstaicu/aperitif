# Event-Bus Platform

Event-bus owns NATS JetStream infrastructure. Domains own their event contracts, outbox tables, streams, consumers, and workers.

## Unit

```text
event-bus
```

The active implementation is NATS JetStream under:

```text
platform/event-bus/overlays/{dev,live}
```

## Local

Deploy through Make:

```sh
make event-bus
```

The target deploys the Skaffold `event-bus` module and waits for the `nats-depl` StatefulSet.

## Live

Live event-bus is reconciled by Flux from:

```text
clusters/prod-eu/platform/event-bus.yaml
```

The Kustomization points at:

```text
platform/event-bus/overlays/live
```

## Domain Events

Authority/state events should use a transactional outbox in the owning domain:

```text
domain DB transaction -> outbox_events -> domain worker -> JetStream
```

Do not publish critical domain events directly from request handlers. Direct publish is acceptable only for best-effort notifications where losing the event does not corrupt projections or authorization state.

Current copyable event worker spine:

```text
domains/accounts/worker
```

## Network Policy

Only domains that emit or consume events should receive egress to NATS. Do not add event-bus access to domains by default.

## Checks

```sh
kubectl kustomize platform/event-bus/overlays/dev
kubectl kustomize platform/event-bus/overlays/live
```
