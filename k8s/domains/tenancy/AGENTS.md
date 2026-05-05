# AGENTS.md

Tenancy owns tenants, tenant memberships, and tenant activation
requirements. It does not own identity credentials, billing, profiles,
documents, notifications, workflow, or integrations.

- Do not publish tenancy authority events directly from request handlers. Write
  `outbox_events` inside the same database transaction as the state change.
- `tenants.version` is the projection ordering contract for consumers. Events
  that change tenant authority must carry the correct tenant version.
- The outbox trigger is statement-level on purpose. The Postgres notification
  only wakes the worker; the worker drains durable rows from `outbox_events`.
- The worker must `LISTEN` before startup drain so rows inserted during startup
  are either drained or wake the listener.
- Do not add a direct owner-supplied `userId` member creation endpoint as the
  product invite flow. Future member adds should go through invite,
  provisioning, or another explicit proof path.
- Do not add a public/manual requirement completion endpoint. Future
  fulfillment domains should drive requirement changes through an internal
  consumer path.
- Do not read identity tables. Tenancy verifies identity-issued tokens
  through JWKS and owns authorization state locally.
