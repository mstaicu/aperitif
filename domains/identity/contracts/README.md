# @mstaicu/identity-contracts

The public current-state contracts emitted by Identity for Accounts and
Memberships. New consumers depend on this package; they do not use the legacy
Accounts contract package.

## Current contracts

| Resource | NATS subject | CloudEvent type | CloudEvent subject |
| --- | --- | --- | --- |
| Account | `identity.account.v1.<account-id>` | `identity.account.snapshot.v1` | `account/<account-id>` |
| Membership | `identity.membership.v1.<membership-id>` | `identity.membership.snapshot.v1` | `membership/<membership-id>` |

Both message families are retained as current state in the `IDENTITY` JetStream
stream. The NATS subject is transport metadata; the CloudEvent `subject` is
inside the event. Consumers validate both with the exported validators and
subject builders.

```sh
npm install @mstaicu/identity-contracts@0.1.0
```

```js
import {
  buildMembershipV1Subject,
  isMembershipSnapshotV1,
} from "@mstaicu/identity-contracts";

if (
  !isMembershipSnapshotV1(event) ||
  natsSubject !== buildMembershipV1Subject(event.data.id)
) {
  throw new Error("INVALID_IDENTITY_MEMBERSHIP_SNAPSHOT");
}
```

Consumers pin an exact version and validate every received message. Once a
contract has live consumers, a changed wire shape requires a new version. A
snapshot is a complete current representation, not a command, delta, or audit
record.

## Package checks and publishing

```sh
npm ci
npm run check
npm publish
```
