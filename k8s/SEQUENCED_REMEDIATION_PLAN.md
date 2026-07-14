# Sequenced Architecture Remediation Plan

This is the execution order for turning the current early-stage platform into a
reliable base for future products. It converts the audit into dependency gates,
not calendar estimates. Work inside a phase may run in parallel, but a later
phase must not assume an earlier phase is complete until its exit gate passes.

Use these companion documents for implementation detail:

- `NOW.md` defines the currently authorized corrections.
- `TODO.md` explains the five findings selected for immediate attention.
- `REQUIRED_PRODUCTION_REWRITES.md` defines the complete production backlog and
  acceptance criteria.

If these documents appear to conflict, the owner's decisions below and the
scope in `NOW.md` take precedence for current work.

This roadmap is not blanket authorization to implement the whole backlog.
Tasks already named in `NOW.md` are active. Before starting any other task, the
owner must explicitly activate it and update `NOW.md` or provide equivalent
written scope.

## Owner decisions carried forward

Do not silently reopen these decisions while executing the plan.

| Finding | Current decision | Activation gate |
| --- | --- | --- |
| GitHub Actions are outside the effective repository workflow directory | The containing repository will handle workflow placement and paths. Do not move them from this project without explicit instruction. | Assign a containing-repository owner and integration ticket before Phase 6; test the integrated workflow there before enabling production deployment. |
| In-cluster production PostgreSQL is disposable | Do not invest in making these PostgreSQL Deployments production-grade. They will be replaced by managed databases. | Managed databases, backups, roles, TLS, and restore tests must exist before storing production data. |
| Ephemeral and production cryptographic trust is shared | JWT signing keys will be separated before production traffic; other key separation remains deferred. | Ensure each environment trusts only its own JWT key set, then split remaining cryptographic material before production is treated as a separate trust zone. |
| JWT semantic claims | Signature, expiry, and string-subject verification are accepted in the current single-issuer, single-token-kind, shared-API trust zone. | Add issuer, audience, type, and product scopes when multiple issuers, token kinds, API trust boundaries, or product isolation require them. |
| Product backends receive the host-wide refresh credential | Accepted as an early product assumption. Do not redesign the refresh-cookie/BFF flow unless the owner reopens it. | Reassess before untrusted product teams, independently operated products, privileged administration through product backends, or a compliance boundary. |
| NATS has no client authentication or subject ACLs | Accepted temporarily. Do not add NATS authentication in the current correction pass. | Add workload identity, ACLs, and transport security before untrusted workloads join or NATS event provenance is treated as a hardened authority boundary. |
| Outbox publication uses one locked row and one PubAck per transaction | Accepted current baseline. Do not replace it with leases, retry metadata, quarantine, or an inbox framework speculatively. | Reopen only after measured lock contention, a recurring poison event, non-idempotent durable consumer side effects, or an explicit production recovery requirement. |
| NATS resources and durable telemetry | Deferred while usage and observability are still being tested. | Add measured resources and durable export when a production workload and backend exist. |
| Deployment workflow | Directory-discovered component delivery with component-owned GHCR names, exact-SHA matrix builds, SHA and production tags, and Flux image-policy digest updates is accepted. | Revisit the mutable production-tag policy or introduce domain-level coordination when observed release requirements demand it. |
| Artifact and repository ownership uses personal identities | Requires a separate owner decision and external coordination. Do not migrate ownership incidentally. | Decide and execute an organizational ownership model before multiple independent teams depend on publishing or deployment. |

“Accepted temporarily” means that the risk is visible and gated; it does not
mean the platform may claim the deferred control is already present.

## Sequence at a glance

| Phase | Outcome | Blocks |
| --- | --- | --- |
| 0 | Establish evidence, owners, and repeatable validation | All implementation work |
| 1 | Make the GitOps graph valid and safe to reconcile | Any reliable cluster deployment |
| 2 | Establish a coherent identity and authorization baseline | Additional product authorization logic |
| 3 | Make asynchronous authority propagation recoverable | Multi-user and authority-sensitive products |
| 4 | Complete domain/API correctness for product scale | Product-team onboarding |
| 5 | Convert the prototype into a production-capable runtime | Production delivery readiness |
| 6 | Build immutable delivery and recovery | Production data and traffic |
| 7 | Turn repeated patterns into an enforceable product platform | Multiple independent product teams |

