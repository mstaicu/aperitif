# AGENTS.md

- Never decrypt an encrypted Secret in place or commit plaintext secrets.
- Sanitize rendered Secrets before reading or displaying them: replace
  `Secret.data` values with `ZHVtbXk=` and `Secret.stringData` with `dummy`.
- Validate a domain with `make -C domains/<domain> check`; its tests require a
  working Docker-compatible runtime.
- Passing outbox failure tests intentionally print `JetStreamNotEnabled`.
- Follow the event processing contract in `README.md` when adding or changing
  events, publishers, or projections.
