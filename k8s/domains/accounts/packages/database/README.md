# Accounts Database

This package is built into the `accounts-migrate` deployable unit.

Flyway owns the migration history for the accounts database:

- `migrations/`: production versioned migrations, named `V###__description.sql`.
- `repeatable/`: rerunnable database objects or stable reference data.
- `seeds/`: non-live deterministic seed data, enabled only by dev/PR overlays.
- `checks/`: SQL fixtures and assertions for migration upgrade checks.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make accounts
```

Local and live deployment order stays `postgres -> migrate -> api/worker`.
