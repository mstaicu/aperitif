# Aperitif next-stage backlog

This backlog implements the findings in the [architecture audit](2026-09-13-platform-audit.md). It preserves self-hosted PostgreSQL, the accepted NATS connection model, domain-owned data, optional components, transactional outboxes, and `latest` image promotion with Flux digest resolution.

**Priority:** P0 blocks the intended delivery path; P1 closes a material correctness, security, autonomy, or recovery gap; P2 improves scale, maintainability, or capabilities before their stated trigger. Conditional items are not instructions to expand scope immediately.

**Size:** S is a focused change; M spans several components or tests; L requires a lifecycle design and operational rehearsal. These are relative estimates, not delivery commitments. Owners are suggested responsibility areas, not assigned people. Every item remains open; this audit implements none of them.

## Milestones

| Milestone | Items | Exit condition |
| --- | --- | --- |
| 1. Dependable delivery | A01–A03, A15–A17 | A real changed-domain PR reaches master, checks succeed, only intended images publish, Flux records the digests, and rollback stays in place. |
| 2. Recoverable asynchronous integration | A04–A09, A18, A22, A25–A27 | Broker outage, malformed messages, loss of retained state, replay, and overlapping workers have deterministic tested outcomes. |
| 3. Executable SaaS composition | A10–A14, A20–A21, A23, A28–A30 | One product works in single-user, shared-account, and dedicated-installation profiles with explicit disabled/offline behavior. |
| 4. Additional message semantics | A19 | The first real command/delta/fact use case passes its own retention, ordering, deduplication, and recovery tests. |

JWT validation and failure alerts can proceed alongside the delivery fixes. Tombstone design belongs early, while its runtime rollout can coincide with the first deletion capability. Use the smallest useful scope for each item.

## Delivery

### A01 — Put workflows at the actual Git root and repair path mapping

**P0 · S · Delivery · Dependencies: none**

Confirmed defect. Move the two workflows from `k8s/.github/workflows` to repository-root `.github/workflows`. Prefix filters with `k8s/`; adjust directory-depth extraction and use unambiguous repository-relative build contexts. Keep Flux's `./k8s/...` paths consistent with the real layout. Evidence: [publishing workflow][publish], [PR workflow][checks].

Acceptance:

- GitHub discovers both workflows in a real PR/push.
- An Accounts source edit selects Accounts checks and the affected build unit; a runtime edit selects runtime checks and the relay build.
- A domain infra-only edit checks manifests and publishes no application image.
- Rename/deletion fixtures do not create jobs targeting missing directories.

### A02 — Add a stable aggregate check and complete changed-unit coverage

**P1 · M · Delivery · Dependencies: A01**

Add an always-running final gate that fails on any required failure/cancellation and handles an empty domain matrix intentionally. Include cluster capabilities, Flux inventory, and workflow/configuration validation. Establish the branch/merge-queue rule using the actual final check name. Pass matrix paths through environment variables with validation rather than interpolating arbitrary changed filenames into shell source. Evidence: [PR workflow][checks], [roadmap][roadmap].

Acceptance:

- Domain-only, runtime-only, platform-only, Flux-only, workflow-only, and documentation-only fixtures produce the intended jobs.
- A failed or canceled child cannot leave the aggregate gate green.
- Required branch protection and merge queue recognize the stable gate.
- Unchanged domains do not acquire unnecessary full test runs.

### A03 — Make manifest checks independent of private local keys

**P1 · M · Delivery · Dependencies: A01**

Auth's local check needs standalone Kustomize, KSOPS, and an Age key that CI does not install/provide. Separate encrypted-config checks from a safe rendered CI composition with disposable signing material or dummy Secrets. Pin and install needed validators. Never decrypt a checked-in Secret in place. Evidence: [Auth Makefile][auth-make].

Acceptance:

