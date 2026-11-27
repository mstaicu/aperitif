# Account creation

**Rule.** Creating an account gives its creator the owner role. Identity publishes that decision for other systems.

| Step | Observable result |
| --- | --- |
| A signed-in principal creates an account | Identity writes the account, membership, owner role, two creation events, and two current-state snapshots in one transaction. A rollback leaves none of them. |
| The relay publishes the rows | JetStream acknowledges each publication before the relay removes its row. A retry can deliver a message again. |
| A consumer receives a duplicate creation event | Count the fact once using its source and event ID. |
| A consumer receives an older membership snapshot | Keep the newer roles and version. |

Follow the [account transaction](../../identity/api/src/services/accounts/create.mjs), [published message examples](../../identity/contracts/examples/messages/), and [relay](../../platform/outbox-relay/src/relay.mjs).
