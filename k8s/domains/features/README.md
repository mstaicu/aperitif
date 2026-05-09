# Features Domain

Features owns product feature vocabulary, local products, product prices, and
the local tenancy projections needed by future tenant feature grants.

## Domain Boundary

- `features` are the vocabulary of things the platform can enable.
- `products` are local things a tenant can acquire, such as plans, add-ons,
  top-ups, or manual packages.
- `product_features` are the feature values included in each product template.
- `product_prices` map local products to provider-specific sellable prices.
- `tenant_projection` and `tenant_membership_projection` are local projections
  of tenancy authority consumed from tenancy events.

Identity stays in `identity`. Tenant lifecycle, tenant memberships, and tenant
activation requirements stay in `tenancy`. Product domains such as a future
Salon CRM should own their own tenant-scoped resources and consume feature
state through APIs/events, not by reading the features database.

The current API is catalogue-only and does not create tenant entitlements,
subscriptions, checkout sessions, provider webhooks, invoices, usage counters,
or manual grants.

## Core Model

```text
identity = who the actor is
tenant = authority root for tenant-scoped product access
feature = product capability that can later be granted to a tenant
product = local commercial/access package
product_feature = product template value for one feature
product_price = provider-specific way to buy or acquire a product
```

`product_features` are templates. Future tenant grants should snapshot product
feature values into tenant-specific grant rows before calculating effective
tenant features. That prevents catalogue edits from silently changing existing
tenant state.

## Core API

```text
GET /v1/products
```

The route requires an identity-issued access token verified through JWKS. It
returns active products with active prices and active feature definitions.

## Deployment Units

The domain unit spine is:

```text
postgres -> migrate -> api/worker
```

Current Kubernetes-expressed units:

- `postgres`: local/CI PostgreSQL unit under `infra/postgres/overlays/{dev,live}`; live currently uses it as a placeholder until a managed database replaces it.
- `migrate`: one-shot Flyway migration Job built from `packages/database/` and deployed from `infra/migrate/overlays/{dev,live}`.
- `api`: Fastify API built from `packages/api/` and deployed from `infra/api/overlays/{dev,live}`.
- `worker`: tenancy projection consumer built from `packages/worker/` and deployed from `infra/worker/overlays/{dev,live}` when event-bus is composed into the environment.

Current source-only units:

- `ui`: not present. Add it only when this domain owns a browser surface.

Keep each deployable unit independently addressable. Do not hide `postgres`,
`migrate`, `api`, or `worker` behind a fake all-in-one abstraction.

## Local

Local development is driven by Skaffold modules in `skaffold.yaml`:

- `features-postgres-dev` applies `infra/postgres/overlays/dev`.
- `features-migrate-dev` builds `mdstaicu/features-migrate` from `packages/database/` and applies `infra/migrate/overlays/dev`.
- `features-api-dev` builds `mdstaicu/features-api` from `packages/api/`, applies `infra/api/overlays/dev`, and syncs `packages/api/src/**/*`.
- `features-worker-dev` builds `mdstaicu/features-worker` from `packages/worker/`, applies `infra/worker/overlays/dev`, and syncs `packages/worker/src/**/*`.

The Makefile preserves the startup order: run platform dependencies, run
`postgres`, run `migrate`, wait for the migration Job to complete, then start
`api` and `worker` in `skaffold dev`.

## Live

Live deployment is driven by Flux Kustomizations in `clusters/prod-eu/domains/`:

- `features-postgres` points at `domains/features/infra/postgres/overlays/live`.
- `features-migrate` points at `domains/features/infra/migrate/overlays/live`, depends on `features-postgres`, and uses `force: true`.
- `features-api` points at `domains/features/infra/api/overlays/live`, depends on `features-migrate`, `identity-api`, and platform ingress.
- `features-worker` points at `domains/features/infra/worker/overlays/live`, depends on `features-migrate`, `tenancy-worker`, and platform event-bus.

The live order must remain `postgres -> migrate -> api/worker`. The worker also
depends on `tenancy-worker` because the tenancy domain owns the `TENANCY` event
stream that features consumes for local authority projections. Migration, API,
and worker images are Flux-managed through
`clusters/prod-eu/image-automation/features.yaml`.

Secrets are per deployable unit. Keep `features-api-db`, `features-migrate-db`,
and `features-worker-db` as separate Secret names because the API, migrator,
and worker use different database roles.

When live moves to a managed database, remove `features-postgres` from the Flux
graph, run the database bootstrap SQL against the managed database, and keep
`features-migrate -> features-api/worker`.

## Contracts

- OpenAPI: routes are TypeBox/Fastify contracts mounted under `/v1`; generated docs are served through `api.tma.com/v1/features/docs`.
- Identity dependency: features validates identity-issued tokens through the identity JWKS URL and the shared product API audience. It does not own identity records.
- Events: features currently consumes tenancy authority events through the `features-tenancy-projection` durable consumer on the tenancy-owned `TENANCY` stream. It does not publish features events yet.
- Database: features owns its schema and Flyway migration package in `packages/database/`. Other domains must not read or write this database directly.

## Tenancy Projection

Features consumes these tenancy event subjects into local projection tables:

- `tenancy.tenant.created`
- `tenancy.tenant_membership.created`
- `tenancy.tenant_membership.deleted`

Projection writes are idempotent through natural keys and `tenant_version`.
Duplicate or stale events do not overwrite newer projected tenant or membership
rows. Deleted memberships are kept as tombstones so an old membership-created
event cannot resurrect a removed membership.

If the features projection database is intentionally reset while the `TENANCY`
stream survives, the durable consumer state must be reset too. Otherwise NATS has
already acked old events and the empty projection tables will not rebuild. The
safe rebuild shape is: stop the features worker, clear the projection tables,
delete or rename the `features-tenancy-projection` durable consumer, then start
the worker so `DeliverPolicy.All` replays the stream into the empty projection.

Tenancy event wire contracts live under `packages/worker/src/events/versions/`.
Projection behavior lives under
`packages/worker/src/consumers/tenancy-projection/versions/`. Add both sides
deliberately when accepting a new tenancy event schema version.

## Agent Context

Agent-specific gotchas live in `AGENTS.md`. Keep this README human-facing and
avoid duplicating agent-only rules here.
