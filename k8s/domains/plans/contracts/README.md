# Plans contracts

`@mstaicu/plans-contracts` is the public Plans resource-feed boundary.

It exports the complete V1 resolved Account feature schema, structured
CloudEvent schema and validator, subject builder, event builder, example, and
schema snapshot test for:

```text
plans.account-features.changed.v1
```

`data` contains the complete resolved boolean, number, and string feature map.
`data.revision` is the monotonic revision of that Account's resolved feature
state; it is not the payload schema version, CloudEvents `specversion`, or
JetStream sequence.

## Feed contract

```text
subject: plans.account-features.v1.<account-id>
type:    plans.account-features.changed.v1
stream:  PLANS subjects plans.account-features.*.*
```

The subject identifies routing and retained-resource identity. The type identifies
the CloudEvent data schema. Relay publishes the builder's structured JSON with a
CloudEvents content type and uses the event ID as the JetStream message ID.

V1 is closed. A shape change creates a new complete feed, such as:

```text
subject: plans.account-features.v2.<account-id>
type:    plans.account-features.changed.v2
```

Publish both versions only while a real V1 consumer is migrating. Both represent
the same feature revision; V2 must carry everything its consumers need to replace
V1.

Any Plans mutation that changes an Account's resolved feature map increments that
Account's feature revision and publishes the complete current map.

Plans must eventually provide a controlled reseed for state-stream recovery. No
reseed Job exists yet; see [the production recovery contract](../../../clusters/prod-eu/README.md#future-state-feed-recovery).

## Build and publish

```sh
npm ci
npm run build
npm pack --dry-run
npm publish
```

`prepack` generates `types/` for the package tarball. Generated declarations are
not committed; bump the package version before publication.
