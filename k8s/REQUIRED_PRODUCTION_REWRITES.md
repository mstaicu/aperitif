# Required Production Rewrites

This document is a production-readiness backlog and an instruction source for
future AI coding agents. `NOW.md` has precedence for current implementation
scope. Items marked **deferred** or **external dependency** must not be started
without an explicit owner instruction.

For every active workstream, an agent must:

1. inspect the current implementation and applicable `AGENTS.md` files;
2. preserve domain boundaries and encrypted Secret manifests;
3. implement the smallest coherent vertical slice;
4. add automated failure-path verification;
5. update operational documentation and rollback instructions;
6. report remaining risks rather than silently weakening acceptance criteria.

## Owner decisions and boundaries

| Workstream | Status | Current decision |
| --- | --- | --- |
| Containing-repository GitHub workflow placement | External dependency | The parent repository will integrate workflow discovery and paths. |
| Production PostgreSQL service | External dependency | Managed databases will replace in-cluster production PostgreSQL. |
| Environment-specific cryptographic keys | Partially planned | Development and production JWT signing key sets must be separate before production traffic; separation and rotation of other shared material remain deferred. |
| JWT semantic claims | Deferred | Signature, expiry, and string-subject verification are accepted while one issuer creates one JWT kind for one shared API trust zone. Add claims when the trust model changes. |
| Refresh-token lifecycle | Accepted current baseline | Every access-token exchange atomically rotates the session's refresh token. Each client session owns an independent token family. |
| NATS authentication and subject ACLs | Deferred | Unauthenticated NATS is accepted temporarily; workload identity remains required before treating events as a hardened authority boundary. |
| One-row locked outbox publisher | Accepted current baseline | Do not add leases, retry metadata, quarantine, or an inbox framework without a demonstrated failure mode and explicit owner approval. |
| NATS CPU/memory settings | Deferred | Measure real usage before setting requests or limits. |
| Durable production telemetry export | Deferred while testing | Activate when a production observability backend and operational ownership exist. |
| Independent component delivery | Accepted current baseline | Keep directory-discovered PR checks, component-owned image names, matrix builds, SHA and production tags, Flux image-policy digest updates, Flux-only cluster writes, and expand/contract compatibility. |

Deferred does not mean resolved. Each deferred item must have an owner,
activation condition, and target milestone before real production data or
external product teams depend on it.

## 1. Managed database integration

**Status: external dependency, design work may proceed**

### Agent instructions

1. Define one database contract per domain: endpoint, database name, runtime
   role, migrator role, TLS mode, pool budget, timeout policy, and Secret keys.
2. Change production workloads to read credentials from Secret references,
   never literal connection URLs.
3. Separate schema-owner/migrator permissions from API, projection worker,
   outbox publisher, and cleanup permissions.
4. Remove production PostgreSQL Deployments only after the managed endpoints,
   backups, and migration validation are available.
5. Keep ephemeral PostgreSQL explicitly labelled and documented as disposable.
6. Define backup, PITR, restore, maintenance, failover, and connection-saturation
   runbooks.

### Acceptance criteria

- No production runtime uses a database superuser.
- Production has encrypted in-transit connections and verified certificates.
- RPO and RTO are documented and demonstrated by a restore exercise.
- A failed database endpoint does not create an empty replacement database.
- Connection budgets across all replicas fit within provider limits.

## 2. Cryptographic environment isolation and key rotation

**Status: deferred**

### Agent instructions when activated

1. Correct SOPS creation rules to match `ephemeral` and `prod-eu`.
2. Generate independent environment recipients and an offline recovery
   recipient for production.
3. Generate new production JWT signing keys and unique key IDs.
4. Rotate Cloudflare and any credential decryptable by the old shared key.
5. Publish old and new public JWT keys during a bounded overlap, switch signing
   to the new key, then retire the old key after all old tokens expire.
6. Ensure PR and ephemeral jobs cannot decrypt production material.

### Acceptance criteria

- Possession of an ephemeral key cannot decrypt or forge production material.
- Production key rotation does not cause an authentication outage.
- Recovery-key access and use are audited.
- Rotation and loss-of-key drills are documented and tested.

