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
NATS subject:       identity.account.v1.<account-id>
type:               identity.account.snapshot.v1
CloudEvent subject: account/<account-id>
stream:             IDENTITY
package:            @mstaicu/identity-contracts
```

```text
NATS subject:       identity.membership.v1.<membership-id>
type:               identity.membership.snapshot.v1
CloudEvent subject: membership/<membership-id>
stream:             IDENTITY
package:            @mstaicu/identity-contracts
```

The Account snapshot contains only Account state. The Membership snapshot
contains one subject's relationship with one Account, including whether it is
active. A consumer that needs membership state consumes the separate membership
feed; it does not make the Account feed a growing aggregate.

Both snapshots include `data.created_at`, serialized from their resource's
PostgreSQL creation timestamp. It stays unchanged across later updates and
reseeds; it is distinct from a message's occurrence or publication time.

Member administration, invitations, machine principals, machine membership, and
personal access tokens are proposed Identity extensions. They are not
implemented. Product roles do not belong in Identity.

## Communication

### Synchronous

HTTP is appropriate for the operation being requested now: authentication,
commands initiated by a person, and reads whose authoritative answer cannot be
local. A caller must tolerate the callee being unavailable.

Products obtain Identity's JWKS to validate Identity access tokens. That is a
narrow identity dependency. Business domains do not call one another for
routine authorization.

### Asynchronous

Use a current-resource feed when a consumer needs another domain's state locally.
A snapshot is one complete exported resource, not an entire database. An event
reports a fact; a command asks an owner to perform an action. Snapshot, delta and
command describe different delivery requirements and must remain explicit.

Identity's public contracts live under
[`domains/identity/contracts`](../domains/identity/contracts). Contracts for other
domains follow the same `domains/<domain>/contracts` structure. Keep the schema,
validator and builders for one message together and export the supported API
through `src/index.mjs`. Contract packages contain no database, NATS or tracing
clients.

Consumers pin exact package versions and validate every message. Publishing is
manual for now:

```sh
cd domains/<domain>/contracts
npm ci
npm run check
npm publish
```

After a contract has live consumers, changing JavaScript exports requires a
package release and changing the wire shape requires a new message version. Keep
V2 beside V1 and publish both while real V1 consumers migrate.

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
only snapshot subjects; retain every distinct delta and command.

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

- [Account snapshot](../domains/identity/contracts/examples/events/identity.account.snapshot.v1.json)
- [Membership snapshot](../domains/identity/contracts/examples/events/identity.membership.snapshot.v1.json)

These examples are validated by the [contract tests](../domains/identity/contracts/test/events).
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

An [Analytics domain](extensions/analytics.md) can own ingestion, derived
datasets, models and reporting using managed services or deployed workloads.
This is a proposed capability; introduce it for a concrete use case.
