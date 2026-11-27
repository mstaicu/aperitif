# Identity

Identity authenticates a principal and records their account memberships. The UI exercises the API.

## Rules

- Registration creates the principal, first passkey, and session together. Authentication with that passkey starts a separate session for the same principal. Each ceremony needs a fresh challenge.
- A live session can mint an access token for up to five minutes, bounded by session expiry. Logout revokes that session. Identity checks the live session when accepting its access tokens.
- Account creation is explicit. The creator becomes an `account.owner` in the same transaction. The account list shows only the caller's memberships.
- Identity publishes generic membership. Permissions such as who may dispatch a vehicle belong to the product.

## Examples

| When | Expected result |
| --- | --- |
| A new user completes registration and lists accounts | The list is empty. After creating their first account, they see it with the owner role. |
| A user signs in on two devices and logs out on one | Identity rejects the revoked session's credentials. The other session can still mint access tokens. |

**Open question.** Must the first product reject an issued access token immediately after logout? A product checking only signature and expiry may accept it until it expires.

## Proposed

- Machine access for unattended clients. [OAuth 2.0 client credentials](machines.md) · [Machine membership](machine-membership.md) · [Farm UAV example](../../docs/examples/automated-farm.md#uav-example)
- Isolated development and promotion of tested releases. [Acceptance criteria](development-and-release.md)

## References

- [HTTP routes and generated OpenAPI](../api/src/routes/v1/index.mjs) · [Session verification](../api/src/services/sessions/authenticate.mjs) · [Account creation and listing](../api/src/services/accounts/)
- [Message contracts](../contracts/src/messages/) · [Browser scenarios](../ui/test/e2e/identity.spec.mjs)
- [Run and test Identity locally](run-locally.md)
