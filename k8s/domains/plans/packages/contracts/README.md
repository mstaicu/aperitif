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

Events use CloudEvents `1.0`. The event `type` versions the payload contract,
and `data.version` is the monotonic Account feature revision.

## NATS subject

The Account feature projection feed uses one stable subject for each Account:

```text
plans.account-features.v1.<account-id>
```

Each message on that subject has type `plans.account-features.changed.v1` and
the complete resolved feature map at its version. The NATS subject is transport
routing and retention identity; it is not derived from the CloudEvent `type`.

A breaking representation change uses a new versioned feed. Define its
migration only when a real consumer requires one.

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
