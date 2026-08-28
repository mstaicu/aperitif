# TODO

Only unresolved, product-agnostic platform work belongs here.

## Before production

- Replace in-cluster PostgreSQL with managed databases and test backup and
  restoration.
- Establish Relay's production delivery boundary. It is deployed locally by
  Accounts and Plans, but CI, image automation, and Flux do not yet publish or
  reconcile it in production.
- Verify the 400 MiB current-resource stream limits against measured retained
  resource count and representation size before production.
- Choose a certificate flow that supports redundant production ingress.
- Harden ingress with redundant replicas, direct-origin restriction, and
  explicit forwarded-header trust.
- Measure workloads, then set replicas, resources, disruption budgets, and
  topology placement.
- Give the telemetry backend suitable storage, recovery, retention, and alerts.
- Alert on the oldest unpublished outbox row and JetStream consumer lag.
- Document and rehearse PostgreSQL restoration, JetStream restoration,
  projection replay, and a complete disposable-environment reset.
- Rehearse the complete merge-to-production and Flux recovery flows.
- Require `pre-merge / check` through branch protection.

## Add only when required

- NATS authentication, TLS, and subject ACLs when workloads become untrusted.
- OTLP authentication, Collector HA, and persistent queues when telemetry loss
  is unacceptable.
- JWT issuer, audience, token-type, and product claims when trust zones split.
- Release signing and admission verification when policy requires them.

## Repository move

Workflow and Flux paths currently include `k8s/`. Change them together when
this directory becomes the repository root.