## 3. Session and resource-token boundary

**Status: current refresh rotation and verification accepted; additional claims and client grants deferred**

### Accepted current baseline

1. Verify access-token signatures and expiry against Identity's JWKS and require
   a string subject.
2. Give development and production different signing key sets before production
   traffic; each environment trusts only its own JWKS.
3. Keep the current APIs in one explicit platform trust zone.
4. Keep one independent token family per client session and rotate its refresh
   token in every successful access-token exchange.

### Future activation gates

- Add issuer validation when resource servers trust multiple logical issuers.
- Add audience validation when tokens target different API boundaries.
- Add token-type validation when one signer creates multiple JWT kinds.
- Add product audiences/scopes when product isolation is required.

### Current acceptance criteria

- Development credentials cannot mint tokens accepted by production once the
  environment key split is activated.
- Tokens require a valid signature, expiry, and string subject.
- Refresh credentials never reach product APIs.

## 4. Event-bus capacity, identity, and recovery

**Status: core baseline complete; advanced recovery and authentication deferred**

### Accepted current baseline

1. Keep the current three-server StatefulSet, explicit 1 GiB PVCs, 80% server
   storage ceiling, product-owned stream limits, probes, PDB, placement, and
   hardened container configuration.
2. Keep stream creation with the owning domain worker while products remain in
   one trusted operational model.
3. Keep authentication, measured resources, durable telemetry, archival,
   snapshots, and restore exercises outside the current stage.

### Future activation gates

- Define or change retention, archival, snapshots, and restore only when a
  product supplies replay, RPO, and RTO requirements.
- Add requests and limits only after measuring representative workloads.
- Add capacity and quorum alerts when durable telemetry export is activated.
- Add a separate stream provisioner only if independently operated products
  make worker-owned creation conflict in practice.
- Add workload identity and subject ACLs when untrusted workloads enter the
  NATS network or event provenance becomes a hardened authority boundary.

### Current acceptance criteria

- Both platform overlays render.
- Three NATS servers form JetStream quorum with bound per-pod storage.
- Product streams have explicit size and replica settings.
- Capacity calculations and operational checks are documented.
- Deferred controls remain visible without being implemented speculatively.

## 5. Outbox, consumer, and projection reliability

**Status: accepted simple baseline; advanced failure handling deferred**

### Accepted current pattern

```text
domain transaction writes state and outbox row
LISTEN/NOTIFY wakes the worker
worker locks one unpublished row with FOR UPDATE SKIP LOCKED
worker publishes and waits for JetStream PubAck
worker marks that row published and commits
consumer commits its version-aware projection and then acknowledges
```

Do not replace this with leases or publishing outside the transaction merely
to shorten a transaction. Do not add attempt counters, retry scheduling,
quarantine state, or an inbox framework in anticipation of failures that have
not occurred.

### Future activation gates

- Add an unpublished-row index or cleanup after measured table growth warrants
  it.
- Add retry and quarantine state after a recurring poison event demonstrates
  that restart-and-retry is insufficient.
- Reconsider leases only after measured database lock or connection contention.
- Add a durable inbox when a consumer performs non-idempotent durable side
  effects that version-aware projection logic cannot make safe.
- Add replay, reconciliation, and freshness controls when a product defines a
  recovery or freshness objective.

### Current acceptance criteria

- Domain state and its outbox row commit atomically.
- A failed publish leaves the row unpublished.
- `published_at` is set only after JetStream PubAck.
- Consumer projections remain idempotent and version-aware.
- Accounts and Entitlements worker tests cover successful publication,
  publication failure, and stale projection handling where applicable.

## 6. Account membership and authorization lifecycle

**Status: active before multi-user products**

### Agent instructions

1. Model account opened, renamed, suspended, closed, and restored states.
2. Model member invited, activated, role-changed, suspended, and removed states.
3. Use one monotonic per-account version and publish current-state authority
   facts or well-defined deltas with replay semantics.
