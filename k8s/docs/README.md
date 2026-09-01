# Platform guide

Use this guide to add a domain without turning a product choice into platform
machinery.

## Read documents by status

| Kind | Meaning |
| --- | --- |
| Domain README, code, contracts, manifests | Implemented; code is authoritative |
| Extension | Proposed reusable capability; no runtime surface unless stated |
| Example | Illustrative product composition; not a deployed interface |

Extensions name prerequisites and extend their public boundary without copying
their tables, API, or events. An example stops being authoritative when a real
product domain has its own README, API, contracts, and database.

An extension's `Evolution` section strengthens the same boundary in stages.
Start with its baseline and advance only for a concrete threat, customer, or
regulatory requirement. Update an extension when its outcome, prerequisites,
public API, or events change; keep operational instructions beside the code they
operate.

## Platform model

```text
identity    a record Auth recognizes
principal   the identity acting in a request
credential  proof that the principal controls that identity
account     an ownership and authorization boundary
authority   what a domain permits from its current local facts
```

```text
credential -> Auth -> short-lived access token -> domain API
```

Auth proves identity. Each domain decides authority from its local projection,
resource facts, and product rules.

## Start a domain with the smallest shape

| Need | Add | Working reference |
| --- | --- | --- |
| Own HTTP API and data | API, database, and migrations | [Accounts](../domains/accounts/README.md) |
| Use current Account state locally | An Accounts projection workload | [Plans projector](../domains/plans/workloads/accounts-projection/) |
| Export current state | Contract, outbox, Relay instance, and state stream | [Accounts](../domains/accounts/README.md) |
| Both consume and export state | A projector plus the producer pieces | [Plans](../domains/plans/README.md) |

Do not add NATS, an outbox, a Relay, a projector, or a contract because a domain
exists. Add each only for a concrete boundary or consumer.

### Domain shape

```text
domains/<domain>/
  contracts/                   # only when another domain consumes a contract
  workloads/
    postgres/                  # skaffold.yaml and infra/
    migrations/                # Dockerfile, SQL, skaffold.yaml, and infra/
    api/                       # source, Dockerfile, skaffold.yaml, and infra/
    <source>-projection/       # source, Dockerfile, skaffold.yaml, and infra/
    outbox-relay/              # skaffold.yaml and infra/ when the domain emits messages
  Makefile
  README.md
  skaffold.yaml
```

A workload always owns `skaffold.yaml` and `infra/`. It owns source only when the source belongs
to the domain. `postgres`, `cleanup`, and `outbox-relay` may therefore contain
no source: they run an upstream image or shared runtime.

Use the existing domain interface:

```sh
make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
make -C domains/<domain> dev
```

### Consume Account state

Use a projection when a domain needs current Account data for authorization or
business logic. Do not synchronously query Accounts during a request.

1. Depend on `@mstaicu/accounts-contracts` and validate each message.
2. Store only the Account fields the domain needs plus the upstream revision.
3. Create one projection workload with an unnamed `DeliverLastPerSubject`
   consumer on `ACCOUNTS`, filtered to `accounts.account.v1.*`.
4. In one local transaction, ignore an equal or older revision; otherwise write
   the new complete representation and its revision.
5. Acknowledge only after that transaction commits.

An unnamed consumer is a baseline reconciler, not a shared worker queue. Run one
replica. Restarting it obtains every retained Account representation before it
continues with new messages.

### Publish current resource state

Use a resource feed when another domain needs your domain's current state.

1. Export a small domain-owned contracts package: complete data schema,
   CloudEvent schema and validator, subject builder, event builder, example,
   and schema snapshot test.
2. Use one subject per resource:

   ```text
   <domain>.<resource>.v<schema>.<resource-id>
   ```

3. Add `outbox_events` and its `(queued_at, id)` index in the domain migration.
   Commit the business mutation and complete CloudEvent snapshot together.
4. Give each resource a monotonic `data.revision`. Replace any still-pending
   snapshot for that subject with the newer one in the same transaction.
5. Add `workloads/outbox-relay/infra`, including the domain-owned
   `streams.json`; configure one retained current message per resource subject.
6. Test transaction/outbox atomicity, older-pending replacement, PubAck-before-
   delete, duplicate delivery, and projector restart.

The full transport and projection rules are the [platform event contract](../README.md#event-processing).
Historical facts require a separate append-only stream only when a consumer
needs occurrence history.

### Register shared-cluster access

A new consumer or producer still owns its source and workload configuration.
It also requires two explicit shared-cluster changes:

1. Add its NATS client access to
   `platform/cluster/event-bus/base/networkpolicy.yaml`.
2. Add its production Flux graph under `clusters/prod-eu/`, plus an image policy
   for each new domain-owned image.

A projector depends on its own migrations and the source domain's Relay so the
source stream exists before initial reconciliation.

## Current boundaries

- [Auth](../domains/auth/README.md) — identity, credentials, sessions,
  operators, and JWKS.
- [Accounts](../domains/accounts/README.md) — account boundary and initial
  account ownership.
- [Plans](../domains/plans/README.md) — optional account plans and resolved
  feature snapshots.
- [Outbox Relay](../platform/runtime/outbox-relay/README.md) — shared
  outbox-to-JetStream transport; domains own its instances and streams.

## Extensions

### Auth

- [Operators](extensions/auth/operators.md) — implemented platform-wide human
  authority.
- [Personal access tokens](extensions/auth/personal-access-tokens.md) — proposed
  unattended human automation.
- [Machines](extensions/auth/machines.md) — proposed non-human identity and
  credential exchange.

### Accounts

- [Membership](extensions/accounts/membership.md) — proposed owner-managed
  generic membership.
- [Invitations](extensions/accounts/invitations.md) — proposed account admission
  through a one-time secret.
- [Machine membership](extensions/accounts/machine-membership.md) — proposed
  machine attachment to Accounts.

### Product

- [Member roles](extensions/product/member-roles.md) — proposed product-owned
  roles for account members.

## Illustrative product composition

- [Automated farm](examples/automated-farm.md) — one possible Farm product
  domain; it is not implemented platform capability.
