# Domain Template

This folder is a checklist, not a generated scaffold.

When starting a new domain, create `domains/<domain>` and copy from the real
working domains:

- API spine: `domains/tenancy/api` or `domains/identities/api`
- Worker/outbox/event spine: `domains/tenancy/worker`
- Remix UI spine: `domains/identities/ui`
- Infra shape: `domains/identities/infra` and `domains/tenancy/infra`
- Skaffold modules: `domains/identities/skaffold.yaml` and `domains/tenancy/skaffold.yaml`
- Live Flux wiring: `clusters/prod-eu/domains`

Replace the copied domain behavior. Keep the unit shape and wiring patterns.

## Required Shape

```text
domains/<domain>/
  README.md
  AGENTS.md      only when the domain has non-obvious agent traps
  api/
  migrations/
  infra/
    db/
    migrate/
    api/
  skaffold.yaml
```

Add optional units only when the domain owns them:

```text
worker/
infra/worker/

ui/
infra/ui/
```

## Unit Order

```text
db -> migrate -> api
```

If the domain owns async event publishing or consumption:

```text
db -> migrate -> api/worker
```

If the domain owns a browser UI, deploy it as its own unit. If the UI depends
on the domain API, deploy it after the API.

- `db`: domain-owned PostgreSQL for local/live parity.
- `migrate`: one-shot Job built from `migrations/`.
- `api`: Fastify HTTP API, TypeBox/OpenAPI contracts, public HTTPRoutes under `api.tma.com/<domain>/v1`.
- `worker`: async publisher/consumer only when the domain emits or consumes events.
- `ui`: browser surface only when this domain owns one, normally under `tma.com/<domain>`.

## Contracts

Each domain README should document:

- HTTP routes and OpenAPI contract location.
- Event subjects, payload schemas, producer, consumer, and idempotency rule.
- Database ownership and migrations.
- External domain dependencies.

API implementations should copy the current API spine, not the domain-specific
business behavior:

```text
server -> app -> api/versions/v1/routes -> domains/<domain> -> platform
```

Route files adapt HTTP to domain calls. Domain runtime functions own business
decisions and transactions. Platform code owns process concerns such as
persistence, security, config, and observability.

List responses should return arrays directly. Add counts only when the endpoint
has real pagination or totals.

Event contracts should live under `api/src/events/versions/v1`. Add a new
version folder only when a wire payload shape changes.

## Account-Scoped Authorization

If a domain owns account-scoped resources or performs account-scoped authorization on hot request paths, it must consume tenancy events into local projection tables owned by that domain.

Baseline projection tables:

```text
tenancy_account_projection
tenancy_account_membership_projection
```

Authorize from those local projections. Do not read the tenancy database. Do not call tenancy synchronously for hot-path authorization.

Consumer rule:

1. Validate `producer` and `schema_version`.
2. Insert `event.id` into a processed-events table with `ON CONFLICT DO NOTHING`.
3. Ack and stop if the event was already processed.
4. Apply the projection only when `event.version` is newer than the stored account version.
5. Commit, then ack.

## Wiring Checklist

- Add Skaffold modules for each local unit.
- Add Make targets for deploy-and-exit and dev loop.
- Add Flux Kustomizations for live units.
- Add image automation only for Flux-managed images.
- Add network policies for only the traffic each unit needs.
- Add SOPS-encrypted Secrets per deployable unit.
