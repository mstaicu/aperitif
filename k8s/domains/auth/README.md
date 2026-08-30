# Auth

Auth authenticates users. It owns users, passkeys, WebAuthn challenges,
sessions, platform operators, and the JWKS used by other APIs.

It does not own accounts, plans, or product resources.

## Runtime

```text
PostgreSQL -> migrations -> API -> UI
                          -> scheduled cleanup
```

| Part                    | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `api`                   | Passkey ceremonies, sessions, operator claims, JWKS, and OpenAPI |
| `ui`                    | Passkey signup and login                                         |
| `migrations`            | Flyway SQL                                                       |
| `deploy`                | Kubernetes workloads, including the database and migration Job   |
| `deploy/cleanup`        | Removes expired challenges and old sessions                      |

Auth currently publishes no domain events, so it has no outbox table or Outbox Relay
deployment.

## Public surface

- `POST /v1/passkeys/registration/options`
- `POST /v1/passkeys/registration`
- `POST /v1/passkeys/authentication/options`
- `POST /v1/passkeys/authentication`
- `POST /v1/session/access-tokens`
- `DELETE /v1/session`
- `GET /.well-known/jwks.json`
- `/v1/auth/docs`
- `/signup` and `/login`

Every successful passkey registration or login creates an independent 30-day
session with its own session token. The session can mint five-minute access
tokens without replacing its session token or extending its lifetime. Deleting
the session revokes only that session. Other
domains verify access tokens through JWKS and make authorization decisions from
their own state.

## First operator

A new Auth database has no platform operators. Bootstrap exactly one after
that user registers:

1. Exchange the user's session token for an access token and read its `sub`
   claim.
2. Using a controlled administrative connection to the Auth database, run:

   ```sql
   INSERT INTO operators (user_id) VALUES ('<sub>');
   ```

3. Exchange the same session token again. The new access token now contains
   `operator: true`.

There is no operator-management HTTP API. Manage the small operator set through
a controlled administrative database connection until that API is actually
needed.

## Work here

```sh
make -C domains/auth check
make -C domains/auth migrate
make -C domains/auth deploy
make -C domains/auth dev
```

Add schema changes as `migrations/sql/V###__description.sql` and use
expand/contract for changes consumed by running code.
