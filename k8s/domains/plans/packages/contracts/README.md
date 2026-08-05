# Plans Contracts

`@mstaicu/plans-contracts` is the published event boundary owned by Plans.

It currently exports the schema, validator, constants, and builder for:

```text
plans.account.features.updated.v1
```

The event is a complete snapshot of the boolean, number, and string feature
values resolved from an account's current plan. Its source schema is
`src/events/plans.account.features.updated.v1.mjs`; its example is under
`examples/events`.

Events use CloudEvents `1.0`. The event `type` versions the payload contract,
and `data.version` versions the account feature snapshot. Additive
changes may stay on the same event version only when old consumers remain
valid; otherwise publish a new event type.

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
