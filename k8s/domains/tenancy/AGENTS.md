# AGENTS.md

Tenancy owns accounts, account memberships, and account activation
requirements. It does not own identity credentials, billing, profiles,
documents, notifications, workflow, or integrations.

- Do not publish tenancy authority events directly from request handlers. Write
  `outbox_events` inside the same database transaction as the state change.
- `accounts.version` is the projection ordering contract for consumers. Events
  that change account authority must carry the correct account version.
- The outbox trigger is statement-level on purpose. The Postgres notification
  only wakes the worker; the worker drains durable rows from `outbox_events`.
- The worker must `LISTEN` before startup drain so rows inserted during startup
  are either drained or wake the listener.
- Keep the manual requirement completion endpoint as an internal seam until a
  fulfillment domain and event consumer exist.
- Do not read identities tables. Tenancy verifies identity-issued tokens
  through JWKS and owns authorization state locally.
