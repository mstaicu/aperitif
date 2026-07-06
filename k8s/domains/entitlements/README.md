# Entitlements Domain

Entitlements owns account-level product authority.

## Owns

- `entitlements`
- `account_entitlement_grants`
- `projected_accounts`
- `account_entitlements_version_seq`
- `outbox_events`

Effective entitlements are calculated from current grants when snapshot events
are written.

Entitlements does not own catalogues, checkout, subscriptions, account records,
memberships, or product resources.

## Model

Value types:

```text
boolean
number
```

Merge strategies:

```text
boolean_or
number_max
number_sum
```

## Units

```text
postgres -> migrate -> api/worker
```

The worker projects accounts and publishes outbox events.

## Operator API

```text
GET  /v1/entitlements
POST /v1/entitlements/grants
POST /v1/entitlements/grants/revoke
GET  /v1/entitlements/docs
```

## Event Contracts

Contracts: `packages/contracts`.

Consumes:

```text
accounts.account.opened.v1
```

Publishes:

```text
entitlements.account_entitlements.updated.v1
```

## Operations

```sh
make deploy-entitlements
make -C domains/entitlements check
```

## Rules

- Do not add billing/catalogue concepts here.
- Projection writes are idempotent by natural key plus `version`.
- If a migration changes effective projected entitlements, insert fresh outbox
  snapshot rows in the same migration.
