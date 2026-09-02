# Machines

Status: Proposed. Owner: Auth.

A machine is a non-human principal. It is not the device, vehicle, or Product
resource it operates. Auth creates immutable machine IDs, stores credential
hashes, and exchanges a machine credential for the normal five-minute access
token. A machine token has its machine ID as `sub` and never has `operator`.

```text
POST   /v1/machines
DELETE /v1/machines/{machine_id}
POST   /v1/machines/{machine_id}/credentials
GET    /v1/machines/{machine_id}/credentials
DELETE /v1/machines/{machine_id}/credentials/{credential_id}

POST /oauth/token
Authorization: Basic base64(<machine_id>:<credential_secret>)
grant_type=client_credentials
```

Create a random 32-byte secret, return it once with `Cache-Control: no-store`,
and store only its SHA-256 hash. Credentials expire and revoke independently.
Machine revocation blocks new tokens; issued tokens expire normally. A
replacement credential may exist before the old one is revoked.

This is a narrow Client Credentials exchange. It does not require browser OAuth,
OIDC, PKCE, refresh tokens, or machine lifecycle events. Product domains must
not assume every JWT subject is human. Machine Account context is a separate
[Account machine-membership](../accounts/machine-membership.md) decision.

Start with a shared secret. Move to `private_key_jwt`, mTLS, or hardware-backed
keys only when device compromise and the operating cost justify it.
