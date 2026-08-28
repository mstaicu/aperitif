# Plans Contracts

`@mstaicu/plans-contracts` is the published event boundary owned by Plans.

It exports the schema, validator, constants, subject builder, and event builder
for:

```text
plans.account-features.changed.v1
```

The event carries the complete boolean, number, and string feature values
resolved from an Account's current plan. Its source schema is under
`src/events`; its example is under `examples/events`.

Events use CloudEvents `1.0`. The `v1` in the event `type` and NATS subject is
the payload schema version. `data.revision` is the monotonic Account feature
revision; it is unrelated to CloudEvents `specversion` and the JetStream
sequence.

The builder creates the structured CloudEvents JSON body. The Plans outbox owns
NATS transport details, including the `Content-Type: application/cloudevents`
header and JetStream message ID.

## NATS subject

The Account feature projection feed uses one stable subject for each Account:

```text
plans.account-features.v1.<account-id>
```

Each message on that subject has type `plans.account-features.changed.v1` and
the complete resolved feature map at its revision. The NATS subject is transport
routing and retention identity; it is not derived from the CloudEvent `type`.
`PLANS` captures the version family as `plans.account-features.*.*`; a V1
projector filters `plans.account-features.v1.*`.

This V1 schema is closed. Any change to its `data` shape uses a new complete
feed, for example `plans.account-features.v2.<account-id>` with type
`plans.account-features.changed.v2`; it does not add fields to V1. If a real V1
consumer still exists, the source dual-publishes complete V1 and V2
representations of the same feature revision until that consumer migrates.

Plans owns the authoritative resolved Account feature state. Before relying on
recovery from state-stream loss, Plans must provide a controlled reseed that
republishes one current representation per Account with new CloudEvent IDs and
the stored feature revisions. It is recovery work, not a historical Plans fact.

Any future Plans mutation that changes an Account's resolved feature map,
including a change to a selected plan's feature values, increments that
Account's feature revision and publishes its complete current feature map.

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
