# Account creation

**Rule.** Creating an account gives its creator the owner role. Analytics can observe that decision without access to Identity's database.

| Step | Observable result |
| --- | --- |
| A signed-in principal creates an account | Identity writes the account, membership, owner role, two creation events, and two current-state snapshots in one transaction. A rollback leaves none of them. |
| The relay publishes the rows | JetStream acknowledges each publication before the relay removes its row. A retry can deliver a message again. |
| Analytics receives a duplicate creation event | The same source and event ID contribute one recorded fact. |
| Analytics receives an older membership snapshot | The stored membership keeps its newer roles and version. |

Follow the [account transaction](../../identity/api/src/services/accounts/create.mjs), [published message examples](../../identity/contracts/examples/messages/), [relay](../../platform/outbox-relay/src/relay.mjs), and [Analytics projector](../../analytics/projector/src/identity-v1.mjs).
