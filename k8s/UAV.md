# UAV machine identity

This is the product-agnostic implementation contract for an autonomous UAV,
agent, or external service. It covers identity, account membership,
credentials, access tokens, rotation, and revocation—not devices, missions,
commands, telemetry, or other product resources.

## Model

```text
account             ownership and authorization boundary
machine identity    durable Auth record for one autonomous actor
machine membership  relationship between that identity and one account
principal           machine identity while making a request
credential          secret or key proving the identity
access token        five-minute JWT presented to APIs
```

Do not call the identity a service account. Give every independently revocable
UAV or agent its own identity and credentials.

The three independent facts are:

```text
machine identity exists
        +
it has active membership in an account
        +
it has an active credential
```

None grants product-specific authority.

## Ownership

Auth owns identities and credentials, as it does for humans:

```text
machine_identities(id, name, created_by_user_id,
                   version, created_at, revoked_at)

machine_credentials(id, machine_identity_id, name, secret_hash,
                    created_at, expires_at, revoked_at)
```

Accounts owns membership, as it does for human members:

```text
machine_memberships(account_id, machine_identity_id,
                    version, created_at, deleted_at)
```

`machine_identity_id` is unique in `machine_memberships`: the first version
allows one account per machine identity. A machine identity is not an
`account_member` and has no human `owner` or `member` role.

Accounts projects machine identity lifecycle events so it can reject unknown
or revoked identities. Auth projects account owners and machine memberships so
it can authorize credential management and token issuance. Neither domain
calls the other's database.

Credential values and hashes never leave Auth.

## 1. Create the identity

An authenticated human calls Auth:

```http
POST /v1/machine-identities
Authorization: Bearer <human-access-token>
Content-Type: application/json
```

```json
{
  "name": "warehouse-uav-17"
}
```

```http
HTTP/1.1 201 Created
```

```json
{
  "id": "2df3fd44-20e0-4e68-8180-da438c59ef28",
  "name": "warehouse-uav-17",
  "created_at": "2026-08-23T12:00:00Z"
}
```

Auth emits `auth.machine-identity.created.v1`. The identity is inert until it
is accepted into an account and receives a credential.

## 2. Add it to an account

An active owner calls Accounts:

```http
PUT /v1/accounts/7f156a57-b410-45cc-8657-e0ea5bd026fc/machine-identities/2df3fd44-20e0-4e68-8180-da438c59ef28
Authorization: Bearer <human-access-token>
```

There is no request body. Accounts verifies that the caller is both the
identity creator and an active account owner. It then creates the membership
and outbox event in one transaction:

```http
HTTP/1.1 201 Created
```

```json
{
  "account_id": "7f156a57-b410-45cc-8657-e0ea5bd026fc",
  "machine_identity_id": "2df3fd44-20e0-4e68-8180-da438c59ef28",
  "created_at": "2026-08-23T12:01:00Z"
}
```

If Accounts has not projected the identity yet, it returns `409` with problem
code `MACHINE_IDENTITY_NOT_READY`; the client may retry.

## 3. Create a credential

After Auth has projected the membership, any current owner of the account may
call with a human session JWT whose `auth_time` is inside the configured fresh
authentication window:

```http
POST /v1/machine-identities/2df3fd44-20e0-4e68-8180-da438c59ef28/credentials
Authorization: Bearer <human-access-token>
Content-Type: application/json
```

```json
{
  "name": "primary",
  "expires_at": "2027-08-23T00:00:00Z"
}
```

Auth generates at least 32 random bytes and stores only the unique SHA-256
hash:

```http
HTTP/1.1 201 Created
Cache-Control: no-store
Pragma: no-cache
```

```json
{
  "id": "44c66081-a191-4193-8759-b038f7a2d27f",
  "client_id": "2df3fd44-20e0-4e68-8180-da438c59ef28",
  "client_secret": "tma_machine_random-one-time-value",
  "expires_at": "2027-08-23T00:00:00Z"
}
```

