# `@mstaicu/accounts-contracts`

The public message contract for the Accounts domain. It contains the current
Account snapshot schema, validator, subject builder, event builder, generated
types, and a complete example.

```sh
npm install @mstaicu/accounts-contracts@0.17.0
```

```js
import {
  AccountV1SubjectPrefix,
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "@mstaicu/accounts-contracts";
```

Consumers must pin an exact package version and validate every received message.
Never change a published wire schema. Add a new schema version beside the old
one, publish both while consumers migrate, and retire the old feed only after its
last consumer has moved.

Publishing is deliberately manual:

```sh
npm ci
npm run check
npm publish
```
