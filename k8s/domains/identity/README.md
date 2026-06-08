# Identity Domain

Identity owns authentication identity.

## Status

Core authority domain. Publishes no domain events today.

## Owns

- `users`
- `operator_permissions`
- `operator_roles`
- `operator_role_permissions`
- `operator_users`
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

Platform operator access uses DB-seeded operator roles and
`operator_permissions` JWT claims. Passkeys authenticate users; they do not
grant product authority.

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
- Operator role routes are under `/v1/operators`.
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
- Operator permissions are platform authority claims, not account permissions.
- If managed Postgres replaces the placeholder, remove only `identity-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
