# Accounts Contracts

`@mstaicu/accounts-contracts` is the published event boundary owned by
Accounts.

It exports schemas, validators, constants, and builders for:

```text
accounts.account.created.v1
accounts.member.created.v1
accounts.member.updated.v1
accounts.member.deleted.v1
```

Source schemas are under `src/events`; example payloads are under
`examples/events`.

Events use CloudEvents `1.0`. The event `type` versions the payload contract.
`data.version` is a monotonic account revision that consumers compare per
projected account or membership resource. Additive changes may stay on the same
event version only when old consumers remain valid; otherwise publish a new
event type.

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
