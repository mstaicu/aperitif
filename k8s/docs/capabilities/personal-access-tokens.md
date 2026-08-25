# Personal access tokens

Status: Proposed

## Outcome

A personal access token (PAT) lets a user's unattended automation obtain the
same short-lived access token as that user. It proves identity; domain APIs
still decide authority from current domain facts.

Owner: Auth.

## Requires

- [Auth](../../domains/auth/README.md) for users, sessions, and access tokens.

## State

Auth stores only a hash of each PAT:

```sql
CREATE TABLE personal_access_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  secret_hash BYTEA NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);

CREATE INDEX personal_access_tokens_user_id_idx
ON personal_access_tokens (user_id);
```

The random secret is returned once and stored only as a hash.

| Operation     | Interface                                          | Authentication       |
| ------------- | -------------------------------------------------- | -------------------- |
| Create        | POST /v1/personal-access-tokens                    | Bearer session token |
| List metadata | GET /v1/personal-access-tokens                     | Bearer session token |
| Revoke        | DELETE /v1/personal-access-tokens/{id}             | Bearer session token |
| Exchange      | POST /v1/personal-access-tokens/{id}/access-tokens | Bearer PAT           |

Creation accepts `name` and `expires_at`; its `201 Created` response returns
`id`, `name`, raw `token`, and `expires_at` with `Cache-Control: no-store`.
List responses never contain the token or `secret_hash`.

PAT management uses the same bearer session token as
`POST /v1/session/access-tokens`. The exchange uses `Authorization: Bearer
<PAT>`, has no body, and returns the existing five-minute access-token response.
Its JWT has the PAT owner's ID as `sub` and never has `operator`.

PAT management requires an existing session; a PAT cannot manage other PATs.
`DELETE` sets `revoked_at` and is idempotent. Expired or revoked PATs cannot
exchange for an access token; an already issued access token expires normally.
Hash comparisons do not disclose which check failed. PATs and hashes never
enter events, logs, or traces.

## Later, if needed

Constrained claims can be added only if a real use case needs them. OAuth is a
separate addition for third-party delegated applications. Ownership, expiry,
revocation, and the exchange boundary remain unchanged.

## Not included

- OAuth or OpenID Connect.
- Scopes, refresh tokens, or a new JWT format.
- Events: PATs are private Auth credentials.

## Implementation checks

Test one-time return, hashing, expiry, revocation, user isolation, and the
absence of `operator` in exchanged tokens.