4. Replace magic string checks with explicit domain capabilities.
5. Store an immutable audit record for authority changes and the versions used
   for protected decisions.
6. Add end-to-end revocation tests through all projections and products.

### Acceptance criteria

- Removing a member or suspending an account reaches every product within a
  defined SLO.
- Stale projections are detected and handled according to action risk.
- Authorization decisions are explainable from durable evidence.

## 7. API idempotency, consistency, and query scale

**Status: active production requirement**

### Agent instructions

1. Define a platform idempotency-key contract for resource-creating and
   authority-changing commands.
2. Persist caller, operation, key, request hash, durable response, and expiry.
3. Return aggregate version and event ID from commands.
4. Define a provisioning/read-your-writes mechanism for flows that cross
   projections.
5. Add cursor pagination and hard limits to all list endpoints.
6. Add query-shaped indexes, DB length/value constraints, and bounded numeric
   entitlement semantics.
7. Preserve entitlement grant/revocation evidence instead of deleting the only
   history.

### Acceptance criteria

- Retrying a timed-out command cannot duplicate a resource or authority event.
- Large tenants cannot trigger unbounded scans or responses.
- Callers can determine whether downstream projections have reached a required
  version.

## 8. Identity operational reliability

**Status: active production requirement**

### Agent instructions

1. Add an audited, one-time first-operator bootstrap and recovery process.
2. Rate-limit anonymous WebAuthn challenge creation and bound outstanding
   challenges.
3. Make challenge consumption atomic with successful ceremony completion or
   explicitly retryable.
4. Add key-rotation and compromised-session runbooks.

### Acceptance criteria

- No pooled client can be returned with an open or aborted transaction.
- A fresh installation has a supported operator bootstrap path.
- WebAuthn abuse cannot grow storage without a bound.
- Session security events are observable and actionable.

## 9. Kubernetes ownership, security, and availability baseline

**Status: Namespace ownership resolved; broader controls require activation before production**

### Agent instructions when activated

1. Preserve the root-owned production Namespaces and workload-only leaf Flux
   inventories.
2. Add CPU/memory requests based on measured usage and defensible limits.
3. Add PDBs, zone/hostname spread, PriorityClasses, ResourceQuota, and
   LimitRange appropriate to workload criticality.
4. Add namespace default-deny ingress and egress, then explicit required flows.
5. Apply restricted Pod Security Admission labels with documented exceptions.
6. Use namespace-scoped Flux service accounts for domain leaves rather than
   cluster-admin reconciliation.
7. Protect Namespaces, CRDs, PVCs, and PVs from accidental pruning.
8. Validate policies against the selected CNI and a production-compatible
   Kubernetes version.

### Acceptance criteria

- A node loss does not remove all replicas of a supposedly available service.
- Critical pods are not BestEffort eviction candidates.
- New unlabeled pods do not bypass network isolation.
- A compromised product Git path cannot create arbitrary cluster-wide objects.

## 10. Ingress and service routing

**Status: active production requirement**

### Agent instructions

1. Move certificate lifecycle to cert-manager or another HA-safe controller.
2. Run multiple stateless Traefik replicas with PDB and topology spread.
3. Restrict direct origin traffic to trusted Cloudflare paths at the cloud
   firewall or load balancer.
4. Scope or eliminate Traefik's cluster-wide Secret read access.
5. Route internal service traffic directly instead of hairpinning through public
   ingress.
6. Add explicit TLS policy, body/header/time limits, rate limits, and security
   headers.
7. Test certificate and Cloudflare-token rotation.

### Acceptance criteria

- One ingress pod or node may fail without public or internal outage.
- Direct-origin requests cannot bypass the intended edge controls.
- Compromising ingress does not expose unrelated domain Secrets.

## 11. Durable observability and operational response

**Status: deferred while telemetry export is being tested**

### Agent instructions

1. Replace debug-only export with a durable metrics, logs, and traces backend.
2. Add HA collectors, memory limiting, queues, retries, sampling, and PII
   controls.
3. Instrument PostgreSQL, NATS, outbound HTTP, outbox, consumers, and
   projections.