The critical path is:

```text
Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4
                                              |
                                              v
                         Phase 5 -> Phase 6 -> Phase 7
```

Some Phase 5 design work can start earlier, but no production gate may be
crossed out of order. Real production data or traffic requires both the Phase 5
and Phase 6 exit gates; passing Phase 5 alone does not authorize launch.

## Phase 0: establish the controlled baseline

### Objective

Make every subsequent change reviewable, attributable, and testable without
depending on inactive GitHub Actions.

Only validation directly needed to verify `NOW.md` is implicit in the current
scope. External tracking, ADR creation, and cluster-contract work require owner
activation like any other backlog task.

### Work

1. Record each audit workstream with an owner, status, dependency, activation
   condition, and link to the relevant companion section. Use a local Markdown
   tracker until the owner names and authorizes an external issue system.
2. Capture current local validation commands in a root `make` target or script:
   Kustomize rendering, Kubernetes schema validation, and Flux graph checks.
3. Pin the Kubernetes/Kustomize/Flux schema versions used by validation so the
   result is reproducible.
4. Add an architecture decision record for the intentional early-stage trust
   model: one shared API trust zone, shared refresh credential, unauthenticated
   NATS, planned environment-specific JWT keys, deferred separation of other
   keys, and managed-database migration intent.
5. Define the release-blocking labels or status values used for each phase.
6. Define the minimum production cluster contract needed by later work:
   Kubernetes version, at least three schedulable nodes, zone layout, CNI and
   NetworkPolicy behavior, CSI/storage expansion and snapshots, and supported
   API schema. Full IaC and recovery remain later phases.
7. Create or reference the containing-repository owner and integration ticket
   for Phase 6 without moving workflows from this project.

Do not decrypt or rewrite encrypted Secret manifests to perform validation.

### Exit gate

- One local command renders and schema-validates every active production
  overlay and fails on a namespaced object with no namespace.
- Every deferred decision has a named activation condition and accountable
  owner.
- The current prototype trust model is documented without claiming isolation
  it does not provide.
- Scheduling, storage, policy, and validation work share one versioned minimum
  cluster contract.

## Phase 1: repair deployment correctness and ownership

This phase implements audit items 2, 8, and 9 first because the platform cannot
be safely reconciled until they are corrected.

### 1.1 Fix the nested Flux graph

**Status: completed by removing the intermediate Flux objects**

1. Preserve the flat root composition described in `NOW.md`.
2. Keep the existing leaf `dependsOn`, `wait`, timeout, and prune behavior.
3. Reject any change that reintroduces the unnecessary `platform` or `domains`
   Flux reconciliation layer.

### 1.2 Fix the NATS StatefulSet schema

**Status: completed**

The invalid topology-spread patch was removed. The production overlay now uses
required hostname anti-affinity, which expresses the intended one-server-per-
node placement without the incomplete topology-spread constraint. Both
event-bus overlays render, and the ephemeral three-server deployment has been
checked for readiness, JetStream quorum, bound PVCs, and disruption protection.

Do not add zone placement until the production cluster contract defines its
available zones and labels. Advanced capacity, recovery, and authentication
remain separately gated workstreams.

### 1.3 Give every Namespace one Flux owner

**Status: complete**

The root cluster reconciliation owns the Identity, Accounts, and Entitlements
Namespaces exactly once. Production workload leaves retain their Kustomize
namespace transformers but do not render Namespace resources. Ephemeral
overlays remain self-contained. No foundation directory or extra Flux layer was
added.

### Current and future pull-request slices

1. Preserve the completed Flux namespace repair.
2. Preserve the completed NATS StatefulSet repair.
3. Add a reusable validation harness only when that work is activated.
4. Preserve the completed single-owner Namespace design.

### Current exit gate

- All active manifests render and pass schema validation.
- All leaf Flux resources are explicitly in `flux-system`.
- Flux dependency ordering still converges from an empty cluster.

### Production ownership gate

- Removing one workload leaf cannot prune a Namespace or unrelated domain
  resources.

## Phase 2: establish identity and authorization correctness

