# Event-path qualification — 13 September 2026

## Verdict

The implemented Accounts → Plans snapshot path is a sound minimal design for its current scope. Keep the domain-owned transactions, contract packages, generic relay, and JetStream latest-per-subject streams. This qualification found no reproduced correctness defect in those supported flows. It does **not** certify every possible event, command, projection, deployment failure, or disaster scenario.

This conclusion uses implementation inspection, primary external references, existing executable checks, and a new composed integration test. Repository documentation describes intended behavior; it is not the authority for deciding whether that behavior is correct. This report supersedes the earlier audit's inability to execute Docker tests. Ephemeral production PostgreSQL, unauthenticated application NATS connections, repository nesting, and coordinated release ordering remain outside the requested concerns. Staged expand-contract remains the assumed deployment discipline.

## Executed evidence

Qualified checkout: `c32d4c3ee399a3cff71976436829223e5098b287`. Production source was not changed. Test environment: Node 26.8.1, Docker Engine 29.7.2, NATS `2.14.5-alpine3.22`, PostgreSQL 18, Flyway 13.3.0, installed lockfile dependencies.

| Check | Result |
|---|---|
| `make -C domains/accounts check` | Passed: API integration, 3 contract tests, lint, type checks, contract build, local/production manifests |
| `make -C domains/plans check` | Passed: API integration, 3 contract tests, 2 projector tests, lint, type checks, contract build, manifests |
| `make -C platform/runtime check` | Passed: lint, type checks, all 5 relay tests |
| `make -C platform/cluster/event-bus check` | Passed: both manifest overlays render |
| `node --test docs/audits/event-path.qualification.mjs` | Passed: 7 composed scenarios plus enclosing test; 8 reported tests, zero failures |
| Installed contract source versus local contract source | Identical for Accounts API, Plans API, and Accounts projector imports |
| Feature values `NaN`, `Infinity`, `-Infinity` | Rejected by the installed TypeBox-backed builder |

The composed harness uses the actual `nats.conf`, its original route DNS names as Docker network aliases, and both unmodified domain stream JSON files. It starts three brokers and verifies the streams have three replicas with two current followers. It migrates separate Accounts and Plans databases using the existing fixtures. It calls the production producer, relay, and projection implementations and also launches the actual projector entry point as a child process.

Its seven scenarios verify:

1. An injected outbox insertion failure rolls back the Account, membership, ownership, and outbox together.
2. Account creation → outbox → replicated ACCOUNTS → pull consumer → Plans transaction/outbox → replicated PLANS. An injected Plans outbox failure rolls back initialization; replay after successful commit does not create another output.
3. Three unpublished plan changes coalesce to one pending version; publishing replaces the retained snapshot despite `discard: new`.
4. Publication succeeds but its acknowledgement is artificially lost: SQL retains the row; a fresh relay invocation retries with the same ID and JetStream deduplicates it.
5. The actual projector process initializes a previously retained Account; restart/replay preserves a subsequently selected paid plan. Readiness and graceful process termination succeed.
6. Reducing stream capacity causes publication rejection without deleting the SQL row or evicting existing subjects; restoring capacity allows progress.
7. Stopping one broker leaves the remaining quorum able to accept the next snapshot.

Existing relay tests additionally exercise malformed headers, unavailable JetStream, a delayed stale publication rejected by the subject sequence fence, database-session loss during broker lookup, and trace/header preservation. The unavailable-JetStream negative case is intentional.

## Layer-by-layer assessment

### 1. Broker and stream ownership

Files: `platform/cluster/event-bus/{base,overlays/prod-eu}` and each domain's `workloads/outbox-relay/infra/overlays/prod-eu/streams.json`.