- A clean fork PR without production credentials completes all eligible checks.
- Invalid YAML, broken references, invalid workload fields, and missing required Secret keys are detected.
- Rendered Secrets are sanitized before inspection or logging.
- Local developer rendering and production encrypted overlays remain valid.

### A15 — Gate image promotion and make schema compatibility explicit

**P1 · M · Delivery/domain owners · Dependencies: A01–A03**

Keep SHA build tags, digest scanning, and `latest` promotion. Run or verify changed-domain checks for the pushed candidate. Promote a domain's required compatible artifacts only after its required builds/scans succeed. Use expand/contract SQL; add a schema/release marker only where a stricter dependency is needed. Evidence: [publishing workflow][publish], [Accounts Flux graph][accounts-flux].

Acceptance:

- A failing migration build/scan cannot cause an incompatible API to be promoted.
- Delaying the migration rollout cannot make the API use a missing schema.
- Previous and new API versions both tolerate the expansion migration.
- Unrelated domain releases remain independent.

### A16 — Prevent old-run promotion and rehearse digest rollback/bootstrap

**P1 · M · Delivery · Dependencies: A01, A15**

Guard against an older workflow rerun moving `latest` backward. Define rollback separately from normal promotion, including the necessary image-automation suspension or release selection. Replace initial zero digests through a documented first-image/bootstrap procedure. Verify Flux Git write permission under the actual branch rules. Evidence: [image automation][automation], [image policy][policy], [bootstrap][bootstrap].

Acceptance:

- Rerunning an older successful workflow after a newer release does not regress latest.
- A deliberate rollback survives at least two automation/reconciliation intervals.
- A fresh environment resolves all first-party digests before declaring readiness.
- Failed registry scans and Git writeback produce actionable status; none are mistaken for successful deployment.

### A17 — Release and qualify contract packages and the shared relay

**P1 · M · Domain/delivery owners · Dependencies: A02**

Add an explicit contract package release/adoption path. Test a packed candidate package with its producer and supported consumers without silently testing only the old registry version. Export schema/example artifacts for non-Node consumers. Qualify relay changes against all supported outbox schemas/configurations; use explicit adoption channels only if independent upgrade timing is required. Evidence: [Accounts contract package][contract-package], [initializer package][initializer-package].

Acceptance:

- A candidate incompatible contract fails compatibility tests before publication.
- Published package versions are immutable and consumer adoption is explicit.
- A contract-only edit is either published and adopted deliberately or clearly has no runtime effect.
- Current domain outbox schemas continue working with a new relay release; migrations precede any incompatible runtime requirement.

### A24 — Make release inputs and evidence traceable

**P2 · M · Delivery · Dependencies: A01**

Pin Actions to verified commit SHAs and build inputs to digests with automated update review. Preserve scan/SBOM/provenance outputs and revision metadata. Include upstream runtime images in the inventory. Keep signing/admission optional until policy requires them. Evidence: [publishing workflow][publish], [relay Dockerfile][relay-docker].

Acceptance:

- A deployed digest maps back to a source revision, build inputs, and scan result.
- A reviewed dependency update can move all relevant pins.
- The report distinguishes ignored unfixed vulnerabilities from a clean scan.
- Scan failure leaves the production selection unchanged.

## Messaging and recovery

### A04 — Prevent a poison outbox row from stalling every subject

**P1 · M · Runtime/domain owners · Dependencies: none**

Add persistent attempt/repair state and distinguish transient failures from permanently invalid transport data. Preserve failed messages and expose a controlled quarantine/re-drive operation. Allow unrelated subjects to progress while retaining aggregate ordering where required. Evidence: [relay][relay], [malformed-header test][relay-tests].

Acceptance:

- A malformed oldest row followed by a valid unrelated row does not permanently block the latter.
- A NATS outage loses no committed rows and recovers with bounded backoff.
- A quarantined command is never reported as completed.
- Repair/re-drive is idempotent, auditable, and does not skip a required delta predecessor.

### A05 — Handle consumer failures without endless bootstrap crashes

