# `@mstaicu/plans-contracts`

The public message contract for the Plans domain. It contains the current
Account feature snapshot schema, validator, subject builder, event builder,
generated types, and a complete example.

```sh
npm install @mstaicu/plans-contracts@0.6.0
```

```js
import {
  AccountFeaturesV1SubjectPrefix,
  buildAccountFeaturesV1Subject,
  isAccountFeaturesSnapshotV1,
} from "@mstaicu/plans-contracts";
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
