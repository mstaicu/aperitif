# Documentation

## Model

```text
identity    a record Auth recognizes: a user today, a machine later
principal   the identity acting in a request
credential  proof that the principal controls that identity
account     the ownership and authorization boundary
authority   what current domain facts permit the principal to do
```

```text
credential -> Auth -> short-lived access token -> domain API
```

Auth proves identity. Domain APIs decide authority from current membership,
resource facts, and business rules.

## Reading order

- [extensions](extensions/) — reusable extensions of one or more domain
  boundaries. They never own product resources or workflows.
- [examples](examples/) — illustrative product compositions. They define a
  possible product domain and assemble the domains and extensions it needs.

1. A domain README is the current implemented boundary.
2. An extension is an implementation specification for one reusable outcome.
3. An example assembles domains and extensions into one possible product.

`Implemented` means code is the source of truth. `Proposed` means the document
is ready to implement but has no runtime surface yet. `Illustrative` examples
are product examples, not deployed interfaces.

Extensions compose one way: an extension lists its prerequisites and extends
them without copying their tables, API, or events. Once a Product exists, its
README, OpenAPI, and contracts replace the example's proposed interface.

Each extension's `Evolution` section strengthens the same boundary in stages.
Start with the baseline and stop until a concrete threat, customer, or
regulatory requirement justifies the next stage.

## Rules

- Update an extension with the same change as its outcome, prerequisites,
  public API, or events.
