# Accounts Domain

Accounts owns the resource boundary that product data lives under.

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
accounts.account.opened
```

## Operations

```sh
make deploy-accounts
make -C domains/accounts check
```

## Rules

- State changes and `outbox_events` rows belong in the same DB transaction.
- Events use the account's current `version`.
- Do not read identity or entitlement databases.
