# Account membership

Status: Proposed. Owner: Accounts.

Accounts already owns generic membership:

```text
account_id  Account boundary
user_id     Auth user
role        owner | member
```

This extension adds owner-managed listing, role change, and removal:

```text
GET    /v1/accounts/{account_id}/members
PATCH  /v1/accounts/{account_id}/members/{user_id}
DELETE /v1/accounts/{account_id}/members/{user_id}
```

An Account must retain one owner. `PATCH` is a no-op when the role is unchanged;
`DELETE` is idempotent. Human admission remains the invitation boundary, not a
public `POST /members`.

Each mutation locks the Account, verifies the caller is an owner, changes the
member, increments the Account revision, and writes the complete newer Account
representation to the outbox in one transaction. There are no member CRUD feed
events. Products reconstruct current membership from the Account resource feed.

Build it when Account owners need to manage existing members. Notifications,
fresh authentication, durable evidence, approvals, and review follow only when
access risk requires them.