**P1 · M · Plans/domain owners · Dependencies: none**

Handle invalid envelopes/subjects separately from transient SQL failures. Persist rejected-message information before ack/termination. Explicitly configure delivery/retry/in-flight limits and consumer lifecycle. Keep ephemeral replay for small state feeds if it remains intentional; use durable consumers where restart economics or command semantics require them. Evidence: [consumer loop][consumer], [initializer][initializer].

Acceptance:

- One invalid retained event cannot permanently prevent unrelated Accounts from initializing.
- A crash after DB commit but before ack does not duplicate the business mutation/outgoing event.
- Repeated restarts cannot bypass failure accounting by creating a fresh consumer each time.
- Rolling-update overlap is safe, and consumer cleanup/recovery is documented.

### A06 — Bound lock waits, publishing work, and shutdown

**P1 · M · Runtime/domain owners · Dependencies: A04**

Set appropriate connection/query/lock bounds and operational deadlines; measure the source-mutation delay caused by a relay row lock. Preserve the current stale-publication fence. Optimize claims/batching only after demonstrating that a replacement design is correct. Evidence: [relay][relay], [plan setter][plan-set].

Acceptance:

- Broker delay and loss cannot leave API SQL waiting indefinitely.
- A worker exits within its configured termination budget without deleting unacknowledged work.
- Lost PubAck and database-session loss still converge to the newest snapshot.
- A benchmark records steady-state and catch-up throughput plus mutation latency.

### A07 — Enforce generic transport input rules

**P1 · S · Runtime/domain owners · Dependencies: A04**

Validate subjects, string-valued newline-free headers, reserved `Nats-*` names, content type, and serialized message-size limits. Keep domain schemas out of the relay. Align transport bounds with actual broker/stream limits. Evidence: [header copy][relay-headers], [relay contract][operations].

Acceptance:

- Non-string headers, newline injection, reserved controls, wildcard publish subjects, and oversized messages are rejected predictably.
- Valid tracing and correlation headers survive transport.
- Invalid persisted rows enter repair handling; they do not create infinite crash loops.
- No validator silently coerces stored payloads or header values.

### A08 — Implement resumable state-feed reseeding

**P1 · L · Accounts/Plans owners · Dependencies: A04, A06**

Implement one-shot domain commands/Jobs that rebuild retained feeds from current authoritative records through the normal outbox. Preserve resource versions, create fresh message IDs, use bounded keyset traversal, and serialize against concurrent source mutations. Evidence: [documented recovery][operations], [source transaction][account-create].

Acceptance:

- Remove a state stream in an isolated test environment, recreate/reseed it, and rebuild consumers without source API lookups.
- Interrupt and restart reseeding without missing or regressing resources.
- Mutate an Account/plan during reseed; retained final state equals authoritative final state.
- Rebuilds do not reset product-owned or paid-plan state.

### A09 — Define deletion, retirement, and restore generations

**P1 before deletion/restore support · L · Domain owners · Dependencies: A08**

Add a versioned tombstone or complete-generation protocol without mutating published V1. Define retention across offline consumers, source restore/version rollback, consumer resynchronization, and PII removal. Retain the minimum authoritative deletion information necessary for recovery. Evidence: [Account V1 schema][accounts-contract], [initializer][initializer].

Acceptance:

- A consumer offline during deletion does not resurrect the resource on restart.
- A late tombstone does not overwrite a newer authorized recreation/version.
- Restoring a source behind consumer versions has a documented convergence procedure.
- Rebuilding replicated data never wipes consumer-owned business state; privacy erasure and tombstone retention are reconciled explicitly.

### A18 — Expose bootstrap completion and projection freshness

**P1 before authorization projections · M · Consumer owners · Dependencies: A05, A08**

Separate process health, required dependency reachability, initial data completeness, and acceptable data age. Define a captured stream boundary or generation protocol for initial catch-up. Specify pending/unavailable responses when local initialization has not completed. Evidence: [current readiness][consumer], [plan setter][plan-set].

