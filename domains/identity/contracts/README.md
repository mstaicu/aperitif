# @mstaicu/identity-contracts

Current-state events emitted by Identity for accounts and memberships.

Consumers pin an exact version and validate every received message. Once a
contract has live consumers, a changed wire shape requires a new version.

```sh
npm ci
npm run check
npm publish
```
