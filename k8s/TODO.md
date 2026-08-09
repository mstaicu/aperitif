# TODO

## Before production data

- Replace in-cluster PostgreSQL with managed databases and test backup and
  restoration.
- Choose a certificate flow that supports redundant production ingress.
- Measure workloads, then set replicas, resources, disruption budgets, and
  topology placement.
- Give the telemetry backend suitable storage, recovery, retention, and alerts.
- Rehearse cluster recovery and the complete merge-to-production flow.
- Require `pre-merge / check` through branch protection.

## Add when required

- NATS authentication, TLS, and subject ACLs when workloads become untrusted.
- OTLP authentication, Collector HA, and persistent queues when telemetry loss
  is unacceptable.
- JWT issuer, audience, token-type, and product claims when trust zones split.
- Outbox leases, retries, quarantine, or inboxes when measured failures require
  them.
- Release signing and admission verification when policy requires them.

## Product work

- Add authenticated passkey enrollment, recovery, and abuse controls.
- Add outbox-age and consumer-lag measurements when event delivery becomes an
  operational concern.
- Automate contract compatibility checks when releases become frequent.

## Repository move

Workflow and Flux paths currently include `k8s/`. Change them together when
this directory becomes the repository root.
