# Auth

Auth authenticates users. It owns users, passkeys, WebAuthn challenges,
sessions, platform operators, and the JWKS used by other APIs.

It does not own accounts, plans, or product resources.

## Runtime

```text
PostgreSQL -> migrations -> API -> UI
                          -> scheduled cleanup
```

| Part | Purpose |
| --- | --- |
| `components/api` | Passkey ceremonies, sessions, operator claims, JWKS, and OpenAPI |
| `components/ui` | Passkey signup and login |
| `components/migrations` | Flyway SQL and its Job |
| `infra/postgres` | Disposable in-cluster database |
| `components/cleanup` | Removes expired challenges and old sessions |

Auth currently publishes no domain events, so it has no outbox component.

## Public surface

- `/.well-known/jwks.json`
- `/v1/passkeys/*`
- `/v1/sessions/*`
- `/v1/auth/docs`
- `/signup` and `/login`

Every successful passkey registration or login creates an independent 30-day
session with its own refresh token. Exchanging that token validates the session
and returns a five-minute access token; it does not replace the refresh token or
extend the session. Revoking a refresh token revokes only that session. Other
domains verify access tokens through JWKS and make authorization decisions from
their own state.

## First operator

A new Auth database has no platform operators. Bootstrap exactly one after
that user registers:

1. Exchange the user's refresh token for an access token and read its `sub`
   claim.
2. Using a controlled administrative connection to the Auth database, run:

   ```sql
   INSERT INTO operators (user_id) VALUES ('<sub>');
   ```

3. Exchange the same refresh token again. The new access token now contains
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

Add schema changes as `components/migrations/sql/V###__description.sql` and use
expand/contract for changes consumed by running code.
