# Identity

Identity authenticates users. It owns users, passkeys, WebAuthn challenges,
sessions, refresh-token rotation, platform operators, and the JWKS used by
other APIs.

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

Every successful access-token exchange rotates the presented refresh token.
Clients must store the returned replacement. Other domains verify access tokens
through JWKS and make authorization decisions from their own state.

## Work here

```sh
make -C domains/identity check
make -C domains/identity migrate
make -C domains/identity deploy
make -C domains/identity dev
```

Add schema changes as `components/migrations/sql/V###__description.sql` and use
expand/contract for changes consumed by running code.
