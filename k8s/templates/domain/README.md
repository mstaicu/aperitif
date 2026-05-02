# Domain Template

Copy this folder when starting a new domain, then replace `<domain>` with the plural domain name used in Kubernetes resources, images, Make targets, Flux Kustomizations, and API gateway prefix.

Use the template as a checklist, not as a generator.

## Required Shape

```text
domains/<domain>/
  README.md
  AGENTS.md
  api/
  migrations/
  infra/
    db/
    migrate/
    api/
  skaffold.yaml
```

Add optional units only when the domain actually owns them:

```text
worker/
infra/worker/

ui/
infra/ui/
```

## Unit Order

```text
db -> migrate -> api/worker
```

- `db`: domain-owned PostgreSQL for local/live parity.
- `migrate`: one-shot Job built from `migrations/`.
- `api`: Fastify HTTP API, TypeBox/OpenAPI contracts, HTTPRoutes under `/<domain>/v1`.
- `worker`: async publisher/consumer only when the domain emits or consumes events.
- `ui`: browser surface only when this domain owns one, normally under `/<domain>`.

## Contracts

Every domain should document:

- HTTP routes and OpenAPI contract location.
- Event subjects, payload schemas, producer, consumer, and idempotency rule.
- Database ownership and migrations.
- External domain dependencies.

## Account-Scoped Authorization

If a domain owns account-scoped resources or performs account-scoped authorization on hot request paths, it must consume tenancy events into local projection tables owned by that domain.

Baseline projection tables:

```text
tenancy_account_projection
tenancy_account_membership_projection
```

Authorize from those local projections. Do not read the tenancy database. Do not call tenancy synchronously for hot-path authorization.

## Wiring Checklist

- Add Skaffold modules for each local unit.
- Add Make targets for deploy-and-exit and dev loop.
- Add Flux Kustomizations for live units.
- Add image automation only for Flux-managed images.
- Add network policies for only the traffic each unit needs.
- Add SOPS-encrypted Secrets per deployable unit.
