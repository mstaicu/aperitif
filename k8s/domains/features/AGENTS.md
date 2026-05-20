# AGENTS.md

Features owns feature definitions, tenant feature grants, current tenant
features, tenancy projections, and its event outbox. It does not own products,
plans, prices, checkout, authentication, tenant membership, workspaces, business
records, documents, notifications, or workflow.

- Emit feature events from `tenant_features` through `outbox_events`.
- Features consumes tenancy events into local projection tables. Keep
  projection `version` stale-event protection when changing that consumer.
- Do not read identity or tenancy tables. Features verifies identity-issued
  tokens through JWKS and should use tenancy APIs/events for tenant authority.
- Tenant grant commands are feature-domain commands under `/v1/features/grants`,
  not tenancy-owned `/v1/tenants` routes.
