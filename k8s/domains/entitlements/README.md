# Entitlements Domain

Entitlements owns generic account entitlement authority.

## Status

Core authority domain. Publishes effective account entitlement snapshots.

## Owns

- `entitlements`: seeded vocabulary and merge rules.
- `account_entitlement_grants`: current grant contributions.
- `projected_accounts`: local account existence projection.
- `outbox_events`: durable entitlement event queue.

Effective account entitlements are calculated from current grants when events are
written. They are not stored as a separate hot-path table.

## Does Not Own

- commerce catalogues
- checkout, subscriptions, invoices, payment provider state
- account records or memberships
- product-domain resources

Other domains may call these concepts features, entitlements, limits, checks, or
flags in their own language. This domain stores the generic authority model.

## Model

Supported value types:

```text
boolean
number
```

Supported merge strategies:

```text
boolean_or
number_max
number_sum
```

## Units

```text
postgres -> migrate -> api/worker
```

- `postgres`: local/CI placeholder database.
- `migrate`: Flyway Job from `packages/migrate`.
- `api`: Fastify API from `packages/api`.
- `worker`: accounts projection consumer and outbox publisher.

## Operator API

```text
GET /v1/entitlements
POST /v1/entitlements
DELETE /v1/entitlements
```

`POST` sets grant rows. `DELETE` revokes grant rows. Each requested entitlement
item carries its own `grant_id`.

## Event Contracts

- [Events](contracts/events.md)

Consumes:

| Subject | Producer | Meaning |
| --- | --- | --- |
| `accounts.account_member.updated` | `accounts` | Account existence snapshot carried by member lifecycle. |

The event is a full account entitlement snapshot with one event-level `version`.

## Operations

```sh
make deploy-entitlements
```

Live Flux units:

```text
entitlements-postgres -> entitlements-migrate -> entitlements-api/entitlements-worker
```

The worker depends on accounts events and event-bus.

## Agent Notes

- Do not add billing/product catalogue concepts to this domain.
- Projection writes are idempotent by natural key plus `version`.
- If projection tables are reset while NATS streams survive, reset the matching
  durable consumer before restarting the worker.
- The placeholder Postgres unit uses the default `postgres` admin user. API,
  worker, and migrate units use the same admin connection URL for now.
