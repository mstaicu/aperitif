# Accounts contracts

`@mstaicu/accounts-contracts` is the public Accounts resource-feed boundary.

It exports the complete V1 Account data schema, structured CloudEvent schema and
validator, subject builder, event builder, example, and schema snapshot test for:

```text
accounts.account.changed.v1
```

`data` is the complete exported Account, including basic `owner` and `member`
memberships. `data.revision` is the monotonic Account revision; it is not the
payload schema version, CloudEvents `specversion`, or JetStream sequence.

## Feed contract

```text
subject: accounts.account.v1.<account-id>
type:    accounts.account.changed.v1
stream:  ACCOUNTS subjects accounts.account.*.*
```

The subject identifies routing and retained-resource identity. The type identifies
the CloudEvent data schema. Relay publishes the builder's structured JSON with a
CloudEvents content type and uses the event ID as the JetStream message ID.

V1 is closed. A shape change creates a new complete feed, such as:

```text
subject: accounts.account.v2.<account-id>
type:    accounts.account.changed.v2
```

Publish both versions only while a real V1 consumer is migrating. They represent
the same Account revision; V2 must carry everything its consumers need to replace
V1.

The following are documented conventions, not implemented Accounts streams:

```text
<domain>.event.<resource>.<past-tense-occurrence>.v<schema>.<routing-id>
<domain>.command.<resource>.<imperative>.v<schema>
```

Facts are append-only history when a consumer needs occurrences. Commands are
requests to one owner and are not CloudEvents. Neither is required to project
current Account state.

Accounts must eventually provide a controlled reseed for state-stream recovery.
No reseed Job exists yet; see [the production recovery contract](../../../clusters/prod-eu/README.md#future-state-feed-recovery).

## Build and publish

```sh
npm ci
npm run build
npm pack --dry-run
npm publish
```

`prepack` generates `types/` for the package tarball. Generated declarations are
not committed; bump the package version before publication.
