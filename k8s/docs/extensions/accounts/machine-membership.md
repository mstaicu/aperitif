# Account machine membership

Status: Proposed. Owner: Accounts.

An owner may attach an Auth-issued machine ID to an Account. This gives Account
context only; Product domains decide what the machine may do.

```text
PUT    /v1/accounts/{account_id}/machines/{machine_id}
DELETE /v1/accounts/{account_id}/machines/{machine_id}
```

Both routes require a human Account owner and are idempotent. The relationship is
many-to-many. Accounts stores the opaque machine ID without synchronously looking
up Auth: an unknown ID is inert and cannot later identify a different machine
because Auth IDs are never reused.

This is private Accounts state until another domain needs it. Then define a
separate current relationship feed with its own identifier, complete
representation, revision, and removal rule. Do not overload the Account revision
or begin with membership deltas.

Build it when a product needs a machine to have Account context. Add enrollment
approval or stronger machine proof only when misattachment has material impact.