This phase preserves the owner's current token and refresh-model decisions.
Both sections are production-backlog work and require explicit activation.

### 2.1 Define one baseline access-token profile

**Status: additional claims deferred by owner**

The current baseline verifies signature and expiry against Identity's JWKS and
requires a string subject. Development and production must use separate signing
key sets before production traffic, and each environment must trust only its own
JWKS.

Add and verify `iss` when multiple logical issuers are trusted, `aud` when tokens
target different API boundaries, and `typ` when one signer creates multiple JWT
kinds. Add product audiences/scopes only when product isolation is required.
Do not change refresh cookies, product BFFs, or `operator` behavior merely to
prepare for those future boundaries.

### 2.2 Repair identity operational failure paths

1. Add an audited, one-time initial-operator bootstrap and recovery process.
2. Bound and rate-limit anonymous WebAuthn challenges and make challenge
   consumption atomic or explicitly retryable.
3. Write and exercise identity key-rotation and compromised-session response
   runbooks. Actual environment-key separation remains Phase 5.

### Future exit gate when activated

- Development and production trust different JWT key sets.
- Any activated issuer, audience, token-type, or scope boundary has negative
  verification tests.
- The shared refresh-cookie trust zone is explicitly stated in the threat model.
- Activated operator bootstrap and WebAuthn failure paths have automated tests.

## Phase 3: make event-driven authority recoverable

Do this before expanding account, membership, entitlement, or revocation flows.
Without it, authorization state can silently diverge across products.

Phase 3 and subsequent backlog phases require explicit owner activation unless
a task is separately named in `NOW.md`.

**Current status:** the simple NATS, outbox, and projection baseline is accepted
and complete for this stage. Everything below is future, trigger-based work;
none of it is authorized merely because it appears in this roadmap.

### 3.0 Establish minimum reliability telemetry

**Status: deferred while telemetry export is being tested**

1. Install or select a durable metrics and alerting path before defining an SLO
   that depends on it. The full HA observability platform remains Phase 5.
2. Instrument PostgreSQL, NATS, outbound HTTP, outbox publishing, consumers,
   and projections with latency, error, saturation, lag, retry, and freshness
   signals appropriate to each dependency.
3. Create owned alerts for NATS capacity/quorum, outbox age, consumer lag,
   projection freshness, failed revocation propagation, and quarantine growth
   only if quarantine handling has been introduced.
4. Prove the alert path independently of application logs.

### 3.1 Define NATS capacity and recovery

**Status: current baseline complete; advanced recovery deferred**

The current three-server cluster, explicit PVCs, 80% server storage ceiling,
product stream limits, probes, PDB, placement, and operational documentation
are accepted for this stage.

Reopen retention changes, archival, snapshots, restore exercises, measured
resources, or capacity alerts when a product defines a replay/RPO/RTO
requirement. Consider a separate stream provisioner only if independently
operated products make worker-owned stream creation conflict in practice.

NATS client authentication remains deferred in this phase unless its activation
gate has already been reached.

### 3.2 Make the outbox and consumers failure-safe

**Status: accepted simple baseline; advanced failure machinery deferred**

The current pattern is intentionally boring:

```text
domain transaction writes state and outbox row
LISTEN/NOTIFY wakes the worker
worker locks one unpublished row
worker publishes and waits for JetStream PubAck
worker marks that row published and commits
consumer commits its projection and then acknowledges
```

Do not add lease columns or publish outside the row-locking transaction merely
to shorten a transaction. Add an unpublished-row index or cleanup only after
table growth is measured. Add retry/quarantine state only after a recurring
poison event exists. Add a durable inbox only when a consumer performs a
non-idempotent durable side effect that version-aware projection logic cannot
make safe.

### 3.3 Make projections measurable and rebuildable

**Status: deferred until a product defines a recovery or freshness objective**

1. Persist event ID, source aggregate version, source timestamp, applied
   timestamp, and freshness state.
2. Handle duplicate and out-of-order events deterministically.
3. Add replay, snapshot comparison, reconciliation, and full rebuild tooling.
4. Define how high-risk requests behave when their authorization projection is
   stale.

### Future production exit gate

