# Account membership invitations

Status: Proposed

## Outcome

An Accounts owner admits a human who is not already an Account member without
knowing their user ID. The recipient registers or logs in, then exchanges a
one-time secret for an Account `member` membership.

Owner: Accounts.

## Requires

- [Auth](../../domains/auth/README.md) for the recipient's bearer access token.
- [Accounts](../../domains/accounts/README.md) membership and event boundary.

## State

Accounts stores only a hash of a random 32-byte secret. The raw secret is
returned once and never enters a database, event, log, or trace.

```sql
CREATE TABLE account_invitations (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  secret_hash BYTEA NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_id UUID
);

CREATE INDEX account_invitations_pending_expiry
  ON account_invitations (expires_at)
  WHERE user_id IS NULL;

CREATE INDEX account_invitations_account_expiry
  ON account_invitations (account_id, expires_at);
```

`user_id IS NULL` means pending; otherwise it identifies the accepting user.
`accounts.version` orders every Accounts event, including invitation events.

An invitation is a bearer credential until accepted: whoever has its ID and
secret may use it before expiry. It is deliberately not bound to a recipient.

## API

All routes belong to Accounts and require a bearer token.

```text
POST   /v1/accounts/{account_id}/invitations
GET    /v1/accounts/{account_id}/invitations
POST   /v1/accounts/{account_id}/invitations/{invitation_id}
DELETE /v1/accounts/{account_id}/invitations/{invitation_id}
```

An owner creates an invitation with a future expiry within the configured
maximum lifetime:

```http
POST /v1/accounts/account-456/invitations

{ "expires_at": "2026-09-01T12:00:00.000Z" }
```

```json
{
  "invitation": {
    "id": "invite-123",
    "expires_at": "2026-09-01T12:00:00.000Z"
  },
  "secret": "<one-time-secret>"
}
```

Return `201 Created` with `Cache-Control: no-store`. The owner delivers the ID
and secret by any channel.

The recipient submits the secret after obtaining an Auth bearer token:

```http
POST /v1/accounts/account-456/invitations/invite-123
Authorization: Bearer <access-token>

{ "secret": "<one-time-secret>" }
```

First success returns `201 Created` with the membership and its `Location`.
The same accepted user may retry and receives `200 OK` with that membership.
Missing, expired, wrong-secret, and already-used-by-another-user requests have
one indistinguishable failure. `GET` and `DELETE` are owner operations; delete
only revokes a pending invitation. Accounts always looks up an invitation by
both `account_id` and `invitation_id`.

There is no public `POST /members`: invitations are human admission. Existing
members use [Account membership management](account-membership-management.md)
and Product-role routes.

## Processing

Every write against an existing Account locks its row first:

```sql
SELECT id, version FROM accounts WHERE id = $1 FOR UPDATE;
```

While that lock is held, each event-bearing change increments
`accounts.version` and writes its outbox event in the same transaction.

An Accounts cleanup removes expired pending invitations by the same rule. An
expiry is an invitation deletion: it increments the Account version and emits
`accounts.invitation.deleted.v1`.

```text
pending invitation + caller is not a member
  → create member
  → member-created at the next Account version
  → record invitation user_id
  → invitation-updated at the following Account version

accepted by this active member
  → return the existing membership

all other cases
  → generic failure
```

## Events

Accounts publishes:

```text
accounts.invitation.created.v1
accounts.invitation.updated.v1
accounts.invitation.deleted.v1
```

Creation and deletion carry the complete invitation state:

```json
{
  "account_id": "account-456",
  "invitation": {
    "id": "invite-123",
    "expires_at": "2026-09-01T12:00:00.000Z",
    "user_id": null
  },
  "version": 5
}
```

The acceptance update carries both the accepted invitation and current member:

```json
{
  "account_id": "account-456",
  "invitation": {
    "id": "invite-123",
    "expires_at": "2026-09-01T12:00:00.000Z",
    "user_id": "user-789"
  },
  "member": { "user_id": "user-789", "role": "member" },
  "version": 7
}
```

`accounts.member.created.v1` precedes that update. Repeating the member in the
later invitation event lets a Product safely activate pending roles even when
the two messages arrive in either order.
