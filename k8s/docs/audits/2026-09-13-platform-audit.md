# Aperitif architecture and delivery audit

## Assessment

**Keep the domain boundaries, transactional outbox, complete resource snapshots, and Flux digest resolution. The next stage should make their lifecycle guarantees executable.** A new broker, mandatory managed services, a universal domain framework, or a rewrite would not address the principal findings.

The implementation is a promising foundation for independently operated business domains. It is not yet a demonstrated plug-and-play SaaS blueprint: CI is undiscoverable in the checked-out repository layout; recovery and deletion of replicated state are unfinished; worker error handling can stall unrelated work; Auth remains an availability dependency; and there is no working product composition proving tenant authorization, UI integration, and optional capabilities together.

The [actionable backlog](2026-09-13-platform-backlog.md) contains 30 work items, grouped into milestones, with dependencies and acceptance criteria. Findings below distinguish **confirmed implementation defects**, **design limitations**, and **capabilities to implement before extending the platform**. No production incident is inferred from repository evidence.

## Scope and evidence

The baseline is commit `c32d4c3ee399a3cff71976436829223e5098b287`, inspected on 13 September 2026. The Git root is `/Users/mircea/work/projects/mircea/aperitif`; this platform lives in its `k8s/` subdirectory. Source, SQL, contracts, tests, workload manifests, platform configuration, documentation, and both workflow files were reviewed. The tree was clean before the audit.

Ephemeral production PostgreSQL and unauthenticated NATS application connections are accepted constraints, not findings. Recommendations work with self-hosted services. Recovering state feeds from whatever authoritative data remains is still essential. The existing roadmap's managed-database requirement should be rewritten to reflect this deployment policy.

Research covers the canonical SCS material, its architectural antecedents, transactional messaging, current NATS documentation, CloudEvents, contract description, PostgreSQL concurrency and tenant isolation, identity boundaries, Kubernetes operations, GitHub Actions, Flux, and telemetry. The source inventory records primary references and their applicability. It is a relevant evidence base, not a claim to enumerate every article ever written. Living documentation was checked on the audit date; features still need qualification against the versions actually deployed.

Live cluster state, remote branch protection, registry permissions, installed Flux CRDs, real image availability, vulnerability scan results, and production traffic were not inspected. Manifest rendering cannot establish those facts. Integration tests were attempted but could not start their containers; the validation appendix states the exact limits.

## 1. Architectural baseline

An SCS owns a business capability's data, logic, and user experience, and can execute its primary use cases while peers are unavailable. Asynchronous integration and local copies of needed data help achieve that. An SCS can internally contain multiple deployables; a separate pod is not automatically a separate SCS. These are architectural properties rather than a prescribed Kubernetes layout.[^1][^2]

The canonical FAQ separates global integration decisions from local implementation choices and recommends minimizing internal deployables initially. Its UI guidance allows links between autonomous applications; ROCA is a useful historical source for independently addressable pages and progressive enhancement, not a mandate to adopt every old authentication recommendation.[^2][^3]

### Current boundaries

| Boundary | Evidence and assessment |
| --- | --- |
| Auth | Owns users, credentials, sessions, operators, signing keys, and a UI. Internal UI-to-API calls are within this domain and are not cross-domain SCS violations. |
| Accounts | Owns account identity and human membership. Local database and transactional ownership creation are appropriate. No end-user account-management UI exists yet. |
| Plans | Owns plan assignment and effective features. Accounts observations initialize local plan records. It deliberately does not replicate full Account state. |
| Shared relay | Reusable infrastructure implementation deployed separately per domain. This is an appropriate shared technical library/runtime, provided its database contract evolves compatibly. |
| Shared cluster | Ingress, NATS, and telemetry remain common failure and capacity domains. That is an explicit cost/operability tradeoff, not proof of architectural failure. |

The event-carried state-transfer approach is well suited to local decision-making without synchronous lookups. It should not be confused with event sourcing: retained current snapshots are not historical evidence and cannot reconstruct every past action.[^4]

### What to preserve

[Account creation][account-create] commits the Account, initial membership, owner grant, and snapshot outbox row together. [Plan assignment][plan-set] locks the local plan, increments a resource version, and replaces an unpublished snapshot in the same transaction. [The initializer][initializer] creates the default assignment idempotently and emits its outgoing state in that transaction. These are sound ownership boundaries.

[Contracts][accounts-contract] validate a structured CloudEvent and its relationship to the resource ID; receivers also validate the actual NATS subject. Resource versions are distinct from wire schema versions. The documentation understands coalescing, V1/V2 coexistence, and why first-seen initialization differs from projection. Those choices should remain explicit.

### Autonomy is a lifecycle matrix

