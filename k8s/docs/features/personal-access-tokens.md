# Personal access tokens

Status: Proposed

## Purpose

A personal access token (PAT) lets a user's unattended automation obtain the
same short-lived access token as that user. It proves identity; domain APIs
still decide authority from current domain facts.

## First version

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

| Operation     | Interface                                          | Authentication |
| ------------- | -------------------------------------------------- | -------------- |
| Create        | POST /v1/personal-access-tokens                    | Session token  |
| List metadata | GET /v1/personal-access-tokens                     | Session token  |
| Revoke        | DELETE /v1/personal-access-tokens/{id}             | Session token  |
| Exchange      | POST /v1/personal-access-tokens/{id}/access-tokens | PAT            |

Creation accepts name and expires_at; its response returns id, name, token, and
expires_at. List responses never contain token or secret_hash.

The exchange uses Authorization: Bearer <PAT>, has no body, and returns the
existing five-minute access-token response. Its JWT has the PAT owner's ID as
sub and never has operator.

- PAT management requires an existing session.
- A PAT cannot manage other PATs.
- Expired or revoked PATs cannot exchange for access tokens.
- Hash comparisons do not disclose which check failed.
- PATs and hashes never enter events, logs, or traces.

## Later

Constrained claims can be added only if a real use case needs them. OAuth is a
separate addition for third-party delegated applications. Ownership, expiry,
revocation, and the exchange boundary remain unchanged.

## Not included

- OAuth or OpenID Connect.
- Scopes, refresh tokens, or a new JWT format.
- Events: PATs are private Auth credentials.

## Build

1. Add the table.
2. Add create, list, revoke, and exchange services and routes.
3. Test one-time return, hashing, expiry, revocation, user isolation, and the
   absence of operator in exchanged tokens.
