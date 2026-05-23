# Capabilities Domain

Capabilities owns tenant capability authority:

```text
capabilities + tenant capabilities -> effective tenant capabilities event
```

It does not own commerce catalogues, checkout, subscriptions, payment provider
state, authentication, tenant records, memberships, or
business-domain records.

## Domain Boundary

- `capabilities` are the vocabulary of things the platform can enable for a tenant.
- `tenant_capability_grants` are current tenant-specific grant inputs from explicit grant
  commands. Effective tenant capability state is calculated from these rows when
  events are written.
- `projected_tenants` is the local tenant existence projection consumed from
  tenancy events.
- `outbox_events` is the durable publisher queue for capability authority events.

Identity stays in `identity`. Tenant records and memberships stay
in `tenancy`. Commerce catalogues, checkout, provider refs, invoices, and
payment status belong outside this domain. Capabilities only records explicit
capability grants.

## Core Model

```text
identity = who the actor is
tenant = authority root for tenant-scoped capability state
capability = capability that can be granted to a tenant
tenant_capability_grant = one current grant contribution for a tenant capability
tenant_capability = effective capability value calculated from current grants
```

The reducer is deliberately small:

```text
boolean_or
number_max
number_sum
```

## Core API

```text
GET /v1/capabilities
POST /v1/capabilities
```

Routes require an identity-issued access token verified through JWKS.
`POST /v1/capabilities` carries `tenant_id` and a `capabilities` array. Each capability
item carries its own `grant_id`.
It requires a platform operator access token.

## Deployment Units

The domain unit spine is:

```text
postgres -> migrate -> api/worker
```

Current Kubernetes-expressed units:

- `postgres`: local/CI PostgreSQL unit under `infra/postgres/overlays/{dev,live}`; live currently uses it as a placeholder until a managed database replaces it.
- `migrate`: one-shot Flyway migration Job built from `packages/migrate/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `packages/api/` and deployed from `infra/api/overlays/{dev,live}`.
- `worker`: tenancy projection consumer and capabilities outbox publisher built from `packages/worker/` and deployed from `infra/worker/overlays/{dev,live}` when event-bus is composed into the environment.

Current source-only units:

- `ui`: not present. Add it only when this domain owns a browser surface.

Keep each deployable unit independently addressable. Do not hide `postgres`,
`migrate`, `api`, or `worker` behind a fake all-in-one abstraction.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `capabilities-postgres-dev` applies `infra/postgres/overlays/dev`.
- `capabilities-migrate-dev` builds `mdstaicu/capabilities-migrate` from `packages/migrate/` and applies `infra/migrate/overlays/dev`.
- `capabilities-api-dev` builds `mdstaicu/capabilities-api` from `packages/api/`, applies `infra/api/overlays/dev`, and syncs `packages/api/src/**/*`.
- `capabilities-worker-dev` builds `mdstaicu/capabilities-worker` from `packages/worker/`, applies `infra/worker/overlays/dev`, and syncs `packages/worker/src/**/*`.

The Makefile preserves the startup order: run platform dependencies, run
`postgres`, run `migrate`, wait for the migration Job to complete, then start
`api` and `worker` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `capabilities-postgres` points at `domains/capabilities/infra/postgres/overlays/live`.
- `capabilities-migrate` points at `domains/capabilities/infra/migrate/overlays/live`, depends on `capabilities-postgres`, and uses `force: true`.
- `capabilities-api` points at `domains/capabilities/infra/api/overlays/live`, depends on `capabilities-migrate`, `identity-api`, and platform ingress.
- `capabilities-worker` points at `domains/capabilities/infra/worker/overlays/live`, depends on `capabilities-migrate`, `tenancy-worker`, and platform event-bus.

The live order must remain `postgres -> migrate -> api/worker`. The worker also
depends on `tenancy-worker` because the tenancy domain owns the `TENANCY` event
stream that capabilities consumes for local authority projections. Migration, API,
and worker images are built by the deployment workflow, live overlay digests are
pinned, and then Flux reconciles the live overlays.

Secrets are per deployable unit. Keep `capabilities-api-db`, `capabilities-migrate-db`,
and `capabilities-worker-db` as separate Secret names because the API, migrator,
and worker use different database roles.

When live moves to a managed database, remove `capabilities-postgres` from the Flux
graph, run the database bootstrap SQL against the managed database, and keep
`capabilities-migrate -> capabilities-api/worker`.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served through `api.tma.com/v1/capabilities/docs`.
- Identity dependency: capabilities validates identity-issued tokens through the identity JWKS URL and the shared API audience. It does not own identity records.
- Events: capabilities consumes tenancy authority events through the `capabilities-tenancy-projection` durable consumer on the tenancy-owned `TENANCY` stream. It publishes capability authority events from its own transactional outbox to the `CAPABILITIES` stream.
- Database: capabilities owns its schema and Flyway migration package in `packages/migrate/`. Other domains must not read or write this database directly.

## Tenancy Projection

Capabilities consumes this tenancy event subject into its local projection table:

- `tenancy.tenant.updated`

Projection writes are idempotent through natural keys and projection `version`.
Duplicate or stale events do not overwrite newer projected tenant rows.

If the capabilities projection database is intentionally reset while the `TENANCY`
stream survives, the durable consumer state must be reset too. Otherwise NATS has
already acked old events and the empty projection tables will not rebuild. The
safe rebuild shape is: stop the capabilities worker, clear the projection tables,
delete or rename the `capabilities-tenancy-projection` durable consumer, then start
the worker so `DeliverPolicy.All` replays the stream into the empty projection.

Tenancy event wire contracts live in `packages/worker/src/events/tenancy.mjs`.
Projection behavior lives in `packages/worker/src/tasks/project-tenancy.mjs`.
Add both sides deliberately when accepting a new tenancy event schema version.

## Capability Events

Capabilities emits tenant-level capability state calculated from `tenant_capability_grants`:

- `capabilities.tenant_capabilities.updated`

The event carries generic event `version` and the calculated effective tenant
capability rows inside the payload. Consumers should use `version` to ignore stale
events.

Producer contracts live in `packages/api/src/events/index.mjs`. The worker
publishes durable rows from `outbox_events` to the `CAPABILITIES` stream and then
marks them as published.
