# Product member roles

Status: Proposed. Owner: the Product domain.

Accounts decides membership. A Product projects the Account members it needs and
stores its own role assignments. Accounts never stores Product vocabulary.

```text
GET    /v1/accounts/{account_id}/members/{user_id}/roles
PUT    /v1/accounts/{account_id}/members/{user_id}/roles/{role_id}
DELETE /v1/accounts/{account_id}/members/{user_id}/roles/{role_id}
```

An active Account owner manages roles; an active member reads only their own.
`PUT` and `DELETE` are idempotent. Role IDs are Product-defined.

Project `accounts.account.snapshot.v1` from `accounts.account.v1.<account-id>`.
In one transaction, ignore an old version; otherwise synchronize current
members, remove roles for departed members, and store the source version. Role
routes require a current projected member. Re-adding a member does not restore
removed Product roles.

Build this when a Product needs permissions beyond Account membership and its
generic `owner` grant. Keep invitation roles out of Accounts: when a Product
actually needs them, either Accounts exports current invitation state or the
Product owns that workflow.