Acceptance:

- A newly started projection cannot claim complete authorization data before its bootstrap boundary is applied.
- A missing feed differs operationally from an empty authoritative feed.
- Newly created Accounts have an explicit pending outcome until Plans catches up.
- An unacceptable stale permission projection fails closed for the operations requiring freshness.

### A19 — Add command, fact, or delta profiles only for a real use case

**P2, required before claiming those semantics · L · Owning domain · Dependencies: A04–A07, A17**

Define non-overlapping subjects, dedicated retention, inbox/idempotency, outcome semantics, and ordering requirements. Deltas require a baseline, base/next versions, and gap recovery. Commands require owner authorization, expiry, rejection/result correlation, and external-effect handling. Evidence: [existing streams][accounts-stream], [message-contract guide][domains-guide].

Acceptance:

- Snapshot compaction cannot capture and discard required facts/commands/deltas.
- Duplicate command delivery beyond the broker duplicate window executes the business effect once.
- Two consumers of a historical feed independently recover within its declared replay horizon.
- A missing/out-of-order delta is detected and repaired rather than silently applied.

### A26 — Add failure-oriented integration qualification

**P1 · L · Runtime/domain/delivery owners · Dependencies: working Docker-compatible runtime**

Extend current tests around actual broker/client/SQL boundaries. Keep routine domain checks separate from larger cluster qualification. Use production-equivalent stream policies; current relay fixtures mostly use simpler streams. Evidence: [relay tests][relay-tests], [initializer tests][initializer-tests].

Acceptance:

- Exercise PubAck loss after storage, crash before outbox deletion, crash after consumer commit, duplicate-window expiry, concurrent source updates, relay overlap, and source session loss.
- Exercise a three-replica stream with one node unavailable and storage pressure without silent current-state eviction.
- Exercise missing/deleted stream recovery, poison events, reseed interruption, and tombstones.
- Run all required domain/runtime `make ... check` targets successfully, then rehearse one GitOps release and rollback in a disposable cluster.

### A27 — Separate stream provisioning from relay availability

**P1 for fresh independent composition · M · Domain/platform owners · Dependencies: A10 design**

Provide a domain-owned provisioning/reconciliation command or Job that can run when the publisher is disabled. Classify safe mutable updates versus migrations; avoid competing old/new relay revisions rewriting stream configuration during rollout. Evidence: [stream updates on startup][relay-main].

Acceptance:

- Plans can start against the declared retained Account feed without running Accounts API/relay.
- An incompatible stream-policy change is rejected with a migration procedure, never handled by destructive automatic recreation.
- Old and new relay pods do not revert each other's stream settings.
- Stream retirement is separate from pausing workloads.

## Composition and identity

### A10 — Define module capabilities and reversible component profiles

**P1 · M · Architecture/domain owners · Dependencies: none**

Add a small declarative descriptor and composition overlays for required/optional components. Define pause, disable, retire, and erase. Include behavior and readiness changes alongside deployment selection. Avoid a generic runtime plugin framework. Evidence: [Plans Makefile][plans-make], [production inventory][inventory].

Acceptance:

- A composition can omit Plans or an unused relay without editing product source.
- A temporarily failed Plans service is not interpreted as intentionally disabled.
- Pausing/re-enabling a worker preserves work and converges.
- Removing a Flux object has a reviewed prune/data-retention outcome.

### A11 — Separate installation identity from business tenancy

**P1 for dedicated deployments · M · Platform/domain owners · Dependencies: A10**

Parameterize namespace, origin, identity issuer, URLs, stream/subject namespace, and installation inventory as needed. Choose the broker isolation model explicitly. Keep `account_id` as the business ownership key, not as a substitute for installation identity. Evidence: [Accounts stream][accounts-stream], [NATS topology][nats-topology], [domain Flux graph][accounts-flux].

Acceptance:

