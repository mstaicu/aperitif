# AGENTS.md

Documents is a product-domain example. It owns workspace-scoped document rows
and proves the tenant/workspace/features authorization spine.

- Do not read identity, tenancy, or features databases directly.
- Keep tenancy and features data as local projections populated by worker
  consumers.
- Documents does not publish events yet. Add an outbox only when this domain has
  authority facts other domains need to consume.
- Keep the public API rooted at `/v1/documents` so the domain owns one Gateway
  prefix.