| Scenario | Current behavior or limitation | Required contract |
| --- | --- | --- |
| NATS temporarily offline | APIs can commit local work; relays accumulate backlog. Initial connection failures restart workers. | Bounded local backlog, operational alerts, successful eventual catch-up. |
| Accounts API offline, retained stream available | Plans can initialize from retained state without calling Accounts. | Preserve this behavior in an acceptance test. |
| Accounts relay never started, stream absent | Plans worker cannot create its consumer. Stream provisioning is tied to relay startup. | Domain-owned stream provisioning can run without the relay. |
| Plans projection disabled | Existing assignments remain usable; new Accounts have no local assignment, and the API returns Account-not-found. | Declare this capability unavailable or pending; do not silently invent entitlement defaults. |
| Auth API offline | JWT checks work only while suitable cached keys remain usable; login and token refresh require Auth. | Document the supported outage window and cold-start behavior. |
| A domain is removed from Flux inventory | Pruning can remove its workloads; shared stream data has a separate lifecycle. | Distinguish pause, disable, retire, and erase. |
| A second application instance shares the cluster/broker | Hard-coded namespaces, stream names, subjects, URLs, and image identities collide or require edits. | An installation boundary separate from business tenancy. |

A module descriptor should stay small: owner, provided capabilities, consumed contracts, required components, optional components, configuration, and lifecycle procedures. Generate or validate inventory from it only if that reduces real duplication. A runtime plugin registry is unnecessary. See items A10–A12.

## 2. Full event lifecycle

```mermaid
sequenceDiagram
    participant API as Source domain
    participant DB as Source PostgreSQL
    participant R as Domain relay
    participant JS as JetStream
    participant P as Consumer worker
    participant CDB as Consumer PostgreSQL
    API->>DB: BEGIN; mutation + version + outbox; COMMIT
    R->>DB: Lock queued row in transaction
    R->>JS: Find stream and last subject sequence
    R->>DB: Verify session still usable
    R->>JS: Publish stored JSON with ID and expected sequence
    JS-->>R: PubAck
    R->>DB: Delete row; COMMIT
    JS->>P: Deliver retained snapshot or subsequent update
    P->>P: Validate envelope and routing subject
    P->>CDB: Local mutation + outgoing outbox; COMMIT
    P-->>JS: Acknowledge
```

The outbox avoids the source mutation/publish dual-write gap. Broker acceptance and source-row deletion are still separate transactions, so duplicate delivery remains possible. Idempotency belongs in the consumer's business transaction; transport deduplication alone is insufficient.[^5][^6]

### 2.1 The current snapshot configuration is appropriate

[Accounts][accounts-stream] and [Plans][plans-stream] use file storage, three replicas, `retention: limits`, `max_msgs_per_subject: 1`, no age expiry, and `discard: new`. Importantly, `discard_new_per_subject: false` means the per-subject limit still replaces the older snapshot. It does **not** reject every update after the first message. The global byte cap rejects growth instead of silently evicting unrelated resources. NATS documents this distinction.[^7]

Keeping the latest representation independent of consumer presence supports consumers that arrive late. `Interest` retention would be inappropriate for this requirement: messages without interested consumers can disappear. `WorkQueue` represents one owner's work processing, not independent state replication to many domains.[^8]

The resource ID must remain in the routing subject because compaction is per subject. The source's monotonic version belongs in the payload, not in that subject. The V1 wildcard can coexist with a V2 family, but capacity must include both.

### 2.2 The relay guard is useful, but it is not a business ordering protocol

[Relay][relay] locks one row, discovers the stream and the current subject sequence, confirms its PostgreSQL session remains usable, and publishes with expected stream and last-subject sequence. It awaits publication before deleting the row. On failure it rolls back and the process exits.

The retained old-attempt race is handled deliberately: an older request sent after a newer publication carries an obsolete expected sequence and is rejected. A dedicated test models this, and another models database-session loss during the lookup. These tests are valuable, although they could not execute in this environment.

The guard compares broker sequence, not `data.version`. Its correctness therefore relies on source-side per-resource serialization and replacement of pending older snapshots. A fresh replay job that inserts stale data, or a future publisher that neglects those invariants, can pass a freshly read broker expectation. Keep the guard, document its scope, and test concurrent mutations, lost PubAck, and delayed attempts around every database boundary. NATS describes expected-state headers as optimistic concurrency controls.[^9]

For append-only messages, `ORDER BY queued_at, id` plus `SKIP LOCKED` does not prove per-aggregate order across transactions or workers. PostgreSQL permits queue workers to skip locked rows; `now()` represents transaction start, not commit order.[^10][^11] Add an explicit aggregate sequence and processing rule only for contracts requiring it. Do not advertise the current generic relay as ordered command/delta transport.

### 2.3 Poison rows and messages can block progress — A04/A05

A malformed header is intentionally tested to leave its outbox row queued. With the single replica and oldest-first scan, each restart selects that same row again. An oversized payload or non-retryable stream error can produce the same result. There is no attempt state, retry schedule, quarantine, or operator repair workflow. Other resource subjects in the domain can be starved.

The Plans worker throws on invalid JSON/schema/subject or database failure; its top-level loop exits. A fresh unnamed `LastPerSubject` consumer replays retained data again on restart. A permanently invalid retained representation can repeatedly interrupt bootstrap and subsequent progress. Merely setting a consumer retry limit would not fix a process that continually creates a fresh consumer.

Persist a minimal failure record with message ID, routing subject, reason code, attempt metadata, and a controlled repair/re-drive mechanism. Keep transient dependency failures distinct from invalid data. Quarantine must preserve the message before acknowledging or terminating it, and must mark an affected authorization projection as untrusted rather than quietly serving stale grants. For ordered deltas, block the affected aggregate until the missing step is repaired; do not let a later delta jump the gap. NATS retry limits and advisories are mechanisms, not an automatic dead-letter service.[^12]

