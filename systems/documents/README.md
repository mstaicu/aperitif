# Systems

Each business system owns a capability from its data to its release. Platform supplies shared infrastructure.

## Rules

- A system owns its data, migrations, public contracts, and deployment. Other systems use its API or published messages.
- Identity establishes who the caller is and their account memberships. Each product decides what a member may do and owns its commercial rules.
- Scope customer-owned records and actions to the account. A caller from another account must be unable to read or change them.
- Add a package, worker, broker, or contract when a use case needs it. A domain can start with one API and its deployment.
- When publishing a business change, commit the change and its outbox entry together. Consumers must tolerate redelivery.
- Keep one module per wire type in the domain's `contracts/src/messages/`. Use the wire type as the filename stem in `src/messages/`, `examples/messages/`, and `test/messages/`. Keep its NATS subject alongside its schema and expose named exports from the package root.
- Give each snapshot contract a fixed `<domain>.snapshot.<resource>.vN` subject and each fact a `<domain>.event.<resource>.<action>.vN` subject. Put the resource ID and revision in the snapshot payload.
- Snapshot producers start each resource at `data.version = 1`. When a mutation changes its exported state, explicitly increment the revision once and enqueue the full snapshot in the same transaction. Retries and re-exports of unchanged state keep the same revision.
- Snapshot consumers insert a missing projection. For an existing projection of the same resource, update only when the incoming revision is greater. Enforce that comparison in the database write and acknowledge the message after commit.
- Version each message independently. Identity's v1 schemas reject extra fields in both `data` and the CloudEvents envelope. Adding a field, changing a fixed value such as `source`, or changing a field's meaning requires a new wire type and NATS subject. Values such as event `id`, occurrence `time`, and snapshot revision can vary within one wire version. CloudEvents `specversion` identifies the envelope standard.

## Examples

| When | Expected result |
| --- | --- |
| A caller belongs only to account A and requests a product record owned by account B | The product denies access even when the caller knows the record ID. |
| A team adds an API-only domain | Its package and reusable manifests live under its system. Each cluster explicitly selects whether to install it. |
| Identity creates an account while the relay is stopped | Account creation completes. The committed outbox rows remain available for publication. |
| The account-created message needs a new field while consumers still use v1 | Publish the original payload on `identity.event.account.created.v1` and the new payload with type `identity.account.created.v2` on `identity.event.account.created.v2`. Each consumer processes one version. Retire v1 publication after the last v1 consumer migrates. |

The [account creation walkthrough](examples/account-creation.md) follows a shipped behavior. The [farm UAV scenario](examples/automated-farm.md#uav-example) illustrates how a product could use Identity's proposed machine credentials and account membership.

## References

- [Identity source packages and manifests](../identity/) · [Account-created v1 contract](../identity/contracts/src/messages/identity.account.created.v1.mjs) · [Install a workload](../../clusters/documents/README.md)