- Broker saturation cannot silently freeze authority propagation.
- Poison, duplicate, and out-of-order events cannot corrupt or indefinitely
  block unrelated aggregates.
- A failed revocation creates a detectable freshness breach and actionable
  alert.
- NATS and every material projection have demonstrated backup/replay or rebuild
  procedures.
- Required dependency signals are retained durably and their alert paths have
  been exercised.

## Phase 4: complete domain and API semantics for product scale

### 4.1 Model the authorization lifecycle

1. Define account open, rename, suspend, close, and restore transitions.
2. Define member invite, activation, role change, suspension, and removal.
3. Publish replayable authority facts using one monotonic per-account version.
4. Replace magic role strings with explicit domain capabilities.
5. Retain immutable authority-change and protected-decision evidence.
6. Test revocation end to end through all product projections.

### 4.2 Standardize command and query behavior

1. Define persistent idempotency semantics for resource-creating and
   authority-changing commands.
2. Return aggregate version and event ID from commands and provide a
   read-your-writes/projection-catch-up mechanism.
3. Add cursor pagination and hard response limits to all collection endpoints.
4. Add indexes shaped to actual queries and enforce database length, value, and
   numeric constraints.
5. Preserve entitlement grant and revocation history.

### 4.3 Make contracts independently releasable

1. Build and test contract packages in every producer change.
2. Add compatibility checks against the current released contract.
3. Test known consumers and make contract publication, producer release, and
   consumer adoption visible parts of one release plan.
4. Publish provenance for released contracts.

### Exit gate

- Membership removal and account suspension reach every product within a
  defined, monitored SLO.
- Retrying a timed-out command cannot duplicate a resource or authority event.
- Large tenants cannot cause unbounded reads or responses.
- Contract source, published artifacts, producers, and known consumers cannot
  silently diverge.

## Phase 5: convert to a production runtime

This is where the deferred infrastructure choices become due. Passing this
phase is necessary but not sufficient for launch: do not put real production
data or traffic on the platform until both Phase 5 and Phase 6 pass.

### 5.0 Establish production-parity staging

1. Instantiate staging from the minimum cluster contract defined in Phase 0,
   using the production Kubernetes API level, CNI policy behavior, CSI/storage
   capabilities, topology assumptions, and workload security controls.
2. Exercise schema, scheduling, NetworkPolicy, storage expansion/snapshot, and
   failure behavior there before applying the corresponding production policy.
3. Keep staging credentials and data isolated and non-production.
4. Refine the minimum contract into versioned cluster IaC or a complete tested
   cluster specification as infrastructure choices become concrete.

### 5.1 Replace in-cluster databases with managed PostgreSQL

1. Define a per-domain database contract: endpoint, database, TLS mode, Secret
   keys, connection budget, timeouts, and maintenance behavior.
2. Separate schema owner/migrator, API, worker, outbox, and cleanup roles.
3. Validate migrations, failover, backup, point-in-time recovery, and restore.
4. Switch workloads to Secret references rather than literal connection URLs.
5. Remove production PostgreSQL Deployments only after the managed service and
   recovery path are proven.
6. Keep ephemeral PostgreSQL explicitly disposable.

### 5.2 Activate environment cryptographic isolation

1. Correct SOPS rules for the actual environment paths.
2. Create independent ephemeral and production recipients plus an offline
   production recovery recipient.
3. Rotate production JWT keys with unique key IDs and bounded JWKS overlap.
4. Rotate Cloudflare and any other material exposed to the old shared trust.
5. Prove PR and ephemeral jobs cannot decrypt production material.

### 5.3 Activate broker identity when its gate is reached

1. Create separate provisioning, producer, and consumer identities.
2. Apply least-privilege subject ACLs and TLS.
3. Rotate the currently exposed system credential.
4. Test that a consumer cannot publish authority events or administer streams.

If NATS remains unauthenticated by explicit owner acceptance, the threat model
must state that event provenance is not a security boundary and production
network access must remain limited to one trusted workload zone.

### 5.4 Establish the Kubernetes runtime baseline

1. Add measured requests/limits, quotas/defaults, PDBs, priority, and zone plus
   hostname spread.
2. Apply restricted Pod Security Admission with documented exceptions.
3. Add namespace-wide default-deny networking followed by explicit DNS,
   ingress, database, broker, telemetry, and control-plane grants.
