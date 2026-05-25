# Tenancy Domain

Tenancy owns tenant-scoped authority.

## Owns

- `tenants`
- `tenant_memberships`
- `outbox_events`

Tenant creation grants owner membership to the caller. There is no public member
management API yet.

## Does Not Own

- identity records
- capability grants
- billing, payments, checkout, subscriptions
- product-domain resources

Other domains store `tenant_id` on tenant-owned resources and authorize from
their local projections.

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
GET /v1/tenants
POST /v1/tenants
```

API docs: `GET api.tma.com/v1/tenants/docs`.

Current event subjects:

```text
tenancy.tenant.updated
tenancy.tenant_membership.updated
```

Events are current-state facts. Consumers use natural projection keys plus event
`version` and ack stale messages.

## Operations

```sh
make deploy-tenancy
make dev-tenancy
```

Live Flux units:

```text
tenancy-postgres -> tenancy-migrate -> tenancy-api/tenancy-worker
```

The API depends on identity/JWKS and ingress. The worker depends on event-bus.

## Agent Notes

- Request handlers do not publish authority events directly.
- State changes and `outbox_events` rows belong in the same DB transaction.
- Every authority-affecting event increments `tenants.version`.
- If managed Postgres replaces the placeholder, remove only `tenancy-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
