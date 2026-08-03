# Before Production

The current repository is an early platform baseline, not a production-ready
runtime. This file is the remaining backlog; completed audit history is not
kept here.

## Required before real production data

- Replace the in-cluster PostgreSQL Deployments with managed databases. Define
  TLS, runtime and migration roles, connection budgets, backups, restore tests,
  and recovery objectives for every domain.
- Split ephemeral and production cryptographic trust. Fix `.sops.yaml` to match
  the actual `ephemeral` and `prod-eu` paths, use different age recipients, and
  give GitHub Actions only the ephemeral private key. Use separate JWT signing
  keys in each environment.
- Add a real staging cluster and prove database restore, Flux bootstrap, NATS
  recovery, and full cluster recreation before production launch.
- Replace the OpenTelemetry debug exporter with an owned durable backend. Add
  alerts for deployment failure, database recovery, NATS quorum and capacity,
  outbox age, consumer lag, and projection freshness.
- Measure workloads, then set resources and availability policy. Production
  needs justified requests, limits, disruption budgets, topology placement,
  ingress redundancy, and tested NetworkPolicies.

## Activate when the boundary appears

| Work | Trigger |
| --- | --- |
| NATS authentication, TLS, and subject ACLs | Untrusted workloads join the cluster or event provenance becomes a security boundary |
| JWT issuer, audience, type, and product scopes | More than one issuer, token kind, API trust zone, or isolated product exists |
| Outbox leases, retries, or quarantine | Measured lock contention or a recurring poison event proves the simple publisher insufficient |
| Inbox processing | A consumer performs non-idempotent durable side effects |
| Larger streams, retention, archive, or replay | A product defines volume, replay window, RPO, or RTO requirements |
| Shared platform libraries or generators | Repeated implementations become a demonstrated maintenance problem |

## Product correctness still needed

- Complete account and membership lifecycle events, including suspension and
  removal, before multi-user products depend on projections.
- Add command idempotency, bounded pagination, database constraints, and
  read-your-writes semantics where product flows require them.
- Define projection freshness and rebuild behavior before projected authority
  protects high-risk actions.
- Add WebAuthn abuse limits, key rotation, and compromised-session runbooks.
- Automate contract compatibility checks, publication provenance, and known
  consumer checks when contract releases become frequent.

## Delivery cleanup

- The pull-request workflow currently creates and deletes a Kind cluster but
  does not deploy workloads into it. Either add a real smoke deployment or
  remove the unused cluster step.
- Integrate `.github/workflows` with the containing repository while `k8s/` is
  nested, then update repository-relative paths when `k8s/` becomes the
  repository root.
- Pin downloaded tools and third-party Actions immutably, scan built images,
  produce SBOMs and provenance, sign releases, and verify them before admission.
- Add explicit Kubernetes-context protection to local mutating commands.
- Remove the inactive Linkerd manifests or replace them with a current,
  deliberately operated mesh before claiming service identity or mTLS.
