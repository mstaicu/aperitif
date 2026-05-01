# Worker Unit

Add a worker only when the domain emits or consumes events.

Expected source spine:

```text
worker/src/
  consumers/
  publishers/
  platform/
  worker.mjs
  index.mjs
```

For authority/state events:

```text
API transaction -> outbox_events -> worker publisher -> JetStream
```

Do not publish critical domain events directly from request handlers.

The current copyable worker spine is:

```text
domains/tenancy/worker
```
