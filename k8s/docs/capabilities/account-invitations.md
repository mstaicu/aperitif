# Account invitations

Status: Proposed

## Outcome

An Account owner admits a human without knowing their user ID. The recipient
registers or logs in, then uses a one-time secret to become an Account `member`.
It works for `individual` and `organization` Accounts.

Owner: Accounts.

## Requires

- [Auth](../../domains/auth/README.md) for the recipient's access token.
- [Accounts](../../domains/accounts/README.md) for membership and events.

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
An invitation is a bearer credential until accepted: it is deliberately not
bound to an email, phone number, or recipient.

## API

All routes belong to Accounts:

```text
POST   /v1/accounts/{account_id}/invitations
GET    /v1/accounts/{account_id}/invitations
POST   /v1/accounts/{account_id}/invitations/{invitation_id}
DELETE /v1/accounts/{account_id}/invitations/{invitation_id}
```

An owner creates an invitation with a future `expires_at` within the configured
maximum lifetime. It returns `201 Created`, `Cache-Control: no-store`, and:

```json
{
  "invitation": {
    "id": "invite-123",
    "expires_at": "2026-09-01T12:00:00.000Z"
  },
  "secret": "<one-time-secret>"
}
```

The owner delivers the ID and secret by any channel. `GET` lists invitation
metadata only. `DELETE` revokes a pending invitation only. Creation, listing,
and deletion require an Account owner.

After obtaining an Auth access token, the recipient accepts with:

```http
POST /v1/accounts/account-456/invitations/invite-123
Authorization: Bearer <access-token>

{ "secret": "<one-time-secret>" }
```

First success returns `201 Created` with the membership. A retry by that same
user returns `200 OK` with it. Missing, expired, wrong-secret, or used-by-a-
different-user requests return one indistinguishable failure. Accounts always
looks up an invitation by both `account_id` and `invitation_id`.

There is no public `POST /members`: invitations are human admission. Existing
members use [Account membership management](account-membership-management.md).

## Processing and events

Every write locks the Account row first. While the lock is held, every
event-bearing change increments `accounts.version` and writes its outbox event
in the same transaction.

```sql
SELECT id, version FROM accounts WHERE id = $1 FOR UPDATE;
```

```text
valid pending invitation + caller is not a member
  -> create member and accounts.member.created.v1
  -> record invitation.user_id and accounts.invitation.updated.v1

accepted by the same member
  -> return the existing membership

revoke or expire pending invitation
  -> accounts.invitation.deleted.v1
```

Acceptance uses two consecutive Account versions: one for the member-created
event and one for the invitation update. Expiry uses the same deletion path as
owner revocation.

```text
accounts.invitation.created.v1
accounts.invitation.updated.v1
accounts.invitation.deleted.v1
```

Creation and deletion carry this data:

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

The acceptance update also carries the active member:

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

Repeating the member in the update lets Products activate pending roles even
when the member-created and invitation-update events arrive in either order.

## Evolution

| Stage          | Strengthen                                                                                                                                                                                                           | Add when                                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Baseline       | One-time bearer secret with expiry and generic acceptance failures.                                                                                                                                                  | A controlled first product.                                              |
| Controlled     | Deliver the same ID and secret through a verified channel; rate-limit acceptance; notify owners of creation, acceptance, expiry, and revocation.                                                                     | Invite delivery and account access become operationally important.       |
| High assurance | Bind an invitation to a verified recipient identity; require fresh WebAuthn authentication for sensitive invitation changes; record durable audit evidence and require approval where the Account policy demands it. | A stolen invitation or unauthorized admission has material consequences. |
