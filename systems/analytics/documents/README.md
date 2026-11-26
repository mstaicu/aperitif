# Analytics

Analytics is a local integration consumer for Identity. Its reporting views describe facts it has observed.

## Rules

- Consume Identity's public feeds. Validate the message contract and routing subject before writing a projection.
- Store each occurrence once per `(source, id)`. Apply a snapshot only if its resource version is newer. Acknowledge after the database write commits.
- Consumer positions belong to the dataset. Restarting the projector resumes it. A new database can reconstruct only what JetStream still retains. Identity has no reseed command for a lost state stream.
- Readers use the versioned `reporting` views. An empty result means no matching event was collected. A session establishment can come from either signup or a later sign-in.

## Examples

| When | Expected result |
| --- | --- |
| The same account-created event arrives twice | Reports count one account-created fact. |
| Membership version 2 arrives after version 3 | The current-membership view still shows version 3's roles. |

## References

- [Projector](../projector/src/identity-v1.mjs) · [Consumer and acknowledgement logic](../projector/src/consumers.mjs) · [Reporting views and reader role](../migrations/sql/V001__init.sql)
- For local integration, [start Identity event delivery](../../identity/documents/run-locally.md#event-delivery), then run `make -C systems/analytics up` from the repository root. The [Makefile](../Makefile) also provides `dev`, `check`, and `down`.
- An external SQL reader needs both the `analytics_reader` role and network access. [Database NetworkPolicy](../infra/postgres/base/networkpolicy.yaml)
