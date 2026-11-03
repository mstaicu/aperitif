# Domain model

The foundation supports products by composing independent business capabilities.
Identity is the reusable authentication and account capability. A Product domain
owns the actual user journey, product vocabulary, and commercial model.

```text
B2C product       Identity + Product
B2B product       Identity + Product
Paid product      Identity + Product
Machine product   Identity machines + Identity machine membership + Product
```

Only deploy capabilities a product uses.

## Rules

- A domain owns its data, migrations, logic, APIs, messages and deployment.
- A domain never reads another domain's database.
- Cross-domain IDs are opaque values without cross-database foreign keys.
- Identity proves identity. Each domain decides authority locally.
- Identity owns generic membership. Product roles belong to the Product domain.
- A product owns its commercial model: entitlements, plans and payments begin in
  that same boundary. Split it only when separate ownership or lifecycle proves
  necessary.
- Prefer asynchronous state transfer when a domain needs remote state during
  routine decisions. Use synchronous calls only when the user operation requires
  an immediate authoritative answer.
- Shared infrastructure code contains no domain vocabulary.

## Implemented domains

### Identity

[`domains/identity`](../domains/identity) implements passkey registration,
authentication and credential management, independent sessions, five-minute
access tokens, JWKS, accounts, initial owner membership, and the passkey UI.
An Account is a Product's primary customer and economic attribution key.

The API generates its HTTP reference at `/v1/identity/docs`. Public signing keys
are available at `/.well-known/jwks.json`.

Creating an Account adds the caller as its initial owner in the same transaction.
Identity publishes separate current representations:

```text
NATS subject:       identity.state.account.v1.<account-id>
type:               identity.account.snapshot.v1
stream:             IDENTITY_STATE
package:            @mstaicu/identity-contracts
```

```text
NATS subject:       identity.state.membership.v1.<membership-id>
type:               identity.membership.snapshot.v1
stream:             IDENTITY_STATE
package:            @mstaicu/identity-contracts
```

The Account snapshot contains only Account state. The Membership snapshot
contains one principal's relationship with one Account and its current roles.
Activity/deletion state is not implemented. A consumer that needs membership
state consumes the separate membership feed; it does not make the Account feed a
growing aggregate.

Both snapshots include `data.created_at`, serialized from their resource's
PostgreSQL creation timestamp. It stays unchanged across later updates; it is distinct from a message's
occurrence or publication time.

Snapshot V1 contracts omit CloudEvent `time` and `subject`. Resource IDs and
creation timestamps live in `data`; the NATS subject supplies the routing address.

Identity also publishes seven committed lifecycle events under
`identity.events.>` in `IDENTITY_EVENTS`: principal registration, account and
membership creation, credential addition/removal, session establishment and explicit
session revocation. Their versioned types, NATS addresses, payloads and exact
emission meanings are in the
[message contracts](../domains/identity/contracts/src/messages).
The `events` prefix identifies the occurrence feed; the `state` prefix identifies
the latest-resource feed. Message types retain their business names.

Events require source mutation `time`; this uses
PostgreSQL `clock_timestamp()` after the relevant lock, not transaction start,
the exact commit instant or eventual publication time. Each message has its own
stable ID. `data.principal_id` references the principal involved in the fact;
for Account creation it is the creator. These implemented operations are
self-service, so a duplicate actor field adds no information.
The minimum contains no operation grouping ID or duplicate resource `subject`.
Entity references support lifecycle joins; they do not prove that facts came from
one operation. Trace context travels in transport headers.

Signup produces principal, credential and session events. A later successful
authentication also establishes a session. Step-up proof and access-token minting
do not establish sessions. Credential removal reports each
affected unexpired session. Natural expiry/cleanup is not explicit revocation.
Initial membership roles are represented once in membership creation.

The Identity API and Analytics projector use the published contracts package.
The stream/subject names shown here are deployed locally. Publication remains
manual; dependencies, relay configuration and consumers move together after
publication. See the [validation report](analytics-validation.md).

### Analytics

[`domains/analytics`](../domains/analytics) owns a PostgreSQL occurrence ledger,
current Identity projections, durable NATS consumers and versioned read-only
reporting views. It uses public source contracts, never Identity's database.
The [Analytics foundation](analytics.md) defines source, transport and reader
boundaries; the [domain guide](../domains/analytics/README.md) covers local use. A reporting view describes observed data, not pre-collection
history, attempts or causal experiment results.

Member administration, invitations, machine principals, machine membership, and
personal access tokens are proposed Identity extensions. They are not
implemented. Product roles do not belong in Identity.

## Communication

### Synchronous

HTTP is appropriate for the operation being requested now: authentication,
commands initiated by a person, and reads whose authoritative answer cannot be
local. A caller must tolerate the callee being unavailable.

