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
| Ephemeral and production cryptographic trust is shared | Accepted temporarily. Do not rotate or split keys in the current correction pass. | Split and rotate before production is treated as a separate trust zone or production credentials/data are introduced. |
| Product backends receive the host-wide refresh credential | Accepted as an early product assumption. Do not redesign the refresh-cookie/BFF flow unless the owner reopens it. | Reassess before untrusted product teams, independently operated products, privileged administration through product backends, or a compliance boundary. |
| NATS has no client authentication or subject ACLs | Accepted temporarily. Do not add NATS authentication in the current correction pass. | Add workload identity, ACLs, and transport security before untrusted workloads join or NATS event provenance is treated as a hardened authority boundary. |
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
   model: shared JWT audience, shared refresh credential, unauthenticated NATS,
   shared environment keys, and managed-database migration intent.
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

1. Add `whenUnsatisfiable: DoNotSchedule` to the existing hostname topology
   spread constraint.
2. Validate the rendered StatefulSet against the chosen Kubernetes API schema.
3. Confirm the production cluster contract will provide at least three
   schedulable nodes before adding stricter zone constraints.

This only makes the StatefulSet valid. Capacity, recovery, and authentication
are separate workstreams.

### 1.3 Give every Namespace one Flux owner

**Status: deferred by owner; not part of the current Flux simplification**

1. Introduce one foundation Kustomization per domain to own only its Namespace
   and any labels already present on that Namespace.
2. Remove duplicate Namespace resources from API, worker, migration, database,
   cleanup, and UI leaves.
3. Make workload leaves depend on the domain foundation.
4. Protect Namespaces and durable resources from accidental prune where their
   lifecycle must outlive one workload definition.
5. Test deletion of a leaf from the rendered inventory and prove it cannot
   delete the domain Namespace.

Policy, quota, and RBAC may use this foundation later, but adding those controls
is Phase 5 work and is not part of the currently authorized ownership patch.

### Recommended pull-request slices

1. Validation harness and failing fixtures.
2. Flux namespace repair.
3. NATS required-field repair.
4. Namespace ownership only after the owner reopens its design.

### Exit gate

- All active manifests render and pass schema validation.
- All leaf Flux resources are explicitly in `flux-system`.
- Removing one workload leaf cannot prune a Namespace or unrelated domain
  resources.
- Flux dependency ordering still converges from an empty cluster.

## Phase 2: establish identity and authorization correctness

This phase addresses audit item 6 while preserving the owner's refresh-token
decision.

Section 2.1 is active in `NOW.md`. Section 2.2 is production-backlog work and
requires an explicit owner activation before implementation.

### 2.1 Define one baseline access-token profile

1. Add configured and validated `iss` and shared platform `aud` claims.
2. Require the access-token type `at+jwt` and the explicitly allowed `ES256`
   signing algorithm.
3. Centralize token verification so every resource server enforces issuer,
   audience, type, algorithm, expiry, signature, and required claims in the
   same way.
4. Add negative tests for wrong/missing issuer, wrong/missing audience, wrong
   token type, algorithm substitution, expired tokens, malformed claims, and
   unknown key IDs.
5. Document that the shared audience is a baseline against token confusion, not
   product-level resource isolation.

Do not change refresh cookies, rotation endpoints, product BFFs, or the current
`operator` behavior in this task.

### 2.2 Repair identity operational failure paths

1. Introduce one transaction helper that always rolls back failed operations
   and never returns a broken client to the pool.
2. Make refresh-token rotation safe under a lost response and permitted
   concurrent retry without incorrectly revoking a legitimate session.
3. Add an audited, one-time initial-operator bootstrap and recovery process.
4. Bound and rate-limit anonymous WebAuthn challenges and make challenge
   consumption atomic or explicitly retryable.
5. Write and exercise identity key-rotation and compromised-session response
   runbooks. Actual environment-key separation remains Phase 5.

### Exit gate

- Every API uses the same tested token-verification contract.
- A token minted by another issuer, for another audience, or with another token
  type is rejected.
- The shared audience and shared refresh-cookie trust zone are explicitly
  stated in the threat model.
- Transaction, refresh retry, operator bootstrap, and WebAuthn failure paths
  have automated tests.

## Phase 3: make event-driven authority recoverable

Do this before expanding account, membership, entitlement, or revocation flows.
Without it, authorization state can silently diverge across products.

Phase 3 and subsequent backlog phases require explicit owner activation unless
a task is separately named in `NOW.md`.

### 3.0 Establish minimum reliability telemetry

1. Install or select a durable metrics and alerting path before defining an SLO
   that depends on it. The full HA observability platform remains Phase 5.
2. Instrument PostgreSQL, NATS, outbound HTTP, outbox publishing, consumers,
   and projections with latency, error, saturation, lag, retry, and freshness
   signals appropriate to each dependency.
