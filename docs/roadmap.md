# Roadmap

Only product-agnostic work belongs here.

## Before the first production product

### Recover authoritative state

- Use managed databases and prove backup and restore for every domain.
- Implement and rehearse current-resource feed reseed for every state producer;
  see [operations](operations.md).
- Rehearse database restore, JetStream restore, projection replay, and complete
  disposable-environment reset.

### Size and operate the platform

- Derive NATS stream limits and PVC capacity from measured product state.
- Set workload replicas, resources, disruption budgets, and topology placement
  from measurements.
- Give telemetry suitable storage, recovery, retention, and alerts.
- Alert on the oldest unpublished outbox row and JetStream consumer lag.

### Harden the edge and delivery

- Choose a redundant production certificate flow.
- Restrict direct origin access and define forwarded-header trust.
- Rehearse merge-to-production and Flux recovery.
- Require `pre-merge / check` through branch protection.

## Add only when required

- NATS authentication, TLS, and subject ACLs when workloads become untrusted.
- OTLP authentication, Collector HA, and persistent queues when telemetry loss
  is unacceptable.
- JWT issuer, audience, token type, and product claims when trust zones split.
- Release signing and admission verification when policy requires them.

## Repository move

Workflow and Flux paths include `k8s/`. Change them together if this directory
becomes the repository root.
