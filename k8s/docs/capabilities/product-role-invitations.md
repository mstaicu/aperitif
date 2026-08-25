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

## State

The Product projects invitation state and stores its pending roles.

```sql
CREATE TABLE projected_account_invitations (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_id UUID,
  account_version BIGINT NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE account_invitation_roles (
  invitation_id UUID NOT NULL
    REFERENCES projected_account_invitations(id),
  role_id TEXT NOT NULL,
  PRIMARY KEY (invitation_id, role_id)
);
```

One Account invitation may carry several roles in one Product. The Product
retains a deleted invitation row while older Accounts events may be replayed.

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

The assignment route locks the projected invitation before changing its pending
roles. Acceptance and deletion lock that same invitation before activating or
removing roles, so a concurrent assignment cannot strand a pending role.

## Activation rule

The owner creates the Account invitation, waits for this Product to project
`accounts.invitation.created.v1`, adds the intended Product roles, then
delivers the ID and secret.

On `accounts.invitation.deleted.v1`, the Product records the invitation
tombstone and removes its pending roles. On an acceptance update, it applies
the invitation and embedded member snapshots by Account version. In one local
transaction:

```text
if invitation is accepted and member is active:
  insert every pending role that still exists in this Product
  on conflict do nothing

remove all pending roles for the invitation
```

A retired Product role is discarded rather than making a valid Accounts event
fail. Replayed or stale invitation and member snapshots are ignored according
to the root event-processing contract; keep deletion rows while older Accounts
events may be replayed.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | Pending Product roles activate only after Accounts admits the member. | A Product needs role-aware invitations. |
| Controlled | Use the delivery, notification, and audit upgrades from [Account invitations](account-invitations.md); record Product role assignment and activation evidence. | Invitations affect real operations. |
| High assurance | Require fresh authentication and Product policy approval for sensitive role assignments; gate activation on any required Product compliance decision. | The assigned role can perform high-impact or regulated work. |
