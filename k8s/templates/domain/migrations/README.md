# Migrations Unit

Migrations are owned by the domain and applied by a one-shot Kubernetes Job.

Live migration Kustomizations should:

- depend on the domain DB unit,
- use `force: true`,
- use immutable image updates through Flux image automation,
- avoid static `latest` semantics.

Keep migration files boring and explicit:

```text
<timestamp>_init.up.sql
```

If the domain emits durable events, the migration owns the outbox table and indexes.
