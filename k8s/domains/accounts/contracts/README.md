# Accounts Contracts

`@mstaicu/accounts-contracts` is the published event boundary owned by
Accounts.

It exports schemas, validators, constants, subject builders, and event builders
for:

```text
accounts.account.changed.v1
```

Source schemas are under `src/events`; example payloads are under
`examples/events`.

Events use CloudEvents `1.0`. The `v1` in the event `type` and NATS subject is
the payload schema version. `data` carries the complete exported Account,
including its basic `owner` and `member` roles. `data.revision` is the
monotonic Account revision; it is unrelated to CloudEvents `specversion` and
the JetStream sequence.

The builder creates the structured CloudEvents JSON body. Outbox Relay owns NATS
transport details, including the `Content-Type: application/cloudevents` header
and JetStream message ID.

## NATS subjects

The Account projection feed uses one stable subject for each Account:

```text
accounts.account.v1.<account-id>
```

Each message on that subject has type `accounts.account.changed.v1` and the
complete exported Account at its revision. The NATS subject is transport routing
and retention identity; it is not derived from the CloudEvent `type`.
`ACCOUNTS` captures the version family as `accounts.account.*.*`; a V1
projector filters `accounts.account.v1.*`.

The platform reserves these other subject families for distinct message
semantics. They are documented conventions, not current Accounts streams:

```text
<domain>.event.<resource>.<past-tense-occurrence>.v<schema>.<routing-id>
<domain>.command.<resource>.<imperative>.v<schema>
```

Facts in the `event` family are append-only occurrences when a concrete
consumer needs history. Commands are requests to one owning domain and are not
CloudEvents. Neither is needed to project the current Account representation.

This V1 schema is closed. Any change to its `data` shape uses a new complete
feed, for example `accounts.account.v2.<account-id>` with type
`accounts.account.changed.v2`; it does not add fields to V1. If a real V1
consumer still exists, the source dual-publishes complete V1 and V2
representations of the same Account revision until that consumer migrates.

Accounts owns the authoritative Account state. Before relying on recovery from
state-stream loss, Accounts must provide a controlled reseed that republishes
one current representation per Account with new CloudEvent IDs and the stored
Account revisions. It is recovery work, not a historical Account fact.

## Build and publish

```sh
npm ci
npm run build
npm pack --dry-run
npm publish
```

`prepack` generates `types/`, and the package tarball includes it. Generated
declarations are intentionally not committed. Bump the package version before
every publication.
