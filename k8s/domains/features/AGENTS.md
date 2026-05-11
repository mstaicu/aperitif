# AGENTS.md

Features owns product feature vocabulary, local products, tenant feature grants,
tenant features, and its event outbox. It does not own authentication,
tenant membership, workspaces, business-domain records, documents,
notifications, or workflow.

- `product_features` are catalogue templates. Tenant grants snapshot feature
  values instead of reading product templates live.
- Emit feature events from `tenant_features` through `outbox_events`,
  not from catalogue tables.
- Features consumes tenancy events into local projection tables. Keep
  `tenant_version` stale-event protection when changing that consumer.
- Do not read identity or tenancy tables. Features verifies identity-issued
  tokens through JWKS and should use tenancy APIs/events for tenant authority.
- Keep catalogue reads under `/v1/products`. Tenant grant commands are admin
  commands under `/v1/admin/grants`, not tenancy-owned `/v1/tenants` routes.