If Auth has not projected the membership or current owner yet, it returns `409`
with problem code `MACHINE_MEMBERSHIP_NOT_READY`; the client may retry.

`client_id` is the public machine identity ID. The plaintext secret is returned
once and provisioned through a secure channel.

Credential management returns metadata, never the secret:

```http
GET    /v1/machine-identities/{machine_identity_id}/credentials
DELETE /v1/machine-identities/{machine_identity_id}/credentials/{credential_id}
```

## 4. Exchange the credential

The actor uses OAuth Client Credentials:

```http
POST /oauth/token
Authorization: Basic base64(<client_id>:<client_secret>)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

Auth accepts only that grant and requires an active identity, membership, and
credential. It returns no refresh token:

```http
HTTP/1.1 200 OK
Cache-Control: no-store
Pragma: no-cache
```

```json
{
  "access_token": "eyJ...",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

The JWT contains no secret or account authority:

```json
{
  "iss": "https://api.tma.com",
  "aud": "https://api.tma.com",
  "sub": "2df3fd44-20e0-4e68-8180-da438c59ef28",
  "principal_type": "machine",
  "client_id": "2df3fd44-20e0-4e68-8180-da438c59ef28",
  "credential_id": "44c66081-a191-4193-8759-b038f7a2d27f",
  "iat": 1787486400,
  "exp": 1787486700
}
```

APIs use `sub` to check current account membership and domain assignments.
`client_id` and `credential_id` support protocol handling and auditing; they
grant nothing.

The token endpoint returns standard errors without identifying which
credential field was wrong:

| Condition                     | Status and body                          |
| ----------------------------- | ---------------------------------------- |
| Invalid client authentication | `401 {"error":"invalid_client"}`         |
| Malformed request             | `400 {"error":"invalid_request"}`        |
| Other grant                   | `400 {"error":"unsupported_grant_type"}` |

Use `WWW-Authenticate: Basic` with `invalid_client` and rate-limit the endpoint.
No authorization endpoint, redirect, consent screen, refresh token, or OIDC is
required.

## Rotation and revocation

Rotate without downtime:

```text
create replacement -> provision it -> verify exchange -> revoke previous
```

Credential revocation prevents new access tokens. Existing JWTs expire within
five minutes.

Remove all account authority at the owning boundary:

```http
DELETE /v1/accounts/{account_id}/machine-identities/{machine_identity_id}
Authorization: Bearer <human-access-token>
```

Accounts records a versioned membership tombstone. Auth then rejects every
credential for the unassociated identity. Other domains apply the same
tombstone before authorizing it.

Deactivate the identity itself:

```http
DELETE /v1/machine-identities/{machine_identity_id}
Authorization: Bearer <human-access-token>
```

Auth permits this only for the creator while the identity is unassociated, or
for a current owner while it is associated. It records a tombstone and rejects
all credentials. Accounts applies the identity tombstone to its projection and
membership.

Never physically delete canonical or projected identity and membership rows;
older events must not restore access.

## Events

Auth publishes immutable full-state identity contracts:

```text
auth.machine-identity.created.v1
auth.machine-identity.deleted.v1
```

Accounts publishes immutable full-state membership contracts:

```text
accounts.machine-membership.created.v1
accounts.machine-membership.deleted.v1
```

They follow the repository event contract and receive snapshot tests.
Credentials and hashes are never published.

## Implementation sequence

```text
1. Auth identity table, routes, events, and contract snapshots.
2. Accounts identity projector, membership table, routes, and events.
3. Auth membership/owner projector and versioned tombstones.
4. Auth credential table and owner-only management routes.
5. Common issuer, audience, principal type, subject, and expiry JWT profile.
6. OAuth Client Credentials at POST /oauth/token.
7. Tests for projection, exchange, expiry, rotation, owner removal,
   credential revocation, and both tombstone directions.
```

The invariant is:

> Auth owns identities and credentials. Accounts owns membership. Domains
> decide what the resulting principal may do.

Shared secrets can later become `private_key_jwt`, mTLS, or hardware-backed
keys without changing identity ownership, account membership, or access-token
claims.