### 2.4 Broker latency reaches source writes — A06

The relay keeps its row lock and database transaction open through stream lookup and the publish round trip. A concurrent plan mutation's `DELETE ... WHERE subject = ...` can wait for that row. Thus the API does not directly call NATS, but a slow relay can still delay that resource's writes. The five-second publication timeout does not bound all SQL, connection, and management operations.

Keep the safe simple protocol initially. Add explicit database connection/query/lock bounds, measure lock waiting, and enforce a shutdown deadline. If measurements justify greater independence, design a claimed/versioned outbox or per-resource publishing scheme with fencing before shortening the transaction. Moving publication outside the lock without a replacement correctness argument would reopen the stale-snapshot race. Batch and parallel optimization should follow failure testing, not precede it.

### 2.5 Transport input restrictions are documented but unenforced — A07

The relay copies every stored header. The database checks only that `headers` is an object; it does not require string values. Documentation prohibits producer-controlled `Nats-*` fields, but the runtime does not enforce that rule. Some reserved headers affect routing expectations, rollup, or retention. Current streams do not enable every such feature; this is not evidence that existing data has been purged.[^9]

Validate the generic transport boundary independently of the domain schema: concrete publish subject, string header values without line breaks, reserved-name rejection, serialized byte budget, and explicit content type. Keep the relay payload-agnostic. Validate early in producers and defensively at the relay; do not coerce malformed persisted rows.

### 2.6 Recovery must include reseed, deletion, and restore generations — A08/A09

[Operations][operations] explicitly states that no reseed Job exists. After losing a stream, its recreation produces an empty feed. Already published outbox rows were deleted, and unchanged resources will not reappear on their own.

Implement a resumable one-shot reseed command for each state producer. Read each current resource under the same consistency/locking rules as normal mutation; enqueue a complete current representation, preserve resource version, use a new CloudEvent ID, and never let a long-running scan overwrite a newer pending row. A keyset cursor and per-resource transaction are preferable to one enormous transaction. Re-running the command must be safe.

Neither V1 schema represents deletion. Physically removing a retained message does not instruct an existing local projection to remove its copy; retaining the last live snapshot can resurrect a deleted resource during bootstrap. Define a new supported tombstone contract, or a complete generation-replacement protocol, before adding account deletion. Tombstones need a retention/consumer-offline contract and must remain recoverable from the authoritative domain. Plans must not create a default plan when first observing a deleted Account.

Restoring source data to an older version introduces another issue: a consumer with version 12 correctly ignores a restored source's version 9. Replaying version 9 forever will not converge. Either coordinate a clean rebuild of affected replicated tables, preserve a monotonic version floor, or introduce a deliberate new source generation with an explicit consumer reset. Never reset product-owned assignments just because a projection is rebuilt. JetStream backups complement this protocol; they do not replace it.[^13]

### 2.7 Consumer configuration and initial readiness — A05/A18

One unnamed `LastPerSubject` consumer is defensible for a small, replayable snapshot feed. It is not inherently a bug. It trades simple recovery for repeated full bootstrap, consumer churn, and startup load. Default rolling updates can briefly run two pods even with `replicas: 1`; each creates its own consumer. The initializer's `ON CONFLICT DO NOTHING` protects assignment creation, but overlapping bootstrap still costs work.

Readiness currently checks PostgreSQL and a NATS flush, not whether the required feed has been processed. Flush does not establish stream health or projection completeness. Define a bootstrap checkpoint and freshness signal separately from liveness. For future authorization replicas, avoid equating “no backlog at this instant” with a complete, consistent domain snapshot. Track a captured feed boundary or generation manifest and applicable resource versions.

A durable pull consumer can reduce restart replay and share work between replicas, but does not remove the need for idempotency or bootstrap procedures. Choose explicit ack wait, maximum pending work, inactivity policy, and retry handling appropriate to handler duration. Consumer delivery policy is applied when the consumer is created.[^14]

### 2.8 Implemented versus future messaging profiles

| Profile | Outbox | Stream and consumption | Business guarantee still required |
| --- | --- | --- | --- |
| Current snapshot | Coalesce only older pending state for the same resource/schema | Latest per subject; independent replayable consumers | Monotonic replacement, deletion, reseed, freshness |
| Historical fact | Keep each occurrence | Append-only Limits stream; durable position per consumer; explicit retention window | Inbox deduplication; ordering only where meaningful; archive if required |
| Delta | Never discard a required intermediate change | Baseline plus complete ordered continuation | Base version, next version, gap detection, resync procedure |
| Command | Keep every distinct requested action | Owner-directed subjects; durable work consumer; WorkQueue where one processing owner is intended | Command ID, authorization, expiry, idempotent outcome, rejection/result contract |

Only the first profile is implemented in business domains. The relay test demonstrates JSON command transport, not a complete command lifecycle. Future subject families must not overlap the broad existing state selectors. For example, simply putting an occurrence-specific event under `accounts.account.*.*` could accidentally retain only one fact per subject. Allocate explicit profile families and test each subject against its owning stream.