4. Define domain and platform SLIs/SLOs.
5. Alert on Flux failure, certificate expiry, database backup failure, outbox
   age, consumer lag, projection freshness, NATS capacity/quorum, and resource
   saturation.
6. Add dashboards and incident runbooks tied to alert ownership.

### Acceptance criteria

- Telemetry survives collector restart and is queryable for the defined
  retention period.
- Every production-critical dependency has an actionable alert and owner.
- A failed deployment is visible without manually polling Flux.

## 12. Immutable delivery and software supply chain

**Status: core release logic implemented; containing-repository integration external**

### Agent instructions

1. Preserve the independent component release contract from `NOW.md`:
   directory discovery, component-owned image names, exact-SHA matrix builds,
   SHA and production tags, Flux image-policy digest updates, and Flux-only Git
   and cluster reconciliation.
2. Pin production product and platform images by digest.
3. Use an active LTS Node image and declare runtime/package-manager versions.
4. Pin third-party actions and downloaded tools to verified immutable versions.
5. Add dependency review, secret scanning, SAST, container scanning, SBOM,
   provenance, signing, and admission verification.
6. Build and test the production image rather than only a development target.
7. Add production reconciliation status and rollback metadata to each release.

### Acceptance criteria

- Git identifies the exact bytes running in every production container.
- Rebuilding or rolling back does not resolve mutable tags.
- Distinct teams may build different units independently; automated Git writers
  serialize, and conflicts or queue overflow fail visibly instead of
  force-pushing over another desired-state update.
- Release practice ensures a required schema expansion is live before dependent
  code is released, and contraction happens only after the compatibility
  window.
- A release cannot reach production if required tests, scans, signature, or
  provenance checks fail.

## 13. Staging, cluster contract, and disaster recovery

**Status: active before production launch**

### Agent instructions

1. Define production-parity staging and promote the same image digests through
   it.
2. Add cloud IaC or a versioned cluster contract covering Kubernetes version,
   node pools/zones, CNI, CSI, encryption, autoscaling, firewall, audit logging,
   and upgrades.
3. Pin and version Flux bootstrap state and add kube-context/account safeguards.
4. Define regional recovery, rebuild, restore, and DNS cutover procedures.
5. Exercise database restore, NATS restore/replay, Flux bootstrap, and complete
   cluster recreation.

### Acceptance criteria

- Production can be recreated from versioned sources plus protected recovery
  material.
- Promotion uses the artifact tested in staging rather than rebuilding it.
- RPO/RTO claims are demonstrated by game days.

## 14. Product golden path, contracts, and conformance

**Status: active before onboarding multiple product teams**

### Agent instructions

1. Extract technical primitives such as transaction handling, JWT verification,
   structured errors, telemetry, health, idempotency, outbox, and consumer
   running into versioned internal packages. Include an inbox primitive only if
   the activation gate in Section 5 has been met.
2. Keep all business vocabulary and policy in its owning domain.
3. Keep the directory contract and colocated manifests until repeated
   onboarding work demonstrates that a descriptor would remove real
   duplication. Adding one requires explicit owner activation.
4. Generate or validate standard manifests, CI matrices, Flux entries, and
   documentation only if that descriptor work is activated.
5. Automate contract build, compatibility checking, publication, provenance,
   and downstream consumer testing.
6. Add a mandatory production-readiness checklist, ADRs, CODEOWNERS, SECURITY,
   ownership/on-call data, and tested runbooks.
7. Remove or fully support the dormant Linkerd bundle; do not leave stale
   security infrastructure as an implied capability.

### Acceptance criteria

- A new product can be scaffolded without copying and editing dozens of files.
- Platform standards are enforced by conformance tests, not reviewer memory.
- Contract source, published package, producer, and consumers cannot silently
  diverge.
- Every production unit has an owner, SLO, data classification, and recovery
  procedure.

## Production readiness gate

Do not describe the platform as production-ready until all active workstreams
above meet their acceptance criteria and every deferred security boundary has
either been completed or explicitly accepted in a current threat model by the
owner accountable for production risk.