- Two installations coexist without stream, namespace, DNS, or event collisions.
- The same product code runs in both without hard-coded environment forks.
- Changing installation endpoints does not require changes to unrelated domain business code.
- Events cannot accidentally initialize data in the other installation.

### A12 — Complete a domain-owned authenticated product journey

**P1 · L · Product/Auth owners · Dependencies: A10, A14**

Build a thin product UI and define session/token handoff, safe return URLs, navigation, account context, and logout. Choose same-origin BFF versus separate-origin identity exchange deliberately. Evidence: [Auth UI][auth-ui], [bearer session exchange][session-route].

Acceptance:

- Browser signup/login leads to an authorized product operation without exposing the long-lived session token to JavaScript.
- Logout works and the remaining access-token lifetime is documented.
- Invalid return destinations and CSRF attempts are rejected.
- The product's primary page works when an unrelated domain/UI is offline.

### A13 — Make verification-key availability and rotation deliberate

**P1 · M · Auth/consumer owners · Dependencies: none**

Choose a bounded key-cache/background-refresh or trusted key-distribution strategy. Specify cold-start behavior during Auth outage and overlapping old/new verification keys. Replace the constant signing key ID on rotation. Evidence: [remote JWKS use][jwt-consumer], [single key ID][jwt-keys].

Acceptance:

- Previously authenticated work survives the documented Auth outage interval.
- Cold start during Auth outage behaves explicitly rather than unexpectedly failing first-user requests.
- A Secret-only rotation triggers a controlled rollout/reload; mixed replicas accept valid old tokens for the required overlap and new tokens promptly.
- Unknown/untrusted keys are never accepted as an availability fallback.

### A14 — Require a complete JWT and revocation profile

**P1 · M · Auth/consumer owners · Dependencies: none**

Define and validate issuer, intended audience/trust zone, algorithms, token type, expiry, subject shape, and appropriate issuance-time/lifetime rules. Document operator/session/membership revocation latency. Migrate issuers and consumers compatibly. Evidence: [Accounts authentication][authenticate], [token issuer][jwt-issue].

Acceptance:

- Reject missing expiry, wrong issuer/audience/type, malformed subjects, invalid algorithms, expired tokens, and excessive lifetimes as specified.
- Existing valid users migrate without an accidental sign-out wave beyond the planned policy.
- Ordinary users cannot call operator functions; operator removal takes effect within the declared bound.
- Auth dependency errors are observable separately from invalid credentials even where public responses deliberately coincide.

### A20 — Prove local tenant authorization in one product

**P1 · L · Product/Accounts owners · Dependencies: A09, A12, A18**

Build a small product-owned membership projection with atomic version checks and tenant-scoped queries. Decide whether RLS adds useful defense in depth and test with non-privileged application roles. Include background jobs and event handlers in the ownership model. Evidence: [current ownership model][accounts-sql], [domain guidance][domains-guide].

Acceptance:

- Cross-account read, update, delete, list, and async-work attempts are denied.
- Removing membership during consumer downtime follows the declared stale-authorization policy.
- Single-user and shared-account modes reuse the same ownership rules with different composition/UI.
- If RLS is enabled, pooled connections cannot leak tenant context and the application cannot bypass policies through elevated roles.

### A21 — Make feature defaults and catalog changes explicit

**P2 before editable paid plans · M · Plans/product owners · Dependencies: A10, A18**

Distinguish no-Plans configuration, unknown/uninitialized features, and temporarily stale known features. Add immutable plan revisions or a safe affected-account fan-out for feature catalog changes; never rely on editing SQL tables without event publication. Evidence: [plan setter][plan-set], [Plans schema][plans-sql].

Acceptance:

- Changing feature values for an existing plan republishes every affected account with correct versions.
- Repeating a no-op does not create misleading business changes.
- A product with Plans intentionally disabled uses its configured static policy.
- An outage cannot silently grant the unrestricted/default tier.

