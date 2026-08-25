# Product member roles

Status: Proposed

## Outcome

Accounts decides who belongs to an Account. A Product decides what an active
member may do in that Product.

Owner: the Product domain.

## Requires

- [Accounts](../../domains/accounts/README.md) membership events.

## State

Each Product projects the membership facts required for local authorization and
stores its own role assignments.

```sql
CREATE TABLE projected_account_members (
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  account_version BIGINT NOT NULL,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (account_id, user_id)
);

CREATE TABLE account_member_roles (
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (account_id, user_id, role_id)
);
```

`role_id` is Product vocabulary. Accounts never stores or interprets it.

## API

These routes belong to the Product API, not Accounts, and require a bearer
token:

```text
GET    /v1/accounts/{account_id}/members/{user_id}/roles
PUT    /v1/accounts/{account_id}/members/{user_id}/roles/{role_id}
DELETE /v1/accounts/{account_id}/members/{user_id}/roles/{role_id}
```

An active Account owner manages any member's roles. An active member reads only
their own roles. `PUT` and `DELETE` each manage one role, return `204 No
Content`, and are idempotent. A member may hold several roles. Routes reject a
`role_id` the Product does not define.

Each Product needs its own API host or unique gateway root: two Products cannot
claim the same public path. Role routes lock the target projected member before
changing roles. The membership projector locks that same row before marking it
deleted and removing roles, so a concurrent removal cannot leave an active role
behind.

## Projection rule

Consume `accounts.member.created.v1`, `accounts.member.updated.v1`, and
`accounts.member.deleted.v1`. For one `(account_id, user_id)`, apply a
snapshot only when `data.version > account_version`.

A deletion records `deleted_at` and removes that member's Product roles in the
same transaction. A later member snapshot can restore membership but never
restores removed Product roles. Role routes require an active projected member.
Keep the tombstone while older Accounts events may be replayed.

A Product using [Product-role invitations](product-role-invitations.md) also
applies the `member` snapshot in `accounts.invitation.updated.v1` by the same
version rule.

Product authorization follows its local projection. An Accounts membership
change takes effect in a Product after that Product commits the event.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | Product-defined roles, local membership projection, and idempotent role assignment. | The Product needs roles beyond Account owner/member. |
| Controlled | Keep an auditable role-change history and add Product-managed role definitions only when roles must be configured at runtime. | Role changes affect real operations or administrators need configuration. |
| High assurance | Add Product-specific separation-of-duties rules, approval for sensitive roles, just-in-time access, and periodic access review. | Product roles control high-impact or regulated actions. |
