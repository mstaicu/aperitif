# Machine identities

Status: Proposed

## Purpose

A machine identity lets an autonomous machine, agent, or external service act
as itself. It is not the vehicle, device, or product resource it operates.

## Provides

- A machine identity that can exchange its credential for an access token.
- Account-scoped machine membership facts and events for product domains.

## Requires

- [Auth](../../domains/auth/README.md) for identities, credentials, and access
  tokens.
- [Accounts](../../domains/accounts/README.md) for account membership.

## First version

Auth owns machine identities and credentials. Accounts owns machine membership.
Product domains own their resources and decide product authority.

Machine membership intentionally stays separate from human membership:
`account_members` holds humans and their `owner` or `member` role;
`account_machine_members` holds machines, which have no generic Accounts
role. Product domains decide what either kind of member may do.

### Auth schema

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
```

### Accounts schema

```sql
CREATE TABLE account_machine_members (
  account_id UUID NOT NULL REFERENCES accounts(id),
  machine_identity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, machine_identity_id)
);
```

`machine_identity_id` is an Auth-owned opaque ID, not a foreign key: Accounts
and Auth have separate databases.

Adding or removing membership increments `accounts.version` and writes the
corresponding outbox event in the same Accounts transaction. The canonical row
is deleted on removal; downstream projections retain versioned tombstones when
they need protection from older events.

| Owner    | Operation                | Interface                                                      |
| -------- | ------------------------ | -------------------------------------------------------------- |
| Auth     | Create identity          | POST /v1/machine-identities                                    |
| Auth     | Revoke identity          | DELETE /v1/machine-identities/{id}                             |
| Auth     | Create credential        | POST /v1/machine-identities/{id}/credentials                   |
| Auth     | List credential metadata | GET /v1/machine-identities/{id}/credentials                    |
| Auth     | Revoke credential        | DELETE /v1/machine-identities/{id}/credentials/{credential_id} |
| Accounts | Add to account           | PUT /v1/accounts/{account_id}/machine-identities/{id}          |
| Accounts | Remove from account      | DELETE /v1/accounts/{account_id}/machine-identities/{id}       |

For the first version, the human who created a machine identity manages that
identity and its credentials. Account owners manage only membership. Adding a
machine to an account grants it account context; it does not give every account
owner the ability to create or revoke that machine's credentials.

This keeps two separate facts separate:

```text
Auth     who the machine is and how it proves that identity
Accounts which account may use that machine
```

Shared credential administration, identity transfer, or multiple credential
managers are later capabilities. They are not implied by account membership.

### Credential generation and use

Creating a credential is an Auth operation performed by the identity creator:

1. Generate 32 cryptographically random bytes and encode them as base64url.
2. Hash that value with SHA-256.
3. Insert only the hash, credential ID, machine identity ID, name, expiry, and
   timestamps into `machine_credentials`.
4. Return the raw value once in the create response, alongside its ID and
   expiry. Never store, log, trace, or return it again.
5. The owner installs the machine identity ID and raw credential in the
   machine's protected configuration.

To rotate a credential, create a second credential, update the machine and
prove it can exchange it, then revoke the old credential. The brief overlap is
intentional: it avoids taking the machine offline during rotation.

At a high level, the Auth implementation is simply:

```js
const secret = randomBytes(32).toString("base64url");
const secretHash = createHash("sha256").update(secret).digest();

await pool.query(
  `INSERT INTO machine_credentials (
     id, machine_identity_id, name, secret_hash, expires_at
   ) VALUES ($1, $2, $3, $4, $5)`,
  [credentialId, machineIdentityId, name, secretHash, expiresAt],
);

return { id: credentialId, secret, expires_at: expiresAt };
```

SHA-256 is appropriate here because the secret is a machine-generated 256-bit
value, not a human password. On exchange, Auth hashes the presented secret,
looks up the matching unrevoked, unexpired credential for the supplied machine
identity, then issues the existing short-lived access token. It does not put
the secret or its hash in the token.

Machines exchange a credential for the existing five-minute access token:

```http
POST /oauth/token
Authorization: Basic base64(<machine_identity_id>:<credential_secret>)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

`machine_identity_id` is the OAuth `client_id`; the one-time-returned credential
secret is its proof. The JWT uses the machine identity as `sub`, has no refresh
token, and never has `operator`. This is only the Client Credentials token
exchange; it does not add browser authorization or third-party delegation.

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

## Hardening path

All options below keep the same machine identity, Accounts membership, and
`grant_type=client_credentials` exchange. They change only the proof that the
machine presents to Auth.

| Stage                       | Proof                   | Auth stores                        | Machine stores                                    | Use when                                                                        |
| --------------------------- | ----------------------- | ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| First version               | 32-byte shared secret   | SHA-256 hash                       | secret                                            | You control deployment and can protect a device configuration.                  |
| Strong remote device        | `private_key_jwt`       | public JWK                         | private key                                       | You can enroll each device public key and do not want a reusable shared secret. |
| Managed fleet               | mTLS client certificate | trusted CA and certificate mapping | private key and certificate                       | You operate certificate issuance and renewal.                                   |
| Physical-capture resistance | hardware-backed key     | public JWK or certificate          | non-exportable key in TPM, secure element, or HSM | Extracting a device credential is a realistic threat.                           |

`private_key_jwt` has the machine sign a short-lived JWT assertion with its
private key; Auth verifies it with the stored public JWK. mTLS has the machine
prove possession of its private key during the TLS handshake; Auth maps the
validated certificate to the machine identity. Hardware backing is not another
network protocol: it protects the private key used by either signed assertions
or mTLS from export.

Start with the random secret. Move to signed assertions when you need stronger
proof from remotely deployed machines; use mTLS when you already operate a
certificate lifecycle. Do not add either before its operational cost is real.

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

References: [OAuth Client Credentials](https://www.rfc-editor.org/rfc/rfc6749#section-4.4),
[JWT client assertions](https://www.rfc-editor.org/rfc/rfc7523#section-2.2),
and [OAuth mutual TLS](https://www.rfc-editor.org/rfc/rfc8705).
