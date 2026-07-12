# Identity Domain

Identity owns authentication.

## Owns

- users
- operators
- passkey credentials
- registration/authentication challenges
- sessions and refresh tokens
- JWKS for identity-issued access tokens

Identity does not own accounts, product authority, or business resources.

## Units

```text
postgres -> migrate -> api -> ui -> cleanup
```

Database SQL lives in `packages/database/sql`; `infra/migrate` is the Flyway
job that runs it.

No worker exists because identity publishes no domain events today.

## Public API

- JWKS: `GET /.well-known/jwks.json`
- Passkeys: `/v1/passkeys/*`
- Sessions: `/v1/sessions/*`
- Operators: `/v1/operators/*`
- Docs: `GET /v1/identity/docs`
- UI: `/signup`, `/login`, `/identity/assets/*`

## Operations

```sh
make -C domains/identity check
make -C domains/identity migrate
make -C domains/identity deploy
make -C domains/identity dev
```

`migrate` ensures the disposable Identity database is ready and reruns its
migration Job. `deploy` applies Identity once. `dev` runs `migrate` and starts
only Identity's Skaffold loop. Shared platform units are started separately
when needed. Production is reconciled only by Flux.

## Rules

- Other domains verify tokens through JWKS and authorize from local state.
- Operator access is platform authority, not account membership authority.
- Do not add account, entitlement, or product concepts here.