### A28 — Add retry-safe creation and bounded data access

**P2 before meaningful load · M · Accounts/domain owners · Dependencies: none**

Implement scoped HTTP idempotency for account creation, pagination and a leading member-user lookup index, relevant query timeouts, and feed-size measurements. Split large membership feeds only when measured sizes require it. Evidence: [account creation][account-create], [account listing][account-list], [membership schema][accounts-sql].

Acceptance:

- Retrying a create request with the same actor/key/body returns the same Account; conflicting body reuse is rejected.
- Pagination remains stable for equal names and concurrent inserts under the documented contract.
- Query plans and payload-size tests cover large shared organizations.
- Any future feed split retains independent bootstrap and deletion correctness.

### A29 — Complete the minimum identity lifecycle

**P2 before a real external-user product · L · Auth owner · Dependencies: A12, A14**

Choose supported recovery, credential addition/removal, session visibility/revocation, and operator-administration procedures. Do not implement PATs, machines, SSO, or invitations until the product profile needs them. Emit durable privileged-action audit records. Evidence: [Auth services][auth-services], [extension inventory][docs-guide].

Acceptance:

- Losing one authenticator has an explicit secure recovery outcome.
- A user can revoke a compromised credential/session within the supported model.
- Operator bootstrap and removal are auditable and bounded by the token policy.
- The product capability matrix distinguishes implemented flows from proposed extensions.

## Operations and governance

### A22 — Size NATS and workloads for retained state and catch-up

**P1 before adding more domains/load · M · Platform/domain owners · Dependencies: none**

Measure state count, bytes, update churn, concurrent schema feeds, tombstones, replay load, and outbox backlog. Expand the near-full aggregate stream budget deliberately. Add workload requests/memory limits and suitable placement/disruption settings. Evidence: [NATS budget][nats-config], [stream allocation][accounts-stream], [NATS topology][nats-topology].

Acceptance:

- Capacity worksheets account for replication placement and all configured streams.
- Stream-full and pod-memory pressure generate actionable alerts before business loss.
- One-node failure and catch-up remain within the declared latency budget.
- Outbox growth has an explicit capacity/rejection policy; accepted writes are not silently discarded.

### A23 — Complete the edge and public-endpoint policy

**P1 before public product exposure · M · Platform/Auth owners · Dependencies: none**

Implement direct-origin restriction, forwarded-header trust, a supported certificate availability plan, request-rate controls, security headers, and bounded UI-to-API fetches. Preserve existing origin/RP/user-verification checks and avoid blindly scaling a shared ACME writer. Evidence: [ingress overlay][ingress], [Auth UI fetches][auth-ui].

Acceptance:

- Direct origin access cannot bypass the intended edge policy.
- Spoofed forwarding headers cannot evade the rate-control identity.
- Challenge endpoint floods remain bounded without denying normal login flows.
- Certificate renewal, edge restart, upstream timeout, and security headers are tested.

### A25 — Add operational correctness signals and runbooks

**P1 · M · Platform/domain owners · Dependencies: A04/A05 interfaces**

Instrument oldest pending row, queue depth, publish outcomes, quarantines, bootstrap/freshness, stream capacity, consumer redelivery, and GitOps/image drift. Define a small set of service objectives and incident actions. Use low-cardinality metrics and separate business audit records. Evidence: [telemetry configuration][collector], [operations guide][operations].

Acceptance:

- A stalled relay/consumer is detected even when `/livez` is healthy.
- An operator can distinguish source commit, broker storage, and consumer application of a change.
- Alerts include a repair/recovery procedure and do not expose secret/personal payloads.
- Telemetry backend outage has a documented loss/queue policy independent of business event durability.

### A30 — Align documentation, ownership, and data lifecycle with actual support

**P2 · S/M · Architecture/domain owners · Dependencies: milestone decisions**

