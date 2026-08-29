# New domain

This is the smallest path for adding a product domain. It is a guide, not a
generator: a domain author decides what their data means and owns the resulting
code, database, contracts, and deployment configuration.

Start by choosing only the capabilities the domain needs.

| Shape | Use when | Reference |
| --- | --- | --- |
| API and database | The domain has no cross-domain state requirement. | [Accounts](../domains/accounts/README.md) |
| Accounts-state consumer | The domain needs current Account data for local business logic or authorization. | [Plans Accounts projection](../domains/plans/accounts-projection/) |
| State producer | Another domain needs the domain's complete current resource state. | [Accounts](../domains/accounts/README.md) |
| Consumer and producer | The domain both uses upstream state and exports its own. | [Plans](../domains/plans/README.md) |

Do not add NATS, an outbox, Relay, or a projection merely because the domain
exists.

## Common domain shape

Every domain owns only the folders for workloads it actually has:

```text
domains/<domain>/
  api/                         # if it exposes HTTP
  migrations/                  # its PostgreSQL schema
  deploy/
    postgres/
    migrations/
    api/                       # if it exposes HTTP
    <source>-projection/       # if it consumes source state
    relay/                     # if it publishes state or facts
  contracts/                   # if it exports an event contract
  Makefile
  README.md
  skaffold.yaml
```

Keep source with the workload and Kubernetes configuration under the matching
`deploy/<workload>/` directory. A domain owns its database; it never reads
another domain's database.

Use the existing `check`, `migrate`, `deploy`, and `dev` Make targets. Their
meaning is consistent across implemented domains.

## API and database only

Start with this shape unless a real cross-domain need says otherwise.

1. Add the domain migration image and `migrations/sql/V001__init.sql`.
2. Add only the tables owned by the domain.
3. Add its API workload and `deploy/postgres`, `deploy/migrations`, and
   `deploy/api` configuration.
4. Add the local Skaffold modules and the four Make targets.
5. Add a short domain README that names the data and authority it owns.

There is no event contract, projector, outbox table, or Relay in this shape.

## Consume Accounts state

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
6. Add `deploy/<name>-projection` and its NATS, database, DNS, and telemetry
   NetworkPolicy access.

[Plans' Accounts projection](../domains/plans/accounts-projection/) is the
complete working reference. It uses no outbox or Relay because it only
consumes state.

An unnamed state-projector consumer is deliberately not a shared worker queue.
Run one replica. On restart it receives the retained current Account record for
each subject, then follows new messages.

## Publish a current-resource state feed

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
   [Relay](../platform/runtime/relay/README.md#domain-contract). Do not add a
   PostgreSQL notification trigger.
4. In the same transaction as every exported resource mutation, write the
   complete representation, its next monotonic `data.revision`, and its
   CloudEvent outbox row.
5. Serialize mutations of the same resource. When a newer state snapshot is
   still unpublished, replace the pending row for that resource subject in the
   same transaction. An older representation must never publish after a newer
   one.
6. Add `deploy/relay`, including a domain-owned `streams.json`. The state
   stream matches the resource subject family, retains one message per subject,
   and declares its own `max_bytes`.
7. Add Relay to local Skaffold and make the domain's `check` target run
   `make -C ../../platform/runtime/relay check`.

[Accounts](../domains/accounts/README.md) is the minimal producer reference.
[Plans](../domains/plans/README.md) is the reference for a consumer that also
publishes state. The complete rules for versions, recovery, facts, and schema
evolution remain in the [platform event contract](../README.md#event-processing).

Historical facts are different: add an append-only stream only when a real
consumer needs an occurrence history. Relay can transport those rows too; the
domain chooses their contract and retention policy.

## Validate locally

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

For a producer, prove the business mutation and outbox row commit together;
then prove Relay publishes it and deletes it only after PubAck. For a state
feed, also test that an older pending representation cannot publish after a
newer revision of the same resource.

## Shared-cluster registration

The domain owns its source and `deploy/` configuration. Two current shared
cluster changes require platform or release review:

- add its Relay and/or projection workload to the NATS NetworkPolicy in
  `platform/cluster/event-bus/base/networkpolicy.yaml`;
- add its production Flux inventory under `clusters/prod-eu/` and an image
  policy for every domain-owned image.

The shared Relay image uses `flux-system:relay`. A domain adding a Relay adds a
domain-local Relay Kustomization that depends on its migrations and `event-bus`;
it does not add another Relay image policy.

## What this guide does not decide

The platform cannot decide whether a domain should publish state, publish a
historical fact, or remain local. That is a business and ownership decision.
It also does not define Product roles, workflows, payments, compliance, or
machine behavior. Add those only when the Product requires them.