A broker PubAck means accepted transport, not accepted business work. A future command should have a durable outcome such as completed, rejected, expired, or canceled. A command inbox and business mutation should commit together; any result should enter a local outbox. A retry after the broker duplicate window must not repeat the action. External effects need the downstream provider's idempotency support or reconciliation. Use a saga only when a real cross-domain operation needs explicit progress and compensation.[^6][^15][^16]

### 2.9 Alternative implementations and when they would help

| Option | Benefit | Cost or limitation | Recommendation for this starter |
| --- | --- | --- | --- |
| Current polling outbox | Small operational footprint, easy domain ownership, works with the existing tables | Poll latency, per-message round trips, lock coupling | Keep and qualify before optimizing. |
| Claimed/batched outbox | Can reduce lock duration and improve catch-up throughput | Requires ownership/fencing, recovery of claims, and a new stale-publication argument | Prototype only when measured throughput or mutation latency warrants it. |
| Change-data capture of an outbox | Can consume committed database changes without application polling | Connector/offset operations, database-log retention, and a qualified NATS delivery path | A future option; not a drop-in repair for the current gaps. |
| JetStream Key-Value | Key/watch/CAS and deletion operations fit some current-state uses | Does not atomically commit with the source PostgreSQL mutation, and does not define domain deletion/restore semantics | Consider for a new feed only if the simpler key API is valuable. |
| Mandatory append-only event sourcing | Retains domain history for reconstruction and temporal use cases | Requires a different source-of-truth and schema/replay discipline | Do not introduce solely to support plug-and-play domains. |

Debezium documents an outbox router that reads a designated outbox table and routes by aggregate metadata. Its documented Kafka-oriented transformation is useful implementation research, not proof that this repository has a supported Debezium-to-NATS path.[^33] The current coalescing/deleting table behavior would also require deliberate qualification against the chosen capture pipeline.

NATS KV provides a current-key abstraction backed by JetStream, including watches and update/delete operations.[^34] Replacing an explicit snapshot stream with KV would not remove the source outbox, business versioning, authorization freshness, or recovery obligations. The recommendation to retain the current approach follows from this repository's small scope and existing correctness work, not a general claim that polling is superior.

## 3. SaaS breadth and application composition

### 3.1 Separate user, account, application installation, and isolation boundary

`user_id` identifies a person; `account_id` identifies ownership; a Kubernetes namespace identifies an operational scope. None automatically defines all forms of tenancy. The account model permits useful B2C and B2B compositions without forcing business data into Auth.

A starter should provide three executable examples: a user-owned single-user product; a shared Account product with local membership authorization; and a dedicated installation using the same product code. Kubernetes namespace isolation and database row isolation are separate mechanisms. PostgreSQL RLS can add defense in depth for shared tables, but table owners and privileged roles can bypass it; it must be tested with real application roles.[^17][^18][^19]

The current Accounts list query correctly limits results to the caller's memberships. This audit found no demonstrated cross-tenant access in that endpoint. There is no product-domain resource API proving tenant boundaries on reads, writes, background jobs, and events. That is a missing reference implementation, not evidence that all current APIs leak data.

### 3.2 Optional components need defined product behavior — A10/A11

Plans is optional in prose, but no composed product demonstrates “Plans disabled,” “Plans temporarily offline,” and “Plans not yet caught up” as distinct states. A product may use a static feature map when Plans is intentionally disabled. It should not use that fallback automatically during an outage, where doing so could grant or revoke the wrong capabilities.

A component toggle must govern deployment, required configuration, readiness, user navigation, and behavior together. Keep a local authoritative API independent of its relay where its use cases allow that. Treat migrations as required for that database schema, not arbitrarily removable middleware. Pausing a relay preserves queued work; retiring a domain requires deciding what happens to its subjects and consumers.

For dedicated installations, parameterize installation identity, namespaces, origins, issuer, service discovery, and stream/subject namespace. Keep business `account_id` distinct. Explicitly choose whether each installation has a separate broker account/server or a shared installation-prefixed subject space, without adding NATS authentication as a prerequisite to this audit's scope.

### 3.3 Finish a real UI-to-product journey — A12

[Auth UI][auth-ui] creates a secure HttpOnly cookie; [the session API][session-route] expects a bearer session credential. The UI has no token-exchange endpoint, product handoff, logout flow, or account/product navigation. Browser JavaScript cannot read that cookie to construct the bearer header. The current end-to-end tests stop after signup/login cookie creation.

Build one complete flow: login, safe return to a product page, authenticated account selection or implicit single-account context, a product operation, and logout. A same-origin domain BFF is one option; separately hosted domains may need a standards-based redirect exchange. Define the trust boundary before sharing a root-path session cookie across independently operated UIs. Keep menus optional and links independently usable; do not require a central frontend release for every domain change.

### 3.4 Authorization freshness is an explicit tradeoff — A13/A14

[Accounts][jwt-consumer] and Plans use `createRemoteJWKSet` with default caching. Inspection of the installed `jose` implementation confirms a ten-minute cache freshness default and a network reload when stale. Cold starts and expired caches therefore call Auth in the request path; unknown keys can also trigger lookup. This limits the claim that other domains work while Auth is offline.[^20]

