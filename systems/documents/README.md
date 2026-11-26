# Systems

Each business system owns a capability from its data to its release. Platform supplies shared infrastructure.

## Rules

- A system owns its data, migrations, public contracts, and deployment. Other systems use its API or published messages.
- Identity establishes who the caller is and their account memberships. Each product decides what a member may do and owns its commercial rules.
- Scope customer-owned records and actions to the account. A caller from another account must be unable to read or change them.
- Add a package, worker, broker, or contract when a use case needs it. A domain can start with one API and its deployment.
- When publishing a business change, commit the change and its outbox entry together. Consumers must tolerate redelivery.

## Examples

| When | Expected result |
| --- | --- |
| A caller belongs only to account A and requests a product record owned by account B | The product denies access even when the caller knows the record ID. |
| A team adds an API-only domain | Its package and reusable manifests live under its system. Each cluster explicitly selects whether to install it. |
| Identity creates an account while the relay is stopped | Account creation completes. The committed outbox rows remain available for publication. |

The [account creation walkthrough](examples/account-creation.md) follows a shipped behavior. The [farm UAV scenario](examples/automated-farm.md#uav-example) illustrates how a product could use Identity's proposed machine credentials and account membership.

## References

- [Identity source packages and manifests](../identity/) · [Install a workload](../../clusters/documents/README.md)
