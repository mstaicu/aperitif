# Accounts Domain

Accounts owns the resource boundary that product data lives under.
Each account has a required `type`: `personal` or `business`.

## Owns

- `accounts`
- `account_members`
- `outbox_events`

New accounts create one `owner` member. Future member lifecycle belongs here.

Accounts does not own identity records, entitlement grants, payments, or product
resources.

## Units

```text
postgres -> migrate -> api/worker
```

Database SQL lives in `packages/database/sql`; `infra/migrate` is the Flyway
job that runs it.

The worker publishes outbox events.

## Public API

```text
GET  /v1/accounts
POST /v1/accounts
GET  /v1/accounts/docs
```

## Event Contracts

Contracts: `packages/contracts`.

Publishes:

```text
accounts.account.opened.v1
```

## Operations

```sh
make -C domains/accounts check
make -C domains/accounts migrate
make -C domains/accounts deploy
make -C domains/accounts dev
```

`migrate` deploys the Accounts PostgreSQL instance and runs its migrations in
the current disposable cluster. `deploy` applies Accounts once. `dev` runs
`migrate`, then starts only the Accounts API and worker development loop. Shared
platform units and Identity are started separately when the developer needs
live event or authenticated flows. Production is reconciled only by Flux.

## Rules

- State changes and `outbox_events` rows belong in the same DB transaction.
- Events use CloudEvents. `data.version` is the account state version.
- Do not read identity or entitlement databases.