4. Reconcile domain leaves through namespace-scoped Flux service accounts.
5. Protect Namespaces, CRDs, PVCs, and PVs from unintended prune.
6. Validate all policy against the selected CNI and Kubernetes version.
7. Add baseline policy, quota, LimitRange, and domain-level RBAC to the
   Namespace ownership structure selected when Phase 1.3 is activated; do not
   assume a `foundation/` directory.

### 5.5 Remove ingress and observability single points of failure

1. Move certificate lifecycle to an HA-safe controller and run multiple
   stateless, spread Traefik replicas.
2. Block direct-origin bypass, reduce Secret RBAC, and route internal traffic
   directly rather than through public ingress.
3. Replace debug-only telemetry with a durable backend and HA collectors with
   queues, retries, memory limiting, sampling, and PII controls.
4. Define SLOs and alerts for Flux, certificates, databases, outbox age,
   consumer lag, projection freshness, NATS, and resource saturation.
5. Enforce explicit TLS versions/ciphers as supported, request body/header and
   response-time limits, rate limits, security headers, and an explicit ingress
   class; test both accepted and rejected traffic.
6. Complete dashboards and dependency instrumentation for PostgreSQL, NATS,
   outbound HTTP, outbox, consumers, and projections, building on Phase 3's
   minimum signals.

### 5.6 Complete workload and controller lifecycle semantics

1. Add startup probes with realistic recovery budgets, keep liveness checks
   shallow, and make readiness prove only the dependencies required to receive
   traffic. Add synthetic checks for end-to-end availability.
2. Add checksum- or reloader-driven rollouts for JWT keys, Cloudflare
   credentials, and fixed-name configuration consumed only at process start.
3. Source CRDs from pinned, traceable upstream releases; test CRD-before-
   controller upgrades, stored-version compatibility, and rollback.
4. Add explicit Flux retry behavior and reconciliation notifications instead of
   waiting for the normal polling interval to reveal failure.
5. Test credential rotation, slow startup/recovery, and controller upgrade
   paths without creating an avoidable outage.

### Exit gate

- Managed databases meet tested backup, restore, role, TLS, and connection
  budget requirements.
- Production credentials cannot be decrypted or used from ephemeral/PR trust.
- Every deferred security boundary is either implemented or explicitly
  accepted in a current production threat model by the accountable owner.
- A single node or ingress/collector pod failure does not remove a claimed
  highly available service.
- Every production-critical dependency has durable telemetry, an actionable
  alert, and an owned runbook.
- Configuration and credential rotation reliably reaches every consumer, and
  probe behavior does not restart-loop a legitimately recovering service.
- Production policies have passed in production-parity staging against the
  selected Kubernetes, CNI, and CSI contract.

## Phase 6: build immutable delivery, staging, and disaster recovery

The parent repository owns workflow discovery. This project owns the release
contract that those workflows must execute.

### 6.1 Make independent component delivery exact and collision-safe

**Status: implemented here; containing-repository integration external**

1. Keep exactly `pull-request.yaml` and `release.yaml`.
2. Discover changed domains and components from the stable directory layout;
   do not hardcode a catalog.
3. Treat a component's `prod-eu` overlay as its production-enrollment marker and
   require exactly one image declaration. Its `name` is the GHCR destination.
4. Build changed production components from the triggering SHA in a matrix and
   publish both their SHA and `production` tags.
5. Let Flux image policies resolve the production digests and image automation
   commit them into the marked component overlays.
6. Actions writes only to GHCR. Let Flux alone write desired state to Git and
   apply it to the cluster.
7. Require expand/contract compatibility and verify containing-repository path
   integration before activating the workflows.

This resolves audit item 10 without requiring this repository to decide where
the containing repository stores its Actions workflows.

### 6.2 Harden the supply chain

1. Pin production application and platform images by digest.
2. Use an active LTS runtime and declare Node/package-manager versions.
3. Pin Actions and downloaded tools to verified immutable revisions.
4. Add dependency and secret review, SAST, container scanning, SBOM,
   provenance, signing, and admission verification.
