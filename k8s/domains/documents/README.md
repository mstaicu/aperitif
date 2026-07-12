# Documents Domain

Documents is the product proof domain.

## Owns

- `documents`
- `projected_account_members`
- `projected_account_entitlements`

Documents does not own identity, account authority, or entitlement authority.

## Units

```text
postgres -> migrate -> api/worker/ui
```

Database SQL lives in `packages/database/sql`; `infra/migrate` is the Flyway
job that runs it.

The worker consumes account and entitlement events. It publishes no events today.

## Public API

```text
POST /v1/accounts/:account_id/documents
GET  /v1/accounts/:account_id/documents
GET  /v1/documents/docs
```

The API checks identity JWTs, projected account membership, and projected
`documents.enabled` entitlement.

## Event Inputs

```text
accounts.account.opened.v1
entitlements.account_entitlements.updated.v1
```

Use the producer domains' `packages/contracts` as the source of event shape.

## Operations

```sh
make -C domains/documents check
make -C domains/documents migrate
make -C domains/documents deploy
make -C domains/documents dev
```

`migrate` deploys the Documents Postgres instance and runs its migrations.
`deploy` migrates the database, then applies Documents once. `dev` runs
`migrate`, then starts only the Documents API, worker, and UI development loop.
Shared platform units and other domains are started separately when needed.
Documents remains local-only and is never reconciled by production Flux.

## Rules

- Do not call core domains synchronously for hot-path authorization.
- Do not read other domains' databases.