- Update an example with the same change as its assembled blocks or workflow.
- New events follow the [platform event contract](../README.md#event-processing).
- Operational instructions stay beside the code they operate.

## Add a domain

Start with the smallest shape that has a concrete need. A domain author decides
what their data means and owns the resulting code, database, contracts, and
deployment configuration. Choose only the extensions the domain needs.

| Shape | Use when | Reference |
| --- | --- | --- |
| API and database | The domain has no cross-domain state requirement. | [Accounts](../domains/accounts/README.md) |
| Accounts-state consumer | The domain needs current Account data for local business logic or authorization. | [Plans Accounts projection](../domains/plans/workloads/accounts-projection/) |
| State producer | Another domain needs the domain's complete current resource state. | [Accounts](../domains/accounts/README.md) |
| Consumer and producer | The domain both uses upstream state and exports its own. | [Plans](../domains/plans/README.md) |

Do not add NATS, an outbox, Outbox Relay, or a projection merely because the
domain exists.

### Common domain shape

Every domain owns only the folders for workloads it actually has:

```text
domains/<domain>/
  workloads/
    postgres/infra/            # PostgreSQL instance
    migrations/                # Dockerfile, SQL, and infra/
    api/                       # source, Dockerfile, and infra/
    <source>-projection/       # source, Dockerfile, and infra/
    outbox-relay/infra/        # if it publishes state or facts
  contracts/                   # if it exports an event contract
  Makefile
  README.md
  skaffold.yaml
```

Each workload owns its source when it has any and always owns its `infra/`.
`postgres`, `cleanup`, and `outbox-relay` can contain only `infra/`: they run
an upstream image or shared runtime. A domain owns its database; it never reads
another domain's database.

Use the existing `check`, `migrate`, `deploy`, and `dev` Make targets. Their
meaning is consistent across implemented domains.

### API and database only

Start with this shape unless a real cross-domain need says otherwise.

1. Add the domain migration image and `workloads/migrations/sql/V001__init.sql`.
2. Add only the tables owned by the domain.
3. Add `workloads/postgres/infra`, `workloads/migrations/infra`, and
   `workloads/api/infra` configuration.
4. Add the local Skaffold modules and the four Make targets.
5. Add a short domain README that names the data and authority it owns.

There is no event contract, projector, outbox table, or Outbox Relay in this
shape.

### Consume Account state

Use this only when the domain needs a local, current Account representation.
For example, a Product that authorizes product roles projects Account members
locally; it does not query Accounts during a request.

1. Depend on `@mstaicu/accounts-contracts` and validate every message with
   `AccountChangedV1EventCheck`.
2. Create one local projection table with `account_id` and the upstream
   `revision`, plus only the Account data the Product needs.
3. Create one projection workload. It creates an unnamed JetStream consumer on
   `ACCOUNTS` with:

   ```text
   filter subject: accounts.account.v1.*
   delivery:       DeliverLastPerSubject
   acknowledgements: explicit
   ```

4. In one local database transaction, ignore an event whose `data.revision` is
   equal to or lower than the stored revision. Otherwise apply the complete
   representation and store the newer revision.
5. Acknowledge the NATS message only after that transaction commits.
6. Add `workloads/<name>-projection/infra` and its NATS, database, DNS, and
   telemetry NetworkPolicy access.

[Plans' Accounts projection](../domains/plans/workloads/accounts-projection/) is the
complete working reference. It uses no outbox or Outbox Relay because it only
consumes state.

An unnamed state-projector consumer is deliberately not a shared worker queue.
Run one replica. On restart it receives the retained current Account record for
each subject, then follows new messages.

### Publish a current-resource state feed

Use this only when another domain needs the domain's current resource state.
The source domain exports a complete representation, not a sequence of CRUD
deltas.

1. Create an owned contracts package. It exports only the complete resource
   data schema, structured CloudEvent schema and validator, subject builder,
   event builder, example, and schema snapshot test.
2. Give the resource one subject per resource ID:

   ```text
   <domain>.<resource>.v<schema>.<resource-id>
   ```

   Keep the CloudEvent `type` separate from the NATS subject.
3. Add the standard `outbox_events` table and `(queued_at, id)` index to the
   domain migration. Copy the table contract from
   [Outbox Relay](../platform/runtime/outbox-relay/README.md#domain-contract).
   Do not add a PostgreSQL notification trigger.
4. In the same transaction as every exported resource mutation, write the
   complete representation, its next monotonic `data.revision`, and its
   CloudEvent outbox row.
5. Serialize mutations of the same resource. When a newer state snapshot is
   still unpublished, replace the pending row for that resource subject in the
   same transaction. An older representation must never publish after a newer
   one.
6. Add `workloads/outbox-relay/infra`, including a domain-owned `streams.json`. The
   state stream matches the resource subject family, retains one message per
   subject, and declares its own `max_bytes`.
7. Add Outbox Relay to local Skaffold. The domain's check validates its source,
   contracts, and workload infrastructure.

[Accounts](../domains/accounts/README.md) is the minimal producer reference.
[Plans](../domains/plans/README.md) is the reference for a consumer that also
publishes state. The complete rules for versions, recovery, facts, and schema
evolution remain in the [platform event contract](../README.md#event-processing).

Historical facts are different: add an append-only stream only when a real
consumer needs an occurrence history. Outbox Relay can transport those rows
too; the domain chooses their contract and retention policy.

### Validate locally

First deploy the shared units the domain uses, then run its domain commands:

```sh
make -C platform/cluster/event-bus deploy  # only for a consumer or producer
make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
```

For a consumer, prove all three cases:

1. Startup receives the latest state for every retained source subject.
2. Replaying the same event changes nothing.
3. A newer revision applies and an older revision does not.

For a producer, prove the business mutation and outbox entry commit together;
then prove Outbox Relay publishes it and deletes it only after PubAck. For a
state feed, also test that an older pending representation cannot publish after
a newer revision of the same resource.

### Shared-cluster registration

The domain owns its source and workload `infra/` configuration. Two current shared
cluster changes require platform or release review:

- add its Outbox Relay and/or projection workload to the NATS NetworkPolicy in
  `platform/cluster/event-bus/base/networkpolicy.yaml`;
- add its production Flux inventory under `clusters/prod-eu/` and an image
  policy for every domain-owned image.

A state-projection Kustomization also depends on its own migrations and the
source domain's Outbox Relay. For example, an Accounts-state projector depends
on `accounts-outbox-relay`, which creates `ACCOUNTS` before the projector starts.

The shared Outbox Relay image uses `flux-system:outbox-relay`. A domain adding
an Outbox Relay adds `workloads/outbox-relay/infra`, which depends on its
migrations and `event-bus`; it does not add another image policy.

### What this does not decide

The platform cannot decide whether a domain should publish state, publish a
historical fact, or remain local. That is a business and ownership decision.
It also does not define Product roles, workflows, payments, compliance, or
machine behavior. Add those only when the Product requires them.

## Index

### Platform domains

- [Auth](../domains/auth/README.md) — foundational identity and credentials.
- [Accounts](../domains/accounts/README.md) — foundational account boundary and
  initial ownership.
- [Plans](../domains/plans/README.md) — optional account-level commercial
  feature snapshots.

### Event processing

- [Platform event contract](../README.md#event-processing) — the implemented
  contract for outboxes, resource projection feeds, facts, and projectors.
- [Outbox Relay](../platform/runtime/outbox-relay/README.md) — shared
  outbox-to-JetStream transport runtime; each emitting domain owns its
  deployment and stream configuration.

### Extensions

#### Auth

- [Operators](extensions/auth/operators.md) — platform-wide human authority;
  implemented.
- [Personal access tokens](extensions/auth/personal-access-tokens.md) — unattended
  human automation; proposed.
- [Machines](extensions/auth/machines.md) — non-human principal and credential
  exchange; proposed.

#### Accounts

- [Membership](extensions/accounts/membership.md) — owner-managed generic
  members; proposed.
- [Invitations](extensions/accounts/invitations.md) — generic account admission
  through a one-time secret; proposed.
- [Machine membership](extensions/accounts/machine-membership.md) —
  attach machines to Account boundaries; proposed.

#### Product

- [Member roles](extensions/product/member-roles.md) — product-owned roles for
  account members; proposed.

### Examples

- [Automated farm](examples/automated-farm.md) — Farm product domain;
  illustrative.
