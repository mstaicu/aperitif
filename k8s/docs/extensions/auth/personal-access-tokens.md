# Personal access tokens

Status: Proposed. Owner: Auth.

A PAT lets unattended user automation obtain the owner's normal five-minute
access token. It proves identity; every domain still decides authority locally.

```text
POST   /v1/personal-access-tokens
GET    /v1/personal-access-tokens
DELETE /v1/personal-access-tokens/{id}
POST   /v1/personal-access-tokens/{id}/access-tokens
```

Creation requires a session, accepts a name and expiry, returns the raw token
once with `Cache-Control: no-store`, and stores only its hash. Listing returns
metadata only. Revocation is idempotent. Expired or revoked PATs cannot mint new
tokens; issued access tokens expire normally. A PAT cannot manage PATs and never
produces an `operator` claim.

PATs are private Auth credentials: no events, scopes, refresh tokens, OAuth/OIDC
surface, or new JWT format. Build them when a user needs unattended automation.
Add constrained claims, fresh authentication, proof of possession, or network
restrictions only when the actual token risk requires them.
