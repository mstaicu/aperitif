# Tenancy Domain

Tenancy owns tenant-scoped authority.

## Status

Core authority domain. Publishes current tenant/member facts.

## Owns

- `tenants`
- `tenant_memberships`
- `permissions`
- `roles`
- `role_permissions`
- `outbox_events`

Tenant memberships carry one role per member.

## Does Not Own

- identity records
- capability grants
- billing, payments, checkout, subscriptions
- product-domain resources

Other domains store `tenant_id` on tenant-owned resources and use local
projections for tenant existence, membership, and member permissions.

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

## Event Contracts

- [Events](contracts/events.md)

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
- Authority events use the tenant's current `version`.
- If managed Postgres replaces the placeholder, remove only `tenancy-postgres`
  from the live graph and run `packages/migrate/bootstrap/managed-postgres.sql`.