Define an outage policy: bounded cached public keys with background refresh and an emergency revocation strategy, or distribution of a trusted key bundle through the installation configuration. Never accept an unknown key merely to preserve availability. New login and token refresh remain identity-provider operations unless a wider session design explicitly changes that dependency. With current five-minute access tokens, continued authenticated use is also bounded by each token's remaining lifetime; a ten-minute key cache does not grant ten minutes of usable access.

[JWT creation][jwt-issue] produces five-minute tokens, but verifiers do not require expiry, issuer, audience, token type, or a UUID-compatible subject. A local probe with an ephemeral signing key confirmed that Accounts accepts a correctly signed token with no expiry, unrelated issuer/audience, and `sub: not-a-uuid`. This assumes a trusted signing key; it is not a cryptographic bypass. Make the accepted token profile explicit before multiple applications or token classes share trust.[^21]

[Signing-key configuration][jwt-keys] exposes one key with constant `kid: k1`. Add overlapping verification keys and a new key ID per rotation; keeping the same ID can leave consumers using an old cached key. Keys are read once at startup, so changing the mounted Secret alone does not update the in-memory signer or JWKS. Rotation must trigger a controlled rollout or implement an explicit reload, and must account for mixed old/new Auth replicas. Operator revocation currently takes effect when the five-minute access token expires, not immediately when a session or operator row changes. Future projected membership revocation adds propagation delay. Record the allowed revocation/freshness budget per operation, and fail closed where that budget is exceeded.

### 3.5 Current domain capabilities are intentionally narrow

The only generic role is `owner`; invitations, machine identities, additional passkeys, recovery, and product roles mostly remain proposed extensions. No paid plan catalog is seeded: the implementation seeds `free`; tests create `pro` fixtures. This is acceptable for a foundation but should be explicit in its capability matrix.

Plans exports resolved feature values, a good product-agnostic interface. However, [the setter][plan-set] increments a version only when `plan_id` changes. Future catalog updates to `plan_features` would not automatically republish all affected accounts. Add a domain-owned catalog-change/fan-out path or immutable plan revisions before exposing editable plan definitions. Preserve the current narrow scope until that requirement exists.

Accounts creation lacks an HTTP idempotency key, so retries can create multiple accounts. Listing has no pagination and lacks a leading `user_id` index on membership. These are straightforward starter improvements; add them before meaningful volume. A complete membership array in every snapshot will also grow with large B2B organizations. Measure serialized sizes and consider a separate member-state feed when needed, with its own tombstones and completeness rules.

## 4. CI/CD and GitOps

### 4.1 Workflow location and filters block the intended pipeline — A01

Both [workflow files][publish-workflow] are tracked under `k8s/.github/workflows`. There is no repository-root `.github/workflows` directory. GitHub discovers workflow files at the repository root, so these files do not currently establish the promised automation.[^22]

Moving them alone is insufficient: their filters match `domains/**` and `platform/runtime/**`, but actual changed paths start with `k8s/`. Their matrix directory depths also assume no prefix. Make the root workflow placement, change filters, path-depth handling, build contexts, and commands consistent in one change. Flux already points to `./k8s/...`; do not remove that prefix unless the Git root itself changes.

### 4.2 Checks need a reliable stable gate — A02/A03

The PR workflow selects domain/runtime units, but omits shared cluster and Flux inventory changes. Its matrix uses variable job names and no always-running aggregate gate. The roadmap says to require `pre-merge / check`, which is not the current workflow/check naming. No remote branch rules were verified.

The Auth `check` target requires standalone Kustomize, KSOPS, and an Age decryption key for a local Secret generator. CI installs Node and kubectl only. This is a second failure waiting behind the path fix. Render a temporary CI composition with generated disposable signing material or sanitized Secret placeholders; validate encrypted overlay structure separately. Do not distribute production decryption keys to pull-request jobs.

Publishing has no dependency on a successful domain check on the pushed revision. Protected merges can supply part of that assurance, but the current repository does not enforce it. Add checks before promotion or explicitly verify that the candidate commit has the required successful checks. Include workflow edits in their own validation path, and handle deleted/renamed units without trying to build removed directories.

### 4.3 Digest tracking itself is correctly configured

The [ImagePolicy][image-policy] filters exactly `latest`, uses `digestReflectionPolicy: Always`, and refreshes every five minutes. [ImageUpdateAutomation][image-automation] writes digest setters back to master under `./k8s/domains`. This is the intended Flux mechanism for detecting a changed digest behind an unchanged tag.[^23][^24]

The intended publish sequence is also sound at the image level: build a SHA tag, include provenance/SBOM, scan the built digest, then promote that digest to `latest`. Keep it. Pinning a digest in manifests provides deployment identity; `imagePullPolicy: Always` alone would not cause existing pods to restart when a tag changes.

All nine first-party repositories have policies; ten overlay digest references exist because Accounts and Plans share the relay image. Every initial digest is all zeroes. Bootstrap needs an explicit initial image seeding and Flux writeback step before dependent workloads can become ready. The inventory alone does not prove that images are pullable or that bootstrap-generated controller resources are committed.

