# API Unit

Expected source spine:

```text
api/src/
  api/         Fastify routes, TypeBox schemas, OpenAPI registration
  domains/    domain runtime functions
  events/      event contracts when this API records events
  platform/   persistence, security, observability, request problem details
  app.mjs
  server.mjs
```

Route handlers should stay thin:

```text
validate request -> authenticate actor/user -> call domain function -> return declared response
```

Domain functions own business decisions and database transactions. They should not know about Fastify.
