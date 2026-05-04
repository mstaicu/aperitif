# Identity Database

This package is built into the `identity-migrate` deployable unit.

Flyway owns the migration history for the identity database:

- `migrations/`: production versioned migrations, named `V###__description.sql`.
- `repeatable/`: rerunnable database objects or stable reference data.
- `seeds/`: non-live deterministic seed data, enabled only by dev/PR overlays.
- `checks/`: SQL fixtures and assertions for migration upgrade checks.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make identity
```

Local and live deployment order stays `postgres -> migrate -> api -> ui`.
