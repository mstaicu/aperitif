# Access

Choose access by identifying the actor and whose authority it is using. Do not
begin with OAuth.

## Model

```text
identity    durable record representing a human or machine
principal   identity to which a request is attributed; JWT sub identifies it
client      software presenting the request
credential  long-lived proof exchanged for an access token
authority   what current domain facts allow the principal to do
delegation  ceiling placed on authority given to another client
account     ownership and authorization boundary; never an identity
```

| Actor                             | Human present    | Credential                 | Exchange                 |
| --------------------------------- | ---------------- | -------------------------- | ------------------------ |
| Human using an owned client       | At login         | Session created by passkey | First-party              |
| Automation acting as a human      | No               | Personal access token      | First-party              |
| Machine acting independently      | No               | Machine credential         | OAuth Client Credentials |
| Independent app acting as a human | At authorization | OAuth grant                | OAuth Authorization Code |

Only the first row exists today. The others are additive and do not replace
passkeys.

## Access-token boundary

Every mechanism produces the same five-minute signed JWT. Domain APIs never
receive passkey responses, sessions, PATs, machine secrets, or OAuth grants.

Before introducing another principal type, give every access JWT this common
profile:

```json
{
  "iss": "https://api.tma.com",
  "aud": "https://api.tma.com",
  "sub": "principal-uuid",
  "principal_type": "human",
  "iat": 1787392800,
  "exp": 1787393100
}
```

APIs validate the signature, issuer, audience, and expiry. They use `sub` and
`principal_type` to load current authorization facts from their own database.
JWT claims identify the caller; they do not replace membership, roles, plans,
compliance, or resource ownership.

## Human session

The current flow is:

```text
passkey -> session -> access JWT -> domain API
```

Each browser or mobile installation receives an independent opaque session.
Only Auth receives the session token. A session-derived access JWT may carry
the existing `operator` claim. It also carries the session's original
authentication time:

```json
{
  "sub": "human-uuid",
  "principal_type": "human",
  "auth_time": 1787392800
}
```

`auth_time` comes from session creation, not access-token issuance. Sensitive
credential operations can therefore require a passkey authentication within a
short configured window without adding another authentication mechanism.

When PATs are added, use one neutral first-party exchange for both opaque
credential types:

```http
POST /v1/access-tokens
Authorization: Bearer <session-or-pat>
```

Prefixes select the lookup without guessing:

```text
tma_session_<random-value>
tma_pat_<random-value>
```

## Personal access token

A PAT lets unattended software act as one human:

```text
Alice -> PAT -> script -> JWT with sub=Alice
```

Auth owns:

```text
personal_access_tokens(id, user_id, name, token_hash,
                       created_at, expires_at, revoked_at)
```

```http
POST   /v1/personal-access-tokens
GET    /v1/personal-access-tokens
DELETE /v1/personal-access-tokens/{id}
```

Creation returns plaintext once; Auth stores only its hash. Creation requires
a human session JWT with no `pat_id` and a recent `auth_time`, never another
PAT.

The PAT is exchanged at `POST /v1/access-tokens`:

```json
{
  "sub": "human-uuid",
  "principal_type": "human",
  "pat_id": "pat-uuid"
}
```

PAT-derived JWTs never inherit `operator`. The first version may omit scopes;
it then receives the human's current non-operator authority, still constrained
by domain checks. If scopes are later added, store the maximum with the PAT and
allow exchanges to narrow but never widen it.

## Machine identity

An autonomous UAV, agent, or external service acts as itself:

```text
machine identity -> credential -> OAuth Client Credentials -> access JWT
```

```json
{
  "sub": "machine-identity-uuid",
  "principal_type": "machine",
  "client_id": "machine-identity-uuid",
  "credential_id": "credential-uuid"
}
```

Machine identities are account-bound and have no human `owner` or `member`
role. See [UAV.md](UAV.md) for their complete implementation contract.

## Independent application

OAuth Authorization Code with PKCE is needed only when an independent app must
ask a human for delegated access. That requires client registration, redirect
URI validation, consent, authorization codes, scopes, and token exchange. It
is not planned for the current use cases.

OIDC is also unnecessary today. It standardizes client login on top of OAuth;
publishing JWKS for API JWT verification does not require it.

## Authorization

```text
valid access JWT
  + principal belongs to the requested account
  + current domain role or assignment
  + current plan and compliance facts
  + business invariants
  = operation allowed
```

Scopes, when present, are only an additional ceiling:

```text
effective authority = current domain authority intersected with scopes
```

Enforce token-profile and scope rules at the HTTP boundary. Keep credential
types out of business services.

## Invariants

- Generate long-lived credentials from secure random bytes.
- Return plaintext once; store only a hash.
- Never put credentials or hashes in JWTs, events, logs, or traces.
- Give every credential an expiry and individual revocation.
- Rate-limit credential management and token exchanges.
- Issue no refresh token for PAT or Client Credentials exchanges.
- Require TLS outside disposable local development.
- Use one signing-key set and one access-token profile.
- Never propagate `operator` through PATs, machines, or delegated OAuth.

## Sequence

```text
current   passkey -> session -> access JWT
next      PAT -> access JWT
later     machine credential -> Client Credentials -> access JWT
optional  Authorization Code -> access JWT
```

References: [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749),
[OAuth security BCP](https://www.rfc-editor.org/rfc/rfc9700),
[JWT access-token profile](https://www.rfc-editor.org/rfc/rfc9068), and
[PKCE](https://www.rfc-editor.org/rfc/rfc7636).
