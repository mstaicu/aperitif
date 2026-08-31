# Auth

Auth proves user identity. It owns users, passkeys, WebAuthn challenges,
sessions, platform operators, and the JWKS used to verify its access tokens.
It does not own Accounts, Plans, or product resources.

## Implemented workloads

```text
PostgreSQL -> migrations -> API -> UI
                          -> scheduled cleanup
```

| Workload | Responsibility |
| --- | --- |
| `postgres` | Auth's current local PostgreSQL instance |
| `migrations` | Flyway schema changes |
| `api` | Passkey ceremonies, sessions, operator claim, JWKS, and OpenAPI |
| `ui` | Passkey signup and login |
| `cleanup` | Remove expired challenges and old sessions |

Auth currently publishes no domain events, has no outbox table, and deploys no
Outbox Relay.

## Public surface

```text
POST   /v1/passkeys/registration/options
POST   /v1/passkeys/registration
POST   /v1/passkeys/authentication/options
POST   /v1/passkeys/authentication
POST   /v1/session/access-tokens
DELETE /v1/session
GET    /.well-known/jwks.json
GET    /v1/auth/docs
GET    /signup and /login
```

Each successful registration or login creates one independent 30-day session.
Its session token can mint five-minute access tokens without rotating or extending
the session. Deleting a session revokes only that session. Other domains verify
tokens through JWKS and make authorization decisions from their own state.

## First operator

A new Auth database has no operators. After the first user registers:

1. Exchange that user's session token for an access token and read `sub`.
2. Through a controlled administrative database connection, run:

   ```sql
   INSERT INTO operators (user_id) VALUES ('<sub>');
   ```

3. Exchange the session token again; the new access token contains
   `operator: true`.

There is no operator-management HTTP API. Keep the operator set under controlled
database administration until a real product requirement justifies one.

## Work here

```sh
make -C domains/auth check
make -C domains/auth migrate
make -C domains/auth deploy
make -C domains/auth dev
```

Add schema changes as `workloads/migrations/sql/V###__description.sql` and use
expand/contract while running code consumes the schema.