5. Constrain Docker build contexts and `.dockerignore` rules so credentials,
   environment files, coverage, and unrelated local artifacts cannot enter a
   production image or its build cache.
6. If the owner activates the separate ownership decision, move personal
   artifact/repository identities to an organizational model before multiple
   teams depend on them.

### 6.3 Establish promotion and recovery

1. Promote the same digest through the production-parity staging environment
   established in Phase 5; never rebuild during promotion.
2. Complete the versioned cluster contract or IaC with zones/node pools,
   autoscaling, encryption, firewall, audit logging, maintenance, and upgrades.
3. Pin Flux bootstrap state and add explicit cluster/account/context guards.
4. Exercise database restore, NATS restore/replay, Flux bootstrap, full cluster
   recreation, and DNS cutover.

### Exit gate

- Git identifies the exact bytes running in every production workload.
- Every component image is built from the SHA recorded for that workflow run and is
  promoted by immutable digest.
- Every production image policy resolves a digest and updates its marked
  component overlay.
- The initial mutable `production` tagging policy remains explicitly
  replaceable without changing the image automation architecture.
- Independent Flux rollout is safe under the documented expand/contract rules;
  no atomic runtime cutover is claimed.
- Production runs the exact artifact that passed staging.
- Failed policy, test, scan, signature, or provenance checks prevent promotion.
- Recovery-point and recovery-time claims have been demonstrated, not merely
  documented.
- The containing repository has discovered and executed both integrated
  workflows, including multi-domain PR and multi-component release tests.

## Phase 7: productize the platform's golden path

Do this after the primitives are correct; otherwise templates will multiply the
current failure modes.

1. Extract versioned technical primitives for transactions, token validation,
   structured errors, telemetry, health, idempotency, outbox, and consumer
   execution. Include an inbox primitive only if its activation gate in Phase
   3.2 has been met. Keep business policy in its owning domain.
2. Keep the directory contract and colocated manifests until repeated
   onboarding work proves a descriptor or generator would remove real
   duplication. Introducing one requires a separate owner decision.
3. If activated, generate or validate standard manifests, CI matrices, Flux
   entries, and documentation from maintained templates.
4. Add conformance policy for immutable images, resources, probes, non-root
   security, Namespace ownership, telemetry, and recovery metadata.
5. Add ADRs, CODEOWNERS, SECURITY, on-call ownership, production-readiness
   review, and tested runbooks.
6. Remove the dormant Linkerd bundle or adopt a currently supported, owned,
   tested configuration. Do not leave it as an implied platform capability.
7. Make development reproducible and safe: pin the local toolchain, declare
   Node and package-manager versions, provide a named one-command local cluster,
   guard commands against the wrong Kubernetes context, use a reserved `.test`
   domain, and add required-version checks.

### Exit gate

- A new product can be added without copying and manually editing dozens of
  files.
- Platform rules are enforced by tests and policy rather than reviewer memory.
- Every production unit declares an owner, SLO, data classification, trust
  boundary, and recovery procedure.

## Conditional refresh-credential redesign

The refresh-cookie/BFF model is not part of the active sequence. Reopen it only
when one of these conditions becomes true:

- product backends are owned or deployed by teams outside the platform trust
  zone;
- one product must not be able to refresh a session used by another product;
- privileged administrative actions are delegated to product backends, or
  operator sessions are allowed outside the trusted platform zone;
- products need independent client lifecycle, consent, revocation, or audience;
- a compliance or customer isolation requirement demands separate credential
  boundaries.

When activated, put refresh credentials behind an identity/session gateway,
issue resource-specific access tokens with explicit audiences/scopes, and strip
refresh credentials before traffic reaches product workloads. Treat this as a
designed migration, not an incidental middleware change.

## Immediate execution recommendation

The Flux simplification, single-owner Namespace design, and current
NATS/event-publication stage are complete. Do not reopen them speculatively.
Preserve the current implementations.

The independent unit-delivery correction in Phase 6.1 is the current authorized
scope and is implemented in this project. Its containing-repository placement
and execution remain external integration work.

JWT semantic claims, Phase 2.2, advanced event reliability, descriptors, and
later backlog work remain deferred. Do not activate them automatically or begin
templating the platform without a demonstrated need and explicit owner scope.
