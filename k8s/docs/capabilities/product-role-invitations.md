# Product-role invitations

Status: Proposed

## Outcome

This extends [Account invitations](account-invitations.md):
an Account invitation can carry one or more Product roles without putting
Product vocabulary into Accounts. Accounts admits the person; the Product
activates its roles after admission.

Owner: the Product domain.

## Requires

- [Account invitations](account-invitations.md).
- [Product member roles](product-member-roles.md).

This capability is deferred until a Product has a concrete need to project
current invitation state. Accounts does not expose an invitation event contract
today.

## State

A Product that implements this capability stores its pending roles by Account
invitation ID. The Product may also keep a local invitation lifecycle record,
but its shape and synchronization rule depend on the source boundary chosen at
implementation time. Do not copy an Account revision or add a tombstone merely
to prepare for a hypothetical event stream.

## API

These routes belong to the Product API and require a bearer token:

```text
PUT    /v1/accounts/{account_id}/invitations/{invitation_id}/roles/{role_id}
```

An active Account owner may attach roles only when the invitation belongs to
that Account and is pending and unexpired. `PUT` adds one role, returns `204
No Content`, and is idempotent. Repeat it to attach more roles. Existing
Account members use the member-role routes instead. The Product rejects an
unknown `role_id`.

Pending roles are intentionally not editable. Before delivery, an owner who
needs to change them revokes the Account invitation and creates a new one.

The Product serializes assignment, activation, and cancellation for one
invitation, so a concurrent assignment cannot strand a pending role. The exact
lock follows the source boundary chosen when the capability is implemented.

## Activation rule

When a real Product needs this capability, first choose how it receives
current invitation state: an Accounts invitation resource feed or a
Product-owned workflow that does not project invitations. Define that boundary,
its complete representations, revisions, and removal behaviour before adding
role activation. The Product continues to use the Account state feed for its
local membership authorization.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | Pending Product roles activate only after Accounts admits the member. | A Product needs role-aware invitations. |
| Controlled | Use the delivery, notification, and audit upgrades from [Account invitations](account-invitations.md); record Product role assignment and activation evidence. | Invitations affect real operations. |
| High assurance | Require fresh authentication and Product policy approval for sensitive role assignments; gate activation on any required Product compliance decision. | The assigned role can perform high-impact or regulated work. |
