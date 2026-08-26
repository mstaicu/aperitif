# Accounts Contracts

`@mstaicu/accounts-contracts` is the published event boundary owned by
Accounts.

It exports schemas, validators, constants, and builders for:

```text
accounts.account.created.v1
```

Source schemas are under `src/events`; example payloads are under
`examples/events`.

Events use CloudEvents `1.0`. The event `type` versions the payload contract.
`data.account` carries the complete current Account state, including its basic
`owner` and `member` roles. `data.version` is the monotonic Account revision
that consumers compare per projected Account. Additive changes may stay on the
same event version only when old consumers remain valid; otherwise publish a
new event type.

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
