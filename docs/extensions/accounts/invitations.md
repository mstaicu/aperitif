# Account invitations

Status: Proposed. Owner: Accounts.

An owner can admit a human without knowing their user ID. Accounts returns an ID
and one-time 32-byte secret; the owner delivers both. Accounts stores only the
secret hash. The secret never enters events, logs, or traces.

```text
POST   /v1/accounts/{account_id}/invitations
GET    /v1/accounts/{account_id}/invitations
POST   /v1/accounts/{account_id}/invitations/{invitation_id}
DELETE /v1/accounts/{account_id}/invitations/{invitation_id}
```

Only Account owners create, list, or revoke pending invitations. An authenticated
recipient accepts with the secret. First acceptance creates membership and
returns `201`; a retry by the same user returns `200`. Missing, expired,
wrong-secret, and already-used-by-another-user cases are indistinguishable.

An invitation is a bearer credential, not an email or phone assertion. It has an
expiry and may be revoked while pending. It is private Accounts state: creation,
expiry, and revocation do not change Account state. Acceptance locks the Account,
adds the member, increments the Account version, and emits the complete newer
Account representation in the same transaction.

Build it when human admission needs an API. Add verified delivery, rate limiting,
notifications, or recipient binding only when their concrete risk justifies them.