Three broker replicas, three stream replicas, file storage, and production node anti-affinity fit the intended single-node failure tolerance. NATS replication relies on a quorum; it is not a guarantee against total storage loss. Kubernetes volume permissions, DigitalOcean storage behavior, actual node placement, and power-loss durability were reviewed as configuration but were not exercised by the Docker test. [NATS replication guidance](https://docs.nats.io/learn/jetstream/surviving-node-loss).

The two streams are **latest-state feeds**: limits retention, one message per subject, no age expiration, and an explicit byte limit. `discard_new_per_subject: false` allows replacement on an existing subject while `discard: new` protects retained data from global-limit eviction. This behavior was tested, including global capacity rejection. Do not change these streams to WorkQueue or Interest retention: independently starting consumers need retained state. [NATS stream limits](https://docs.nats.io/learn/jetstream/shaping-the-stream).

The relay does not classify messages by inspecting whether they are commands, deltas, or snapshots. It finds the stream matching the subject; domain-owned subject filters and retention configuration determine routing and storage semantics. This keeps business policy outside the shared runtime.

Current capacity is 800 MiB reserved across the two streams against an approximately 819.2 MiB per-server file ceiling. Only about 19.2 MiB remains for additional stream reservations. Adding domains requires an explicit capacity adjustment; it does not require a new event framework.

### 2. SQL and producer transactions

Files: Accounts and Plans `workloads/migrations/sql/V001__init.sql`; Accounts `accounts.create.mjs`; Plans `plan.set.mjs`.

Each implemented mutation writes its outbound event in the same local transaction as authoritative business data. This is the central outbox guarantee, and injected insertion failures verified rollback. The outbox's UUID key, JSONB body, headers object, and queue index are sufficient for this implementation. An additional generic delivery-status table is unnecessary for the current successful-publication path. [Transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html).

Plan changes lock the account's assignment, increment its version, remove an older pending snapshot for that subject, and insert the replacement atomically. The relay's row lock prevents a coalescing transaction from removing a row while that relay owns it. This intentionally trades some write latency during publication for a small implementation.

`queued_at` plus UUID is a queue traversal order, not business chronology. `FOR UPDATE SKIP LOCKED` supports competing queue workers but does not establish per-aggregate ordering for arbitrary occurrence events. The current snapshot rules must not be generalized into an ordered delta log. [PostgreSQL SELECT locking](https://www.postgresql.org/docs/18/sql-select.html).

### 3. CloudEvents, TypeBox, and validation

Files: both `domains/*/contracts/src/events/*.mjs`, their tests, and the producer/projector imports.

The code generates structured JSON CloudEvents with source, event identity, schema/type version, resource subject, timestamp, and complete snapshot data. The outer transport content type is `application/cloudevents+json`; the envelope's data content type is `application/json`. Event identity remains stable in the persisted outbox and becomes `Nats-Msg-Id`. Resource identity and resource version have separate purposes. [CloudEvents specification](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md).

TypeBox schemas are compiled once; builders validate what producers emit, and the projector validates incoming data before writing. The projector also checks the actual NATS subject against the validated resource ID. The installed package source matches the local contract source, so the tests are not qualifying a different local schema from the one workloads import. Existing malformed-input tests cover timestamp, schema URI, version bounds, extra data, and envelope metadata. [TypeBox project](https://github.com/sinclairzx81/typebox).

These are application-specific CloudEvents profiles, not a universal validator for every possible CloudEvents encoding. The generic relay deliberately does not import domain schemas or revalidate domain payloads. Keep domain validation at the producer/consumer boundaries.

### 4. Relay and acknowledgement boundary

Files: `platform/runtime/outbox-relay/src/{main,outbox}.mjs`.

The relay acquires and locks a pending row in a transaction, reconstructs headers/trace context, discovers the destination stream, reads the last subject sequence, checks the SQL session, publishes with expected stream/subject sequence and stable ID, waits for PubAck, then deletes and commits. Failure rolls back and exits; the next process starts with a fresh transaction.

This correctly accepts the unavoidable possibility of duplicate delivery between broker acceptance and SQL commit. JetStream deduplication is bounded by its configured time window; it does not replace consumer idempotency. The real accepted-publication/lost-acknowledgement test passed. [NATS publishing](https://docs.nats.io/learn/jetstream/publishing).

The sequence fence guards against a delayed publication overwriting a newer retained message. It is not a comparison of `data.version` and is not a universal ordering solution. The installed NATS client returns `null` for a missing last-subject message, so first publication correctly uses sequence zero. Its default publishing behavior does not silently retry while changing that expectation. [NATS expected-state headers](https://docs.nats.io/reference/jetstream/api/headers).

One small boundary worth hardening before inviting additional producers is stored-header validation: require string values and reject producer-supplied `Nats-*` control headers. The current producers only write content type and tracing headers, so this is not a reproduced defect in their flows. The shared relay should own transport control headers; some additional NATS headers can otherwise alter publication semantics. Keep this check in the relay, not in every domain.

### 5. Consumer and domain meaning

Files: Plans `workloads/accounts-projection/src/{index,server}.mjs` and its event handler.

An explicit-ack pull consumer starts from LastPerSubject; the handler commits its local transaction before the loop acknowledges. An unnamed consumer is reasonable here because startup deliberately replays retained current state. Restart replay was exercised using the real process. [NATS pull consumers](https://docs.nats.io/learn/jetstream/pull-consumers).

The handler is an **initializer**, not a mirrored Accounts view. Its business rule is to create a free assignment once and then let Plans own future changes. `ON CONFLICT DO NOTHING` makes repeated Account events harmless. Adding an inbox table or upstream version tracking would not improve that rule. A future mutable projection needs its own conditional version application; a future external side effect needs its own durable idempotency boundary.

The current snapshot path supports independently stopped/restarted consumers while retained data remains available. That is consistent with asynchronous SCS integration and domain-owned data. [SCS characteristics](https://scs-architecture.org/).

### 6. Observability and process behavior

Existing producer/relay/projector tracing and the Collector → OpenObserve route should remain the observability path. The collector already receives OTLP and Kubernetes state; the node agent collects logs. This qualification inspected that configuration and exercised relay trace propagation through the existing tests. It did **not** deploy the Collector/OpenObserve stack or verify live ingestion.

Application readiness checks database access and Core NATS flush. They do not prove that a stream has writable capacity or that every event is making progress. That is a telemetry/alerting concern, not a reason to make Kubernetes liveness depend on all downstream assets. Existing connectivity, logs, and traces also do not automatically expose SQL outbox age or JetStream backlog/capacity; those signals must be collected explicitly when operational failure handling is added.

## What this qualification does not claim

- A generic command/delta lifecycle is not implemented by the domain workloads. A transport test carrying a command does not establish command ownership, durable consumption, ordering, or business idempotency.
- Current snapshots provide latest state, not event history. Account deletion/tombstones, feature-catalog mutations, and general projection updates need defined producer behavior when those features are introduced.
- A retained invalid message can repeatedly stop the current projector; a bad earliest outbox row can stop the relay. This is the existing fail-fast operational policy, not automatic recovery or quarantine.
- Loss of retained broker state after successful outbox deletion cannot be repaired from the emptied outbox. Repopulation from authoritative domain data is a separate recovery capability.
- The tests do not establish peak throughput, long partition behavior, every rolling-update race, total power-loss durability, or end-to-end observability delivery. The three-broker Docker test uses temporary storage and does not simulate the Kubernetes storage/security environment.

## Minimal next direction

1. Keep this architecture. No replacement event framework, generic inbox, CDC service, or broker-side business validator is justified by the qualification.
2. Retain the composed qualification as regression evidence; integrate it into the normal check workflow when implementation changes are authorized. Add the small relay header boundary check before broadening producer reuse.
3. Define separate minimal profiles when adding commands, occurrence events, or mutable projections. Reuse the transport and packages, but give each profile appropriate retention, replay, idempotency, and ordering semantics.
4. Then add recovery and failure handling at the appropriate layers: domain-owned snapshot regeneration; relay/consumer failure policy; broker and outbox signals through the existing Collector/OpenObserve infrastructure.

The immediate foundation is qualified for today's snapshot use cases. Broadening its claimed scope requires explicit semantics and targeted tests, rather than a large rewrite.
