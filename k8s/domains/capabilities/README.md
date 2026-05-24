# Capabilities Domain

Capabilities owns generic tenant capability authority.

## Owns

- `capabilities`: seeded vocabulary and merge rules.
- `tenant_capability_grants`: current grant contributions.
- `projected_tenants`: local tenant existence projection.
- `outbox_events`: durable capability event queue.

Effective tenant capabilities are calculated from current grants when events are
written. They are not stored as a separate hot-path table.

## Does Not Own

- commerce catalogues
- checkout, subscriptions, invoices, payment provider state
- tenant records or memberships
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
- `worker`: tenancy projection consumer and outbox publisher.

## Public Contracts

```text
GET /v1/capabilities
POST /v1/capabilities
DELETE /v1/capabilities
```

`POST` adds grant rows. `DELETE` revokes grant rows. Each requested capability
item carries its own `grant_id`.

Current event subject:

```text
capabilities.tenant_capabilities.updated
```

The event is a full tenant capability snapshot with one event-level `version`.

## Operations

```sh
make deploy-capabilities
make dev-capabilities
```

Live Flux units:

```text
capabilities-postgres -> capabilities-migrate -> capabilities-api/capabilities-worker
```

The worker depends on tenancy events and event-bus.

## Agent Notes

- Do not add billing/product catalogue concepts to this domain.
- Projection writes are idempotent by natural key plus `version`.
- If projection tables are reset while NATS streams survive, reset the matching
  durable consumer before restarting the worker.
- If managed Postgres replaces the placeholder, remove only
  `capabilities-postgres` from the live graph and run
  `packages/migrate/bootstrap/managed-postgres.sql`.