### 4.4 Independent promotion can deploy an incomplete domain change — A15/A16

Each changed workload builds, scans, and promotes inside an independent matrix job. If API succeeds while migrations fail their scan, the API can become latest independently. Flux `dependsOn` waits for dependency readiness; an old successful migration Job can satisfy that check while the new migration image has not been promoted. It is not a cross-image release transaction.[^25]

Prefer expand/contract migrations that tolerate either rollout order. Promote compatible artifacts only after all required builds/scans for that domain pass. Where a release truly requires a matching migration, use an explicit release/schema marker and dependency expression, or stage the schema rollout first. Per-domain coordination is enough; do not impose an application-wide lockstep release.

`queue: max` is valid current GitHub syntax and is not a finding. Its queue is bounded, and ordering follows waiting order rather than Git ancestry.[^26] Rerunning an older workflow can still promote an older SHA to latest. Add a promotion guard that prevents regression and a controlled rollback path. A manually reverted digest can otherwise be rewritten by image automation; rehearse suspending the relevant automation or deliberately restoring the selected release digest/channel.

Flux directly reconciles infrastructure changes from Git. A stream ConfigMap or database configuration change can therefore precede an image release too. Expand/contract applies to configuration and wire contracts as well as SQL. Observe reconciled revision and application-level success, not just green pods.

### 4.5 Contract packages and shared runtime releases — A17

Domain workloads import published `@mstaicu/*-contracts` packages. Editing a local contracts directory neither changes installed workload dependencies nor triggers the image workflow, which only watches workload/runtime paths. Current workload tests therefore do not automatically exercise unpublished contract edits.

Keep explicit package versions to preserve consumer independence. Add a package release path, pack-and-install compatibility tests for candidate contracts, and dependency-update PRs for actual adopters. Publish before building consumers that reference the new version. Emit portable schema/example artifacts so another language can consume a feed without adopting Node or TypeBox. AsyncAPI can describe the channel/operation catalog; it is optional documentation tooling, not a routing framework.[^27][^28]

Both domains follow one relay latest policy, so a shared relay change rolls out to both. Require backward compatibility with every supported outbox schema and stream configuration. If domains need genuinely independent runtime upgrade timing, add explicit release channels or per-domain adoption without abandoning digest resolution.

### 4.6 Supply-chain and release observability — A24

Third-party Actions use mutable version tags; GitHub recommends full commit pins for immutable action references.[^29] Base/runtime images are version-tagged but not digest-pinned, so a repeat build can resolve different inputs. Add automated dependency update review, immutable action references, pinned build inputs, and source-revision image metadata.

The existing scan is useful but covers first-party built images only; `ignore-unfixed: true` also means the gate is not a report of every known vulnerability. Retain scan output/SBOM and deliberately cover upstream NATS, PostgreSQL, Flyway, ingress, and telemetry images. Signing/admission verification can remain policy-driven; the immediate need is a dependable evidence trail and rollback drill.

## 5. Cluster reliability, privacy, and operations

[NATS topology][nats-topology] uses three servers, distinct-node placement in production, persistent storage, disruption protection, and a graceful lame-duck hook. Preserve these. It requires at least three schedulable nodes; replicas on distinct nodes do not by themselves demonstrate zone or disaster independence.[^30]

Each stream reserves 400 MiB with three replicas. Each server has about 819.2 MiB of file budget, so the two fully replicated streams total 800 MiB, leaving only about 19.2 MiB of logical budget for more replicated streams. The filesystem has additional headroom, but that does not increase the configured JetStream budget. New domains need capacity admission and measured resource counts/sizes. Use storage and process-memory alerts separately.

NATS and most domain application pods lack CPU/memory resource requests/limits. In this manifest set those pods can be BestEffort, absent admission defaults. Derive requests and memory limits from load testing, including bootstrap storms and backlog drains. Add application-specific disruption/placement settings where multiple replicas are safe. Kubernetes QoS affects eviction behavior; a replica count alone is not a resilience specification.[^31]

Application NetworkPolicies generally express scoped dependency access and disable automatic service-account tokens, which is positive. Auth's ingress explicitly names Accounts and Plans, so a new direct JWKS consumer needs a provider-side policy edit. Make allowed installation-level consumers declarative or distribute verification keys locally. CNI enforcement, node-local DNS, and actual reachability must be tested in a disposable cluster. This audit does not ask for NATS authentication.

The edge has read/idle/header bounds and avoids logging query values. It lacks an implemented direct-origin restriction and forwarded-header trust configuration; certificate storage is a single writable deployment concern. Do not scale the existing ACME writer blindly. Complete the declared edge deployment policy and test trusted client IP handling before using it for abuse controls.

Public passkey option endpoints create database challenge records. No explicit request-rate policy was found in the application or ingress manifests. Add per-source and per-principal abuse controls, relevant body limits, timeouts on Auth UI fetches, and security headers. The WebAuthn verifier already checks expected origin, RP ID, and user verification; preserve that. Credential lifecycle and security audit events belong in Auth, not in a generic Account role framework.

