# Account membership

Status: Proposed. Owner: Accounts.

Accounts already owns generic membership:

```text
account_id  Account boundary
user_id     Auth user
owner       optional generic Account grant
```

This extension adds owner-managed listing, owner grants, and removal:

```text
GET    /v1/accounts/{account_id}/members
PUT    /v1/accounts/{account_id}/members/{user_id}/roles/owner
DELETE /v1/accounts/{account_id}/members/{user_id}/roles/owner
DELETE /v1/accounts/{account_id}/members/{user_id}
```

An Account must retain one owner. Owner grant and removal are idempotent, as is
member removal. Human admission remains the invitation boundary, not a public
`POST /members`.

Each mutation locks the Account, verifies the caller is an owner, changes the
membership or owner grant, increments the Account revision, and writes the
complete newer Account representation to the outbox in one transaction. There
are no member CRUD feed events. Products reconstruct current membership from
the Account resource feed.

Build it when Account owners need to manage existing members. Notifications,
fresh authentication, durable evidence, approvals, and review follow only when
access risk requires them.
