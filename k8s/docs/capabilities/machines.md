# Machines

Status: Proposed

## Outcome

A machine is a non-human principal that proves itself to Auth and exchanges a
credential for a short-lived access token. It is not the vehicle, device, or
Product resource it operates.

Owner: Auth.

## Requires

- [Auth](../../domains/auth/README.md) for users, sessions, credentials, and
  access tokens.

## State

Auth stores machines and credential hashes:

```sql
CREATE TABLE machines (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE machine_credentials (
  id UUID PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines(id),
  name TEXT NOT NULL,
  secret_hash BYTEA NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);

CREATE INDEX machine_credentials_machine_id_idx
ON machine_credentials (machine_id);
```

Auth generates machine IDs and never reuses them. In the first version, the
human who creates a machine is its only manager. Account membership is a
separate, many-to-many relationship; see
[Account machine membership](account-machine-membership.md).

## API

These routes belong to Auth:

```text
POST   /v1/machines
DELETE /v1/machines/{machine_id}

POST   /v1/machines/{machine_id}/credentials
GET    /v1/machines/{machine_id}/credentials
DELETE /v1/machines/{machine_id}/credentials/{credential_id}
```

Machine management requires the current human's session token. Machine access
tokens and machine credentials cannot create, delete, or rotate machines.

`POST /v1/machines` accepts `{ "name": "field-drone-01" }` and returns the
new machine. `POST /credentials` accepts `name` and `expires_at`, and returns
credential metadata plus the raw secret once with `201 Created` and
`Cache-Control: no-store`.

Creating a credential generates 32 cryptographically random bytes, encodes
them as base64url, and stores only their SHA-256 hash. Listing returns metadata
only. Secrets and hashes never enter events, logs, or traces.

`DELETE` on a credential sets `revoked_at` and is idempotent. `DELETE` on a
machine sets its `revoked_at`, is idempotent, and prevents every credential
from issuing another token. An already issued access token remains valid until
its normal five-minute expiry.

The machine exchanges its ID and credential for the existing five-minute
access token:

```http
POST /oauth/token
Authorization: Basic base64(<machine_id>:<credential_secret>)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

This is a narrow OAuth Client Credentials exchange. It does not add browser
authorization, PKCE, OpenID Connect, or third-party delegation.

`machine_id` is the OAuth `client_id`; the credential secret is its proof. The
JWT uses that machine ID as `sub`, has no refresh token, and never has
`operator`. Product APIs must not assume a JWT `sub` identifies a human.

Creating a replacement credential before revoking the old one lets a machine
prove the replacement works without downtime.

## Events

Machines are private Auth state in the first version. Auth does not publish
machine lifecycle events and therefore does not need an outbox for this
capability. No Account machine-membership projection feed exists yet; add one
only when a Product has a concrete cross-domain need for current membership.

## Evolution

Each stage keeps the same machine and Client Credentials exchange. It changes
only the proof presented to Auth.

| Stage | Proof | Auth stores | Machine stores | Add when |
| --- | --- | --- | --- | --- |
| Baseline | 32-byte shared secret | SHA-256 hash | Secret | You control deployment and can protect device configuration. |
| Strong remote device | `private_key_jwt` | Public JWK | Private key | You can enroll device public keys and do not want a reusable secret. |
| Managed fleet | mTLS client certificate | Trusted CA and certificate mapping | Private key and certificate | You operate certificate issuance and renewal. |
| High assurance | Hardware-backed key | Public JWK or certificate | Non-exportable TPM, secure-element, or HSM key | Credential extraction is a realistic threat. |

`private_key_jwt` signs a short-lived assertion with the machine private key;
Auth verifies it with the stored public JWK. mTLS proves private-key possession
during the TLS handshake. Hardware backing protects the key used by either
method from export.

Start with the random secret. Move only when the stronger proof justifies its
operational cost.

## Not included

- Account membership or Account authority.
- Product resources, assignments, missions, or authorization rules.
- Direct machine access to NATS.