OpenTelemetry tracing is deliberately propagated through outbox headers and consumer work. The collector adds Kubernetes metadata; the agent collects logs and metrics. Missing operational signals include oldest pending row, failed/quarantined messages, publication failure reason, consumer/bootstrap state, reconciliation drift, and retained-state completeness. Avoid raw resource IDs as metric labels. Use audit records for privileged business actions: sampled traces are not an audit ledger. Collector persistent queues can protect telemetry during backend outages if that durability becomes required.[^32]

Full Account membership snapshots replicate user identifiers even to Plans, which only needs account identity for initialization. Evaluate the smallest feed each consumer needs as the model grows. Define data classification, export/deletion propagation, and retention independently of industry-specific compliance claims. A general SaaS blueprint can provide these mechanisms; it cannot claim suitability for every regulated industry without product-specific requirements.

## 6. Recommended next-stage design

The smallest useful target is a **tested composition**, not a larger abstraction layer:

1. Repair CI discovery and run stable changed-unit gates; keep build/scan/promote plus Flux digest setters.
2. Implement bounded relay/consumer failure handling, recovery, deletion, and lifecycle procedures.
3. Make identity validation and key distribution support the declared outage behavior.
4. Add one thin product domain with its own UI, local authorization projection, and optional Plans integration.
5. Exercise the same product in single-user, shared-account, and dedicated-installation profiles.
6. Prove independent upgrade, pause/resume, disable/re-enable, replay, and rollback with deliberate failures.

Keep APIs and workers separate when they need different scaling or failure isolation. Allow an API and UI to share a process when that is simpler for a domain. Keep PostgreSQL, NATS, and Kubernetes choices configurable at installation boundaries rather than hidden behind a mandatory framework. Use commands, deltas, archives, sagas, metering, billing, and machine identities only as concrete product use cases demand them.

The backlog defines completion criteria for these steps. A later architecture audit should assess observed recovery and deployment behavior against those criteria, rather than count services or configuration files.

## Validation appendix

| Check | Result |
| --- | --- |
| `make -C platform/cluster/event-bus check` | Passed local and production rendering. |
| `make -C platform/cluster/ingress check` | Passed CRD/local/production rendering. |
| `make -C platform/cluster/observability check` | Passed configured rendering, including the local generator; output discarded. |
| Domain overlays rendered independently | 27 passed; Auth's local Secret-generator overlay excluded from this separate rendering pass. |
| `kubectl kustomize clusters/prod-eu` | Passed; output discarded. |
| Accounts contracts | Three tests passed; declaration build passed. |
| Plans contracts | Three tests passed; declaration build passed. |
| Accounts, Plans APIs and relay | Lint/type checks passed through their required Make targets; integration tests failed at container setup. |
| Auth required Make target | Initial dependency fetch failed; network-enabled retry installed dependencies and passed lint/types, then tests failed at container setup. |
| Plans Accounts initializer | Lint/types passed; both integration tests failed at container setup. |
| JWT profile probe | Confirmed acceptance of a locally signed token with missing expiry and unrelated issuer/audience; no token or key displayed. |
| Auth UI `npm run check` | Passed TypeScript checking independently. |
| Browser journey, image build/scan, cluster failure drills, actual Flux reconciliation | Not executed. |

The Docker endpoint was absent, and the installed Docker application could not launch because its executable was missing. Testcontainers reported `Could not find a working container runtime strategy`; these are environment failures, not failed business assertions. The expected intentional `JetStreamNotEnabled` failure-path assertion was not reached. Rerun all domain/runtime checks and lifecycle tests with a working Docker-compatible runtime before treating the implementation as validated.

Rendered Secret values were never displayed or retained in the report. No Secret was decrypted in place. The audit added documentation only and made no deployment, source-code, workflow, or database changes.

## Sources

Dates below are publication/version dates when stated; otherwise the source is living documentation accessed 13 September 2026. References support the architectural and platform semantics; repository-specific failure scenarios and recommendations are the audit's analysis.