Existing Identity mutations do not offer automatic retry admission after an
unknown outcome. In particular WebAuthn proofs are deliberately single-use.
Machine callers must follow each operation's documented retry policy.

Products obtain Identity's JWKS to validate Identity access tokens. That is a
narrow identity dependency. Business domains do not call one another for
routine authorization.

### Asynchronous

Use a current-resource feed when a consumer needs another domain's state locally.
Keep message purpose separate from payload representation:

| Term | Meaning here |
| --- | --- |
| Message | A unit sent between applications over a transport. |
| Event | A record that something happened, with its context; it does not request a particular receiver's action. |
| Command | A request for an owner to perform an action; acceptance and success are separate facts. |
| Document | Data transferred for the receiver to use. |
| Snapshot | A complete exported resource at a revision, not an entire database or every transition. |
| Delta | A change representation, which may describe a business change, changed fields or a numeric difference; its contract defines how to interpret it. |

[Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageConstructionIntro.html)
distinguishes command, event and document messages. Snapshot and delta describe
data representation, so these terms are not mutually exclusive classes: an
event can carry either complete state or a change. Terminology varies:
[Confluent's event-design course](https://developer.confluent.io/courses/event-design/fact-vs-delta-events/)
calls complete-state records “fact events” and business changes “delta events.”
Here “business fact” means a recorded occurrence, not a promise of full resource
state. Identity uses explicit `events` and `state` routing profiles rather than
requiring consumers to infer them from the term delta. Fowler's
[event-carried state transfer](https://martinfowler.com/articles/201701-event-driven.html)
describes maintaining local copies from published state; it does not require
event sourcing. Identity remains a database-backed domain with an outbox, not
an event-sourced system.

[CloudEvents](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#terminology)
standardizes event context and serialization, not this taxonomy or business
payloads. Reusing CloudEvents-shaped fields for command envelopes is an explicit platform
convention, not a CloudEvents command standard. Retention, deduplication and
ordering rules belong to each feed's contract, not just its name.

Message topology follows the consumer's need:

| Feed | Configuration | Consumer rule |
| --- | --- | --- |
| Current exported state | `IDENTITY_STATE`, one retained snapshot per resource subject | Initialize with latest per subject; apply only higher resource revisions. |
| Business occurrences | `IDENTITY_EVENTS`, retained `identity.events.>` messages | Read retained occurrences with an independent durable per logical pipeline; deduplicate event identity. |
| Requested actions | No asynchronous Identity command feed currently needed | Address the owning handler; define authorization, retry/idempotency and result semantics when an actual use case requires it. |

Replicas of one logical pipeline share its durable; independent consumers do
not share progress. Retention limits still bound recovery. For new domains,
use `<domain>.state.<entity>.vN.<id>` for resource snapshots and
`<domain>.events.<entity>.<past-tense-action>.vN` for occurrences. An asynchronous
command, when needed, uses a separate `<DOMAIN>_COMMANDS` stream and
`<domain>.commands.<entity>.<action>.vN` address. Do not send commands to the event
feed or add unused command streams. These are platform routing conventions;
they do not redefine message purpose or payload representation.

Identity's public contracts live under
[`domains/identity/contracts`](../domains/identity/contracts). Contracts for other
domains follow the same `domains/<domain>/contracts` structure. Keep the schema,
validator and builders for one message together and export the supported API
through `src/index.mjs`. Definitions live in `src/messages/`, examples in
`examples/messages/`, and contract tests in `test/messages/`. Use the exact
versioned contract type as the filename, such as
`identity.account.created.v1.mjs` or `identity.account.snapshot.v1.mjs`.
The neutral folder covers message definitions without treating event, snapshot
and delta as exclusive categories. Contract packages contain no database, NATS
or tracing clients.

Each message file owns its TypeBox schema, builder, validator, NATS address and
emission meaning. Consumers use these definitions directly and check the actual
NATS address. The session validator also checks expiry follows establishment.
Keep examples alongside the modules. No shared schema factory, aggregate message
type, parallel schema catalogue or generator is needed.

Consumers pin exact package versions and validate every message. Publishing is
manual for now:

```sh
cd domains/<domain>/contracts
npm ci
npm run check
npm publish
```

The current pre-live baseline can change in place. After contracts are live,
changing JavaScript exports requires a package release. Changing wire shape,
field meaning or emission rule requires
a new message version, even when the JSON still validates. Keep V2 beside V1:
producers write both representations in the business transaction while consumers
move to explicit version-specific projectors and subscriptions. Retire V1 only
after its consumers have migrated. The existing Plans `account-v1.mjs` pattern is
the reference; Analytics currently implements `identity-v1.mjs`.

Each versioned envelope has its own message ID. Event representations retain
their affected resource and occurrence time where those meanings are unchanged.
Snapshot representations preserve resource identity, revision and creation time.
Delivery deduplication
does not deduplicate different wire versions of a business occurrence. A reporting model chooses its supported
representation explicitly; never add V1 and V2 counts together. Adding a version
or fact type must not widen an existing consumer beyond the contracts it knows.

## Producing business facts

Use Identity's implemented events as the producer blueprint:

1. Define one precise successful occurrence in its contract: when it is emitted,
   which resource it concerns, and what it does not mean. Export the facts known
   at that occurrence, such as initial membership roles; do not make consumers
   infer history from mutable current state.
2. Give each occurrence its own ID and reference existing entity IDs directly.
   Do not require a generic operation or correlation ID. Include customer attribution
   only when the source operation actually knows it; global sign-in does not
   invent an account.
3. Read source timestamps from the database mutation. Identity captures database
   wall time at the mutation, after the relevant resource lock. Capturing it at
   `BEGIN` could place a later revocation before a concurrently issued session.
   Do not substitute relay time on retry, claim commit order, or fabricate legacy
   dates. A creation timestamp stays the resource's creation time across updates.
4. Build and validate the typed event, then enqueue it in the same checked-out
   database transaction as the business change. Required fact failure rolls back
   the change. Keep the outbox SQL inline in the service, using the contract's
   subject constant. Never coalesce distinct events.
5. Let the existing relay publish the saved envelope unchanged. Delivery may
   repeat; the consumer deduplicates `(source,id)`. No analytics SDK, warehouse
   format, broker cursor or vendor configuration belongs in the business fact.

| Timestamp | Meaning in this implementation |
| --- | --- |
| Resource `created_at` | Source creation time, stored with the resource. |
| Event `time` | Source mutation time before commit, after the relevant lock; retries preserve it. |
| Analytics `ingested_at` | Arrival of a newly stored unique event, independent of source occurrence time. |

See [account creation](../domains/identity/workloads/api/src/services/accounts/create.mjs)
for the full mutation, snapshots and facts in one transaction. Additional lifecycle
fields and events are introduced with the operation that makes them true;
Identity does not add unused `updated_at`/`deleted_at` fields or fabricate
attempts, role changes or credential history from its current rows.

## Publishing a current-resource feed

1. Give the source resource a positive monotonic version.
2. Build and validate its complete exported representation.
3. In the source transaction, replace any unpublished older snapshot for the
   same subject and insert the new outbox row.
4. Store the complete CloudEvent as `payload` and transport metadata as
   string-valued `headers`.
5. Let the domain-owned Relay Deployment publish it.

See [Identity account creation](../domains/identity/workloads/api/src/services/accounts/create.mjs)
for the transaction pattern. Creation normally has no pending snapshot to replace;
updates must also lock the source resource and increment its version. Coalesce
only snapshot subjects; retain every distinct business event and command.

Relay is generic. It must not import the producer's contract or interpret its
payload.

## Consuming a current-resource feed

1. Depend on the producer's exact contract package version.
2. Validate the CloudEvent and its actual NATS subject.
3. Store only the remote fields needed locally, including source version.
4. Compare and write projection state in one transaction.
5. Acknowledge only after commit.

Use `DeliverLastPerSubject` for a fresh current-state projection. A consumer that
only initializes local state may remain idempotent without storing a full remote
projection.

Use the tested Identity contract examples for current event payloads:

- [Account snapshot](../domains/identity/contracts/examples/messages/identity.account.snapshot.v1.json)
- [Membership snapshot](../domains/identity/contracts/examples/messages/identity.membership.snapshot.v1.json)

These examples are validated by the [contract tests](../domains/identity/contracts/test/messages).
A complete consumer example should be included only when it is executable and
tested against those contracts.

## Adding a product domain

Start with the smallest deployable unit:

```text
domains/<domain>/
  workloads/
    postgres/            local/disposable database manifests
    migrations/          SQL, image, Skaffold and manifests
    api/                 source, image, Skaffold and manifests
  Makefile               check, up, dev, down
  skaffold.yaml          component composition
```

Every workload owns its `infra/base`, environment overlays and `skaffold.yaml`.
The base contains the portable workload and Service. Overlays contain routing,
access, credentials and environment configuration. The domain Skaffold file only
requires its component configs.

Add a UI, worker, contracts package, outbox relay or projection only when the
domain requires it. Product-owned records carry `account_id` when they belong
to a customer. Billable and directly attributable actions use the same key.
Isolation tests must prove that one Account cannot read or mutate another
Account's data.

Analytics can add other sources, metrics or readers without changing source
domain events to match a vendor. Add a projector, warehouse, model runtime or UI
only when its workload requires it.
