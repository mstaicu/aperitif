# AGENTS.md

Event-bus agent traps only. Read `README.md` for the platform model.

- Do not wire NATS into domains that do not emit or consume events.
- Critical authority/state events go through domain DB transaction ->
  `outbox_events` -> domain worker -> JetStream. Do not publish them directly
  from request handlers.
- Domain workers own stream/consumer setup and event contracts; this platform
  unit only runs NATS.
- Keep NATS credentials and stream settings environment-specific.
