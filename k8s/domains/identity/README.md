# Identity Domain

Identity owns authentication identity.

## Status

Core authority domain. Publishes no domain events today.

## Owns

- `users`
- `operators`
- `passkey_credentials`
- `registration_challenges`
- `authentication_challenges`
- `sessions`
- `session_refresh_tokens`
- JWKS for identity-issued access-token verification

## Does Not Own

- accounts or memberships
- product permissions
- capability grants
- business-domain records

Users have an email account identifier. Passkeys authenticate users; they do not
grant product authority. Platform operators are users with full platform admin
rights.

## Units

```text
postgres -> migrate -> api -> ui
```

- `postgres`: local/CI placeholder database.
- `migrate`: Flyway Job from `packages/migrate`.
- `api`: Fastify API from `packages/api`.
- `ui`: Remix UI from `packages/ui`.

No worker exists. Add one only with a real event contract.

## Public Contracts

- JWKS: `GET api.tma.com/.well-known/jwks.json`
- Email-first passkey registration/login routes are under `/v1/passkeys`.
- Session token routes are under `/v1/sessions`.
- Operator routes are under `/v1/operators`.
- API docs: `GET api.tma.com/v1/identity/docs`
- UI routes: `/signup`, `/login`, and `/identity/assets/*` on `tma.com`.

## Event Contracts

- Publishes: none.
- Consumes: none.

## Operations

```sh
make deploy-identity
make dev-identity
```

Live Flux units:

```text
identity-postgres -> identity-migrate -> identity-api -> identity-ui
```

The placeholder Postgres unit uses the default `postgres` admin user. API,
cleanup, and migrate units use the same admin connection URL for now.

## Agent Notes

- Other domains verify tokens through JWKS and authorize from their own state.
- Do not add account, membership, or product permission concepts here.
- Operator access is platform authority, not account membership authority.
