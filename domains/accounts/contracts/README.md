# @mstaicu/accounts-contracts

The public Account and Membership current-state message contracts. They contain the schemas, validators,
subject builder, event builder, generated types, and a complete example.

```sh
npm install @mstaicu/accounts-contracts@0.20.0
```

```js
import {
  AccountV1SubjectPrefix,
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "@mstaicu/accounts-contracts";
```

Consumers pin an exact package version and validate every received message. Once
a contract has live consumers, add a new schema version instead of changing its
wire shape.

Publishing is deliberately manual:

```sh
npm ci
npm run check
npm publish
```
