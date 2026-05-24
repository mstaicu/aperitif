# Identity Domain

Identity owns authentication identity.

## Owns

- `users`
- `passkey_credentials`
- `challenges`
- `sessions`
- `session_refresh_tokens`
- JWKS for identity-issued access-token verification

## Does Not Own

- tenants or memberships
- product permissions
- capability grants
- business-domain records

Platform operator status is deployment-owned through `PLATFORM_OPERATOR_USER_IDS`.
Passkeys authenticate users; they do not grant product authority.

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
- Passkey registration/login routes are under `/v1/passkeys`.
- Session token routes are under `/v1/sessions`.
- API docs: `GET api.tma.com/v1/identity/docs`
- UI routes: `/signup`, `/login`, and `/identity/assets/*` on `tma.com`.

Identity emits no committed domain events today.

## Operations

```sh
make deploy-identity
make dev-identity
```

Live Flux units:

```text
identity-postgres -> identity-migrate -> identity-api -> identity-ui
```

Secrets stay per unit: `identity-migrate-db`, `identity-api-db`, and
`identity-api-jwt`.

## Agent Notes

- Other domains verify tokens through JWKS and authorize from their own state.
- Do not add tenant, membership, or product permission concepts here.
- If managed Postgres replaces the placeholder, remove only `identity-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
