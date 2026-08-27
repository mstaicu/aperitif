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

Events use CloudEvents `1.0`. The event `type` versions the payload contract.
`data.account` carries the complete exported Account, including its basic
`owner` and `member` roles. `data.account: null` is the versioned deletion
tombstone. `data.version` is the monotonic Account revision that consumers
compare per projected Account.

## NATS subjects

The Account projection feed uses one stable subject for each Account:

```text
accounts.account.v1.<account-id>
```

Each message on that subject has type `accounts.account.changed.v1` and the
complete exported Account at its version. The NATS subject is transport routing
and retention identity; it is not derived from the CloudEvent `type`.

The platform reserves these other subject families for distinct message
semantics. They are documented conventions, not current Accounts streams:

```text
<domain>.event.<resource>.<past-tense-occurrence>.v<schema>.<routing-id>
<domain>.command.<resource>.<imperative>.v<schema>
```

Facts in the `event` family are append-only occurrences when a concrete
consumer needs history. Commands are requests to one owning domain and are not
CloudEvents. Neither is needed to project the current Account representation.

A breaking representation change creates the parallel subject and event type
family `accounts.account.v2.<account-id>` and
`accounts.account.changed.v2`.

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
