# Machine identities

Status: Proposed

## Purpose

A machine identity lets an autonomous machine, agent, or external service act
as itself. It is not the vehicle, device, or product resource it operates.

## First version

Auth owns identities and credentials. Accounts owns account membership. Product
domains own their resources and decide product authority.

```sql
CREATE TABLE machine_identities (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE machine_credentials (
  id UUID PRIMARY KEY,
  machine_identity_id UUID NOT NULL REFERENCES machine_identities(id),
  name TEXT NOT NULL,
  secret_hash BYTEA NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);

CREATE TABLE machine_memberships (
  account_id UUID NOT NULL REFERENCES accounts(id),
  machine_identity_id UUID NOT NULL,
  version BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (account_id, machine_identity_id)
);
```

| Operation                | Interface                                                      |
| ------------------------ | -------------------------------------------------------------- |
| Create identity          | POST /v1/machine-identities                                    |
| Revoke identity          | DELETE /v1/machine-identities/{id}                             |
| Create credential        | POST /v1/machine-identities/{id}/credentials                   |
| List credential metadata | GET /v1/machine-identities/{id}/credentials                    |
| Revoke credential        | DELETE /v1/machine-identities/{id}/credentials/{credential_id} |
| Add to account           | PUT /v1/accounts/{account_id}/machine-identities/{id}          |
| Remove from account      | DELETE /v1/accounts/{account_id}/machine-identities/{id}       |

Humans manage identities and credentials; account owners manage membership.
Credential plaintext is returned once.

Machines exchange a credential for the existing five-minute access token:

```http
POST /oauth/token
Authorization: Basic <encoded client credentials>
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

The JWT uses the machine identity as sub, has no refresh token, and never has
operator.

```text
auth.machine-identity.created.v1
auth.machine-identity.deleted.v1
accounts.machine-membership.created.v1
accounts.machine-membership.deleted.v1
```

- Creating an identity grants no account or product authority.
- Revoking an identity prevents all its credentials creating new tokens.
- Removing membership removes authority in that account when a domain next
  evaluates current membership.
- Credentials and hashes never enter events, logs, or traces.

## Later

Replace the shared-secret proof with a public key or mTLS certificate, then
protect that key in hardware if needed. Identity, membership, token issuance,
and domain authorization remain unchanged.

## Not included

- Product resources, assignments, missions, or device control.
- Product roles or product authorization rules.
- Direct machine access to NATS.

## Build

1. Add Auth identity and credential storage, routes, events, and outbox.
2. Add Accounts membership storage, routes, events, and outbox.
3. Add Client Credentials exchange.
4. Test creation, exchange, expiry, revocation, membership removal, deletion,
   and replay.

References: [OAuth Client Credentials](https://www.rfc-editor.org/rfc/rfc6749#section-4.4)
and [OAuth client authentication](https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1).
