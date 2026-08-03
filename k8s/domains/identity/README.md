# Identity

Identity authenticates users. It owns users, passkeys, WebAuthn challenges,
sessions, platform operators, and the JWKS used by other APIs.

It does not own accounts, entitlements, or product resources.

## Runtime

```text
PostgreSQL -> migrations -> API -> UI
                          -> scheduled cleanup
```

| Part | Purpose |
| --- | --- |
| `components/api` | Passkey ceremonies, sessions, operators, JWKS, and OpenAPI |
| `components/ui` | Passkey signup and login |
| `components/migrations` | Flyway SQL and its Job |
| `infra/postgres` | Disposable in-cluster database |
| `infra/cleanup` | Removes expired challenges and old sessions |

Identity currently publishes no domain events, so it has no publisher.

## Public surface

- `/.well-known/jwks.json`
- `/v1/passkeys/*`
- `/v1/sessions/*`
- `/v1/operators/*`
- `/v1/identity/docs`
- `/signup` and `/login`

Every successful passkey registration or login creates an independent 30-day
session with its own refresh token. Exchanging that token updates the session's
last-used time and returns a five-minute access token; it does not replace the
refresh token. Revoking a refresh token revokes only that session. Other domains
verify access tokens through JWKS and make authorization decisions from their
own state.

## First operator

A new Identity database has no platform operators. Bootstrap exactly one after
that user registers:

1. Exchange the user's refresh token for an access token and read its `sub`
   claim.
2. Using a controlled administrative connection to the Identity database, run:

   ```sql
   INSERT INTO operators (user_id) VALUES ('<sub>');
   ```

3. Exchange the same refresh token again. The new access token now contains
   `operator: true` and can manage later operators through `/v1/operators/*`.

There is deliberately no unauthenticated operator-bootstrap endpoint.

## Work here

```sh
make -C domains/identity check
make -C domains/identity migrate
make -C domains/identity deploy
make -C domains/identity dev
```

Add schema changes as `components/migrations/sql/V###__description.sql` and use
expand/contract for changes consumed by running code.
