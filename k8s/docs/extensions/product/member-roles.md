# Product member roles

Status: Proposed

## Outcome

Accounts decides who belongs to an Account. A Product decides what an active
member may do in that Product.

Owner: the Product domain.

## Requires

- [Accounts](../../../domains/accounts/README.md) Account state feed.

## State

Each Product projects the Account members required for local authorization and
stores its own role assignments.

```sql
CREATE TABLE projected_accounts (
  account_id UUID PRIMARY KEY,
  revision BIGINT NOT NULL
);

CREATE TABLE projected_account_members (
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
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
claim the same public path. Role routes lock the Account projection guard before
checking the target projected member and changing roles. The projector locks
that same guard before reconciling members, so a concurrent removal cannot
leave an active role behind.

## Projection rule

Consume the complete `accounts.account.changed.v1` representation from
`accounts.account.v1.<account-id>`. In one transaction, lock the Account guard,
ignore a snapshot whose `data.revision` is not newer, synchronize the current
members, remove Product roles for members no longer present, and store the new
revision.

Role routes require a current projected member. Re-adding a member does not
restore previously removed Product roles. The root event-processing contract
makes replay and out-of-order delivery safe without membership tombstones.

Product authorization follows its local projection. An Accounts membership
change takes effect in a Product after that Product commits the event.

## Invitation-time roles

If a Product needs to assign roles while a person is being invited, Accounts
still owns admission and the Product still owns its role vocabulary. Do not add
Product roles to Accounts or design a Product invitation API before the Product
can reliably learn the invitation's current state.

At that time, choose one boundary: Accounts exports a complete current
invitation resource feed, or the Product owns the invitation workflow itself.
Define its representations, revisions, and removal behaviour then. Until then,
the Product continues to use the Account state feed for membership
authorization and assigns roles only to active members.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | Product-defined roles, local membership projection, and idempotent role assignment. | The Product needs roles beyond Account owner/member. |
| Controlled | Keep an auditable role-change history and add Product-managed role definitions only when roles must be configured at runtime. | Role changes affect real operations or administrators need configuration. |
| High assurance | Add Product-specific separation-of-duties rules, approval for sensitive roles, just-in-time access, and periodic access review. | Product roles control high-impact or regulated actions. |
