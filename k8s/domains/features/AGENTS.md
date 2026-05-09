# AGENTS.md

Features owns product feature vocabulary, local products, product prices, and
future tenant/workspace feature grants/projections. It does not own authentication,
tenant membership, business-domain records, documents, notifications, or
workflow.

- `product_features` are catalogue templates. Future grants should
  snapshot feature values instead of reading product templates live.
- Features consumes tenancy events into local projection tables. Keep
  `tenant_version` stale-event protection when changing that consumer.
- Do not read identity or tenancy tables. Features verifies identity-issued
  tokens through JWKS and should use tenancy APIs/events for tenant authority.
- Keep `/v1/products` as the public catalogue route until a real consumer need
  justifies exposing lower-level feature or price resources.
