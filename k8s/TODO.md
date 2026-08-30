# TODO

Only unresolved, product-agnostic platform work belongs here.

## Before the first production product

### Recover authoritative state

- Replace in-cluster PostgreSQL with managed databases. Back up and restore
  each domain database successfully.
- Implement and rehearse controlled current-resource feed recovery for every
  state-producing domain. A manually invoked Job, using that domain's existing
  API image, reads its authoritative database and writes one current
  representation per resource—with its existing revision and a fresh CloudEvent
  ID—to the normal outbox. Outbox Relay republishes it after a state-stream loss; this
  is not a scheduled workload or normal deployment step. See the
  [production recovery contract](clusters/prod-eu/README.md#recover-a-current-resource-state-stream).
- Rehearse PostgreSQL restoration, JetStream restoration, projection replay,
  and a complete disposable-environment reset.

### Set resource and retention budgets

- Before the first production product, derive and set every stream's
  `max_bytes` from measured representation size, peak retained resource count,
  concurrently retained schema versions, and a safety factor. Size NATS PVCs
  and `max_file_store` from the sum of those stream budgets; then load-test
  rejection, outbox backlog, and alerts.
- Measure workloads, then set replicas, resources, disruption budgets, and
  topology placement.
- Give the telemetry backend suitable storage, recovery, retention, and
  alerts.
- Alert on the oldest unpublished outbox row and JetStream consumer lag.

### Harden the edge and delivery path

- Choose a certificate flow that supports redundant production ingress.
- Harden ingress with redundant replicas, direct-origin restriction, and
  explicit forwarded-header trust.
- Rehearse the complete merge-to-production and Flux recovery flows.
- Require `pre-merge / check` through branch protection.

## Add only when a requirement exists

- NATS authentication, TLS, and subject ACLs when workloads become untrusted.
- OTLP authentication, Collector HA, and persistent queues when telemetry loss
  is unacceptable.
- JWT issuer, audience, token-type, and product claims when trust zones split.
- Release signing and admission verification when policy requires them.

## Repository move

Workflow and Flux paths currently include `k8s/`. Change them together when
this directory becomes the repository root.
