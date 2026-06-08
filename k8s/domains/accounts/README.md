# Accounts Domain

Accounts owns account-scoped authority.

## Status

Core authority domain. Publishes current account/member facts.

## Owns

- `accounts`
- `account_members`
- `permissions`
- `roles`
- `role_permissions`
- `outbox_events`

Account memberships carry one role per member.

## Does Not Own

- identity records
- capability grants
- billing, payments, checkout, subscriptions
- product-domain resources

Other domains store `account_id` on account-owned resources and use local
projections for account existence, membership, and member permissions.

## Units

```text
postgres -> migrate -> api/worker
```

- `postgres`: local/CI placeholder database.
- `migrate`: Flyway Job from `packages/migrate`.
- `api`: Fastify API from `packages/api`.
- `worker`: outbox publisher from `packages/worker`.

## Public Contracts

```text
GET /v1/accounts
POST /v1/accounts
```

API docs: `GET api.tma.com/v1/accounts/docs`.

## Event Contracts

- [Events](contracts/events.md)

## Operations

```sh
make deploy-accounts
make dev-accounts
```

Live Flux units:

```text
accounts-postgres -> accounts-migrate -> accounts-api/accounts-worker
```

The API depends on identity/JWKS and ingress. The worker depends on event-bus.

## Agent Notes

- Request handlers do not publish authority events directly.
- State changes and `outbox_events` rows belong in the same DB transaction.
- Authority events use the account's current `version`.
- If managed Postgres replaces the placeholder, remove only `accounts-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
