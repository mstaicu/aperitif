# Account membership management

Status: Proposed

## Outcome

After a human joins an Account, an owner can list, change, and remove that
Account's generic members. It works for `individual` and `organization`
Accounts.

Owner: Accounts.

## Requires

- [Accounts](../../domains/accounts/README.md) for the Account and membership
  boundary.

## State

This uses the existing Accounts `account_members` table. It adds neither a
table nor a role:

```text
account_id  Account boundary
user_id     Auth user
role        owner | member
```

An Account always retains one `owner`. Product roles remain Product state; see
[Product member roles](product-member-roles.md).

## API

These Accounts routes require an owner access token:

```text
GET    /v1/accounts/{account_id}/members
PATCH  /v1/accounts/{account_id}/members/{user_id}
DELETE /v1/accounts/{account_id}/members/{user_id}
```

`GET` returns the current members. `PATCH` accepts `{ "role": "owner" }` or
`{ "role": "member" }`, returns the member, and is a successful no-op when
the role is unchanged. `DELETE` returns `204 No Content`. Both reject removing
or demoting the last owner.

There is no `POST /members`: [Account invitations](account-invitations.md) are
the human-admission mechanism.

## Processing and Account state

Every mutation locks the Account row first, verifies the caller is an owner,
changes the member, increments `accounts.version`, reads the complete Account
with its current members, and replaces the still-pending Account snapshot in
the outbox in the same transaction. A no-op update emits nothing.

```sql
SELECT id, version FROM accounts WHERE id = $1 FOR UPDATE;
```

The published resource representation remains the existing Account state feed:

```text
subject: accounts.account.v1.<account-id>
type:    accounts.account.changed.v1
data:    complete Account, including all current members, and its version
```

There are no `accounts.member.created`, `.updated`, or `.deleted` projection
events. A later Product can bootstrap from the one current Account record and
reconcile its complete member set; it does not depend on a retained sequence of
membership deltas. A data-shape change or new meaning starts a complete V2
Account feed under the root event-processing contract.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | `owner` and `member`, last-owner protection, and a complete versioned Account state feed. | A controlled first product. |
| Controlled | Notify affected members and retain durable evidence of membership changes. | Account access is operationally important. |
| High assurance | Require fresh WebAuthn authentication for sensitive owner changes; add product or Account policy for approval, separation of duties, and periodic access review. | Unauthorized membership changes have material consequences. |
