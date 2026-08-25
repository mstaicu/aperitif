# Account membership management

Status: Proposed

## Outcome

After Accounts admits a human, an Account owner can view, change, and remove
that Account's members. It works for both `individual` and `organization`
Accounts.

Owner: Accounts.

## Requires

- [Account membership invitations](account-membership-invitations.md) to admit
  a new human.

## State

This capability uses the Accounts-owned `account_members` table. It adds no
table and no new Account role:

```text
account_id  Account boundary
user_id     Auth user
role        owner | member
```

An Account must always retain at least one `owner`. Product-specific roles are
separate; see [Product member roles](product-member-roles.md).

## API

These routes belong to Accounts and require an owner bearer token:

```text
GET    /v1/accounts/{account_id}/members
PATCH  /v1/accounts/{account_id}/members/{user_id}
DELETE /v1/accounts/{account_id}/members/{user_id}
```

`GET` returns the Account's current generic members:

```json
{
  "members": [
    { "user_id": "user-123", "role": "owner" },
    { "user_id": "user-456", "role": "member" }
  ]
}
```

`PATCH` sets one existing member's generic role:

```http
PATCH /v1/accounts/account-456/members/user-456

{ "role": "owner" }
```

It returns `200 OK` with the current member. Setting the current role is a
successful no-op. `DELETE` removes one existing member and returns `204 No
Content`. Both operations reject removing or demoting the last owner.

There is deliberately no `POST /members`. An invitation acceptance is the only
human-admission operation.

## Processing

Every membership mutation locks the Account row first. That serializes all
membership changes for that Account and makes the last-owner rule reliable:

```sql
SELECT id, version FROM accounts WHERE id = $1 FOR UPDATE;
```

While the lock is held, Accounts verifies that the caller is an owner, changes
the member, increments `accounts.version`, and records the corresponding event
with the mutation. A no-op `PATCH` does not increment the version or publish an
event.

## Events

The existing published contracts are the complete member snapshots:

```text
accounts.member.created.v1
accounts.member.updated.v1
accounts.member.deleted.v1
```

Each has this data shape:

```json
{
  "account_id": "account-456",
  "member": { "user_id": "user-456", "role": "member" },
  "version": 8
}
```

The current single-owner baseline emits `accounts.member.created.v1` for the
initial owner. This capability later enables the update and deletion events.
All three contracts remain immutable: a meaning or shape change requires a new
event version.
