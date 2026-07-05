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
make deploy-identity
make -C domains/identity check
```

## Rules

- Other domains verify tokens through JWKS and authorize from local state.
- Operator access is platform authority, not account membership authority.
- Do not add account, entitlement, or product concepts here.
