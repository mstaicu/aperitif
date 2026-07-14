# Accounts Contracts

`@mstaicu/accounts-contracts` is the published event boundary owned by
Accounts.

It currently exports the schema, validator, constants, and builder for:

```text
accounts.account.opened.v1
```

The source schema is
`src/events/accounts.account.opened.v1.mjs`; its example payload is under
`examples/events`.

Events use CloudEvents `1.0`. The event `type` versions the payload contract,
and `data.version` versions the producing account state. Additive changes may
stay on the same event version only when old consumers remain valid; otherwise
publish a new event type.

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