[^1]: INNOQ/SCS community. [Self-contained Systems: characteristics](https://scs-architecture.org/). Canonical definition; living source.
[^2]: INNOQ/SCS community. [SCS FAQ](https://scs-architecture.org/faq.html). Bounded contexts, macro/micro architecture, internal deployables, and UI integration.
[^3]: ROCA community. [Resource-oriented Client Architecture](https://roca-style.org/). Historical frontend principles; selected ideas, not wholesale authentication guidance.
[^4]: Martin Fowler. [What do you mean by “Event-Driven”?](https://martinfowler.com/articles/201701-event-driven.html), 7 February 2017. Event notification, state transfer, event sourcing, and disguised commands.
[^5]: Chris Richardson. [Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html). Atomic source write and duplicate-publication boundary.
[^6]: Chris Richardson. [Idempotent Consumer](https://microservices.io/patterns/communication-style/idempotent-consumer.html). Transactional inbox/business deduplication.
[^7]: NATS. [Shaping the stream](https://docs.nats.io/learn/jetstream/shaping-the-stream). Global and per-subject discard behavior.
[^8]: NATS. [Retention policies](https://docs.nats.io/learn/jetstream/retention-policies). Limits, Interest, and WorkQueue semantics.
[^9]: NATS. [JetStream API Headers](https://docs.nats.io/reference/jetstream/api/headers). Expected-state guards and reserved publication controls.
[^10]: PostgreSQL Global Development Group. [PostgreSQL 18 SELECT](https://www.postgresql.org/docs/18/sql-select.html). Row locking and SKIP LOCKED.
[^11]: PostgreSQL Global Development Group. [PostgreSQL 18 Date/Time Functions](https://www.postgresql.org/docs/18/functions-datetime.html). Transaction timestamp semantics.
[^12]: NATS. [Ack responses and redelivery](https://docs.nats.io/learn/jetstream/acknowledgment). Retry timing, termination, and maximum-delivery advisories.
[^13]: NATS. [Backup & Recovery Deep Dive](https://docs.nats.io/learn/backup-recovery/). Backup/restore as a distinct operational responsibility.
[^14]: NATS. [Stream and consumer policies](https://docs.nats.io/learn/jetstream/policies). Delivery start positions and configuration lifecycle.
[^15]: NATS. [Publishing](https://docs.nats.io/learn/jetstream/publishing). PubAck and finite message-ID deduplication window.
[^16]: Chris Richardson. [Saga](https://microservices.io/patterns/data/saga.html). Explicit cross-service progress and compensation.
[^17]: OWASP API Security Project. [API1:2023 Broken Object Level Authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/), 2023. Object-level permission checks.
[^18]: PostgreSQL Global Development Group. [PostgreSQL 18 Row Security Policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html). RLS capabilities and privileged-role bypass.
[^19]: Kubernetes contributors. [Multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/). Namespace and control/data-plane isolation choices.
[^20]: Filip Skokan / jose. [createRemoteJWKSet](https://github.com/panva/jose/blob/main/docs/jwks/remote/functions/createRemoteJWKSet.md). Remote verification-key resolution; cache timing additionally verified in the locally installed implementation.
[^21]: IETF, Sheffer, Hardt, Jones. [RFC 8725: JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725.html), February 2020. Issuer/audience validation and token-type separation.
[^22]: GitHub. [Workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows). Repository-root workflow discovery.
[^23]: Flux contributors. [Image Policies](https://fluxcd.io/flux/components/image/imagepolicies/). Mutable-tag digest reflection.
[^24]: Flux contributors. [Image Update Automations](https://fluxcd.io/flux/components/image/imageupdateautomations/). Git writeback and setter scope.
[^25]: Flux contributors. [Kustomization](https://fluxcd.io/flux/components/kustomize/kustomizations/). Readiness dependencies, readyExpr, pruning, and immutable Job recreation.
[^26]: GitHub. [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax). Current queue:max support, bounded queuing, and execution ordering.
[^27]: CloudEvents authors/CNCF. [CloudEvents specification v1.0.2](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md). Event metadata; not an ordering or command-processing protocol.
[^28]: AsyncAPI Initiative. [AsyncAPI specification 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0). Machine-readable channels, messages, and operations.
[^29]: GitHub. [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use). Immutable action references and safe workflow inputs.
[^30]: NATS. [Surviving node loss](https://docs.nats.io/learn/jetstream/surviving-node-loss). Storage/replication and quorum failure boundaries.
[^31]: Kubernetes contributors. [Pod Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/). Requests/limits and eviction behavior.
[^32]: OpenTelemetry authors. [Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/). Queues, retry, and persistence.


[^33]: Debezium authors. [Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html), documentation 3.6 at access. CDC/outbox routing alternative.
[^34]: NATS. [Key-Value Store](https://docs.nats.io/learn/key-value/). Alternative key/watch interface over JetStream.

<!-- Repository evidence at audited commit; absolute links open in Codex. -->
[account-create]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/api/src/services/accounts/accounts.create.mjs:29
[accounts-contract]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/contracts/src/events/accounts.account.snapshot.v1.mjs:26
[accounts-stream]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/outbox-relay/infra/base/streams.json:1
[auth-ui]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/ui/src/passkeys.ts:1
[image-automation]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/images/automation.yaml:1
[image-policy]: /Users/mircea/work/projects/mircea/aperitif/k8s/clusters/prod-eu/images/accounts.yaml:18
[initializer]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/accounts-projection/src/events/accounts.account.snapshot.v1.mjs:70
[jwt-consumer]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/accounts/workloads/api/src/server.mjs:29
[jwt-issue]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/services/sessions/access-token.create.mjs:64
[jwt-keys]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/platform/jwt-keys.mjs:18
[nats-topology]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/cluster/event-bus/overlays/prod-eu/statefulset.yaml:1
[operations]: /Users/mircea/work/projects/mircea/aperitif/k8s/docs/operations.md:1
[plan-set]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/api/src/services/plans/plan.set.mjs:24
[plans-stream]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/plans/workloads/outbox-relay/infra/base/streams.json:1
[publish-workflow]: /Users/mircea/work/projects/mircea/aperitif/k8s/.github/workflows/publish-images.yaml:1
[relay]: /Users/mircea/work/projects/mircea/aperitif/k8s/platform/runtime/outbox-relay/src/outbox.mjs:46
[session-route]: /Users/mircea/work/projects/mircea/aperitif/k8s/domains/auth/workloads/api/src/routes/v1/session/access-tokens.create.mjs:39