Replace the managed-database mandate with the accepted self-hosted policy. Add ownership records, executable capability profiles, minimal data classifications, feed retention/deletion policy, and a small set of architecture decisions. Keep optional extensions separate from implemented promises. Evidence: [roadmap][roadmap], [domain guide][domains-guide].

Acceptance:

- Documentation matches workflow paths, check names, deployment profiles, supported message types, and recovery commands.
- Each domain has an owner and declares provided/consumed contracts.
- User identifiers and other replicated fields have a reason, retention policy, and deletion procedure.
- No blanket claim of support for every regulated industry is made without product-specific requirements.

## Definition of the next stage

The next stage is reached when one complete product composition demonstrates independent domain release, a peer outage, safe component disable/re-enable, fresh bootstrap, state-feed recovery, tenant isolation, and stable digest rollback. Passing static checks and creating more folders alone does not meet this definition.


<!-- Repository evidence at audited commit; absolute links open in Codex. -->
[account-create]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/api/src/services/accounts/accounts.create.mjs:29
[account-list]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/api/src/services/accounts/accounts.list.mjs:18
[accounts-contract]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/contracts/src/events/accounts.account.snapshot.v1.mjs:26
[accounts-flux]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/domains/accounts.yaml:28
[accounts-sql]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/migrations/sql/V001__init.sql:17
[accounts-stream]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/outbox-relay/infra/base/streams.json:1
[auth-make]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/Makefile:8
[auth-services]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/services/passkeys/registration.mjs:1
[auth-ui]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/ui/src/passkeys.ts:1
[authenticate]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/api/src/platform/authentication.mjs:20
[automation]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/images/automation.yaml:1
[bootstrap]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/Makefile:10
[checks]: /Users/mircea/work/projects/mircea/aperitif/k8s/.github/workflows/pull-request-check.yaml:1
[collector]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/cluster/observability/overlays/prod-eu/collector-config.yaml:1
[consumer]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/accounts-projection/src/server.mjs:24
[contract-package]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/contracts/package.json:1
[docs-guide]: /Users/mircea/work/projects/mircea/aperitif/k8s/docs/README.md:1
[domains-guide]: /Users/mircea/work/projects/mircea/aperitif/k8s/docs/domains.md:1
[ingress]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/cluster/ingress/overlays/prod-eu/deployment.yaml:11
[initializer]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/accounts-projection/src/events/accounts.account.snapshot.v1.mjs:70
[initializer-package]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/accounts-projection/package.json:1
[initializer-tests]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/accounts-projection/test/events/accounts.account.snapshot.v1.test.mjs:16
[inventory]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/kustomization.yaml:1
[jwt-consumer]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/api/src/server.mjs:29
[jwt-issue]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/services/sessions/access-token.create.mjs:64
[jwt-keys]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/platform/jwt-keys.mjs:18
[nats-config]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/cluster/event-bus/base/nats.conf:7
[nats-topology]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/cluster/event-bus/overlays/prod-eu/statefulset.yaml:1
[operations]: /Users/mircea/work/projects/mircea/aperitif/k8s/docs/operations.md:1
[plan-set]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/api/src/services/plans/plan.set.mjs:24
[plans-make]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/Makefile:37
[plans-sql]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/migrations/sql/V001__init.sql:17
[policy]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/images/accounts.yaml:18
[publish]: /Users/mircea/work/projects/mircea/aperitif/k8s/.github/workflows/publish-images.yaml:1
[relay]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/runtime/outbox-relay/src/outbox.mjs:46
[relay-docker]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/runtime/outbox-relay/Dockerfile:1
[relay-headers]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/runtime/outbox-relay/src/outbox.mjs:90
[relay-main]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/runtime/outbox-relay/src/main.mjs:72
[relay-tests]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/runtime/outbox-relay/test/outbox.test.mjs:139
[roadmap]: /Users/mircea/work/projects/mircea/aperitif/k8s/docs/roadmap.md:1
[session-route]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/routes/v1/session/access-tokens.create.mjs:39
