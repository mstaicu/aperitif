# Foundation roadmap

Only work needed by multiple products or required to operate the foundation
belongs here.

## Before sustained production

- Bind every domain to a managed database and rehearse backup and restore.
- Implement and rehearse state-feed reseed for every current-state producer.
- Rehearse database restore, JetStream loss, projection rebuild and complete
  disposable-environment reset.
- Measure workloads, then set production requests, memory limits, replicas and
  topology placement.
- Size NATS streams and PVCs from retained resource count and measured message
  size.
- Alert on old outbox rows, consumer lag and failed Flux reconciliation.
- Give telemetry deliberate retention, recovery and availability.
- Restrict direct origin access and define forwarded-header trust.
- Rehearse merge-to-production and Flux recovery.
- Protect `master` with the required pull-request checks.

## Add when required

- Enterprise federation, account invitations, machine identities and personal
  access tokens.
- Billing, product roles, audit and notifications as independently owned domains.
- NATS authentication, TLS and subject permissions when workloads become
  mutually untrusted.
- OTLP authentication, Collector high availability and persistent queues when
  telemetry loss becomes unacceptable.
- Stronger JWT claims when products introduce separate issuers or trust zones.
- Release signing and admission verification when policy requires them.