3. Create owned alerts for NATS capacity/quorum, outbox age, consumer lag,
   quarantine growth, projection freshness, and failed revocation propagation.
4. Prove the alert path independently of application logs.

### 3.1 Define NATS capacity and recovery

1. Define retention, replay, recovery-point, and recovery-time objectives for
   every stream.
2. Replace the current permanent `DiscardNew` saturation behavior with an
   intentional retention or archival policy.
3. Size every NATS volume for the sum of replicated streams, metadata,
   compaction, failure recovery, growth, and operational headroom.
4. Add requests, limits, a PDB, topology policy, capacity/quorum alerts,
   snapshots, and a tested restore procedure.
5. Move stream/consumer administration to a controlled provisioner so runtime
   workers do not reconcile broker administration independently.

NATS client authentication remains deferred in this phase unless its activation
gate has already been reached.

### 3.2 Make the outbox and consumers failure-safe

1. Add an unpublished-row index, attempts, next-attempt time, lease metadata,
   last error, and quarantine state to each outbox.
2. Claim rows in a short transaction, publish outside it, and finalize each
   event independently.
3. Add durable inbox idempotency where consumers perform durable side effects.
4. Configure bounded redelivery, exponential backoff, maximum delivery count,
   and quarantine handling.
5. Preserve and alert on invalid authority events; never ACK and discard them
   without evidence.
6. Define and automate retention and cleanup for outbox rows, inbox records,
   quarantine events, and replay metadata without deleting required audit
   evidence.

### 3.3 Make projections measurable and rebuildable

1. Persist event ID, source aggregate version, source timestamp, applied
   timestamp, and freshness state.
2. Handle duplicate and out-of-order events deterministically.
3. Add replay, snapshot comparison, reconciliation, and full rebuild tooling.
4. Define how high-risk requests behave when their authorization projection is
   stale.

### Exit gate

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
   foundation Kustomizations introduced in Phase 1.

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

### 6.1 Replace unit-at-a-time deployment with one release transaction

1. Detect all changed components from the exact triggering commit.
2. Build and test changed units in parallel from that exact commit, including
   the production image target rather than only the development target.
3. Produce immutable image digests and attestations once.
4. Run unit, contract, migration, production-image smoke, scan, and signature
   checks before manifest mutation.
5. Create one reviewed GitOps change containing every component digest and
   required migration ordering for the release.
6. Use a real queue that retains every release; do not rely on the default
   GitHub concurrency model's single pending slot.
7. Report Flux reconciliation, smoke verification, and rollback metadata.
8. Add a root validation lane for platform, cluster graph, shared configuration,
   workflow, and contract changes so path filters cannot bypass system tests.
9. Integrate through the containing-repository owner/ticket and run an
   end-to-end test proving workflow discovery, path handling, release queueing,
   desired-state mutation, and reconciliation reporting.

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
- A multi-component release has one atomic desired-state commit with no
  silently dropped component, followed by dependency-ordered Flux rollout,
  verification, and a defined rollback path. The live rollout is not described
  as transactional.
- Production runs the exact artifact that passed staging.
- Failed policy, test, scan, signature, or provenance checks prevent promotion.
- Recovery-point and recovery-time claims have been demonstrated, not merely
  documented.
- The containing repository has discovered and executed the integrated
  workflow, including a test proving that its queue retains consecutive
  releases.

## Phase 7: productize the platform's golden path

Do this after the primitives are correct; otherwise templates will multiply the
current failure modes.

1. Extract versioned technical primitives for transactions, token validation,
   structured errors, telemetry, health, idempotency, outbox/inbox, and consumer
   execution. Keep business policy in its owning domain.
2. Define a component descriptor containing owner, type, source, image,
   dependencies, contracts, environments, SLO tier, and data classification.
3. Generate or validate standard manifests, CI matrices, Flux entries, and
   documentation from maintained templates.
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

For the next implementation scope, authorize any Phase 0 additions not already
covered by `NOW.md`, then execute the Phase 1 corrections first. The first batch
should:

1. add the local schema/graph validation harness;
2. preserve the completed leaf Flux namespace fix and its regression check;
3. add the missing NATS scheduling field;
4. leave Namespace ownership unchanged until its design is explicitly reopened.

After that batch passes its exit gate, execute only the shared JWT profile in
Phase 2.1, which is already in `NOW.md`. Do not automatically proceed to Phase
2.2 or later backlog work; activate it explicitly and update `NOW.md` first.

The atomic desired-state release design already authorized by `NOW.md` may be
developed after Phase 1, but it cannot pass the Phase 6 exit gate until the
containing repository integrates and tests it. Do not begin by templating the
current platform or adding more product services; stabilize the underlying
contracts first.
