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

## Processing and events

Every mutation locks the Account row first, verifies the caller is an owner,
changes the member, increments `accounts.version`, and records the matching
outbox event in one transaction. A no-op update emits nothing.

```sql
SELECT id, version FROM accounts WHERE id = $1 FOR UPDATE;
```

```text
accounts.member.created.v1
accounts.member.updated.v1
accounts.member.deleted.v1
```

Each event has this immutable data shape:

```json
{
  "account_id": "account-456",
  "member": { "user_id": "user-456", "role": "member" },
  "version": 8
}
```

The current single-owner baseline already emits `accounts.member.created.v1`.
This capability adds the update and deletion operations; a changed event shape
or meaning requires a new version.

## Evolution

| Stage | Strengthen | Add when |
| --- | --- | --- |
| Baseline | `owner` and `member`, last-owner protection, and versioned membership events. | A controlled first product. |
| Controlled | Notify affected members and retain durable evidence of membership changes. | Account access is operationally important. |
| High assurance | Require fresh WebAuthn authentication for sensitive owner changes; add product or Account policy for approval, separation of duties, and periodic access review. | Unauthorized membership changes have material consequences. |
