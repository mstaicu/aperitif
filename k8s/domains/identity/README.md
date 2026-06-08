# Identity Domain

Identity owns authentication identity.

## Status

Core authority domain. Publishes no domain events today.

## Owns

- `users`
- `operators`
- `passkey_credentials`
- `challenges`
- `sessions`
- `session_refresh_tokens`
- JWKS for identity-issued access-token verification

## Does Not Own

- accounts or memberships
- product permissions
- capability grants
- business-domain records

Platform operators are DB-seeded users with full platform admin rights. Passkeys
authenticate users; they do not grant product authority.

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

Secrets stay per unit: `identity-migrate-db`, `identity-api-db`, and
`identity-api-jwt`.

## Agent Notes

- Other domains verify tokens through JWKS and authorize from their own state.
- Do not add account, membership, or product permission concepts here.
- Operator access is platform authority, not account membership authority.
- If managed Postgres replaces the placeholder, remove only `identity-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
