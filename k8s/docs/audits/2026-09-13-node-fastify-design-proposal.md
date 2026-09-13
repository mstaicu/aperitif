# Node.js and Fastify structure proposal

## Recommended shape

Preserve the semantic boundaries that support growth: process bootstrap, server lifetime, application composition, API versions, and business services. Reduce forwarding functions within those boundaries. This proposal supersedes the earlier flattened feature layout and two-file entry-point recommendation.

Keep JavaScript `.mjs`, nodemon, existing workload/package boundaries, and existing event contracts. No application code, package manifests, or deployment configuration has been changed. Version/API research was performed on 13 September 2026; the current releases consulted were Node 26.8.2 and Fastify 5.12.4. These structural changes do not depend on upgrading to a prerelease. [Node releases](https://nodejs.org/en/blog/release), [Fastify releases](https://github.com/fastify/fastify/releases).

## Index, server, and app

| File | Responsibility |
|---|---|
| `index.mjs` | Validate environment; prepare configuration; initialize OpenTelemetry; dynamically import server; await its execution; shut down telemetry last |
| `server.mjs` | Export the server runner; acquire database/other resources; install signals; construct app; listen; coordinate shutdown and resource cleanup |
| `app.mjs` | Export synchronous `buildApp(dependencies)`; configure Fastify; register errors, probes, API versions; never bind a port or install process signals |

The dynamic import remains in index. Server may statically import app and instrumented dependencies because index imports server only after instrumentation starts. Keep existing HTTP, Fastify, PG, and Pino instrumentation settings and Collector/OpenObserve integration. [OpenTelemetry initialization](https://opentelemetry.io/docs/languages/js/instrumentation/).

No additional `bootstrap`, `createRuntime`, `loadDependencies`, configuration framework, or lifecycle framework is proposed. Earlier references to these were explanatory placeholders, not required new functions. Configuration stays in index, resource acquisition stays in server, and registration stays in app.

Ownership is explicit: server owns its database pool; app borrows the pool. Server closes the app before ending the pool. Tests can supply fixture-owned pools and close them after disposing the app. Do not also close a borrowed pool in the app's onClose hook. Register resource cleanup immediately after acquisition, and install/latch shutdown signals before startup awaits. Keep `await using` for Fastify and deferred `pool.end()` for the installed pg pool, which does not implement async disposal. [Fastify lifecycle](https://fastify.dev/docs/latest/Reference/Server/), [PG pooling](https://node-postgres.com/features/pooling).

Conceptual index behavior, with the existing validation and SDK options retained:

```javascript
// Validate environment and construct config here.
// Construct and start the existing SDK here.
try {
  const { runServer } = await import('./server.mjs');
  await runServer(config);
} finally {
  await sdk?.shutdown();
}
```

Conceptual server behavior:

```text
install and latch shutdown signals
create pool and register cleanup
prepare JWKS or signing keys
buildApp({ pool, jwks/signingKey, ... })
listen and wait for shutdown
close app → end pool → return to index
```

App is an ordinary synchronous factory, not a runtime container:

```javascript
export function buildApp({ pool, jwks }) {
  const app = Fastify(existingLoggingOptions)
    .setValidatorCompiler(TypeBoxValidatorCompiler);
  app.register(problemDetails);
  app.register(probes, { pool });
  app.register(v1, { pool, jwks, prefix: '/v1' });
  // Register v2 here when it exists.
  return app;
}
```

Examples are structural sketches; existing schemas, logging, errors, and instrumentation remain required. A separate app supports `app.inject()` without a listening port. An isolated experiment verified factory construction, injection, disposal, and registered cleanup after plugin startup failure against installed Fastify 5.12.3. [Fastify testing](https://fastify.dev/docs/latest/Guides/Testing/).

## Routes, services, and versions

Within Accounts' existing API package:

```text
src/
  index.mjs
  server.mjs
  app.mjs
  platform/
    authentication.mjs
    problem-details.mjs
  routes/
    probes.mjs
    v1/
      index.mjs
      accounts.mjs
      accounts.schemas.mjs
  services/
    accounts/
      create.mjs
      list.mjs
      accounts.test.mjs
```

`routes/v1/index.mjs` owns that version's OpenAPI configuration and resource registration. `routes/v1/accounts.mjs` contains both current account endpoint registrations and HTTP-to-service adaptation. Version-specific HTTP schemas sit beside the routes. `services/accounts/` holds the authoritative operations and their transactions, independent of HTTP request/reply objects.

Keep substantial operations separate; combine tiny operations only when it improves readability. A separate schemas file is useful when schemas are large or shared within the version, but is not mandatory per endpoint.

For Plans, use `routes/v1/plans.mjs`, `routes/v1/plans.schemas.mjs`, and `services/plans/set.mjs`, retaining the existing `/v1/accounts/:account_id/plan` URL. File names need not mirror every URL segment.

For Auth, use `routes/v1/passkeys.mjs` and `routes/v1/sessions.mjs`, with their HTTP schemas nearby. Keep `services/passkeys/` and `services/sessions/` and the substantial operation files. Keep shared session creation callable from passkey transactions. Preserve the public JWKS endpoint outside authenticated scopes.

Reduce repeated naming: inside `services/accounts/`, `create.mjs` is enough; `accounts.create.mjs` repeats the folder name. Consolidate endpoint registration functions into one resource plugin. Keep the version index because it has a concrete composition/documentation responsibility.

Service aggregation factories are optional, not categorically wrong. The current Accounts index only binds functions to a pool. A direct `createAccount({ pool }, input)` call removes both its aggregation wrapper and the curried operation factory. If a future service needs meaningful shared initialization or private state, a factory is justified. Do not replace useful factories solely to reduce file count.

## Separate Swagger documents per API version

Register each version as a normal encapsulated Fastify plugin. Register Swagger inside that plugin before its routes, followed by Swagger UI. Do not wrap version plugins in fastify-plugin, which would remove the intended encapsulation.

```javascript
// app.mjs
app.register(v1, { pool, jwks, prefix: '/v1' });
app.register(v2, { pool, jwks, prefix: '/v2' }); // future

// routes/v1/index.mjs
export default async function v1(api, { pool, jwks }) {
  await api.register(swagger, {
    openapi: { info: { title: 'Accounts', version: '1.0.0' } },
  });
  api.register(accountsRoutes, { pool, jwks });
  await api.register(swaggerUI, { routePrefix: '/accounts/docs' });
}
```

The example abbreviates the existing security schemes, metadata, and operation schemas; preserve them. Route paths inside the version omit the `/v1` prefix. The resulting documentation URLs are `/v1/accounts/docs` and, when added, `/v2/accounts/docs`. Each JSON document contains only its own version's paths.

This was verified with the installed Fastify, Swagger, and Swagger UI packages using two sibling version plugins and app.inject against both documentation JSON endpoints. Each document contained exactly its corresponding version's resource path. [Swagger registration](https://github.com/fastify/fastify-swagger), [Fastify encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/).

Adding a version means adding its route folder and one registration in app. Adding a resource means registering its routes inside the versions that expose it. There is no need for autoload, a filesystem registry, or code generation.

HTTP versions and services are not automatically versioned together. V1 and V2 adapters can map different request/response contracts to the same business operation while semantics remain compatible. A genuine business-behavior difference needs an explicit compatible operation or policy; never silently change V1 semantics because V2 shares its service. HTTP API versions and published event schema versions also remain separate decisions.

## JSDoc simplification

The repository already uses JSDoc and checkJs successfully. The suggested improvement is specifically replacing repeated custom Fastify instance type plumbing with the installed provider's typed-plugin alias:

```javascript
/** @type {import('@fastify/type-provider-typebox').FastifyPluginAsyncTypebox<{
 *   pool: import('pg').Pool,
 *   jwks: import('jose').JWTVerifyGetKey
 * }>} */
export default async function accountsRoutes(app, { pool, jwks }) {
  // Register routes with their existing TypeBox schemas.
}
```

This supplies types for app and plugin options and preserves schema-based request inference. It removes the need for route modules to import a bespoke FastifyInstance typedef from an executable server module. The helper is a type alias, not a runtime plugin or a new dependency. Configure TypeBoxValidatorCompiler as before; compile-time inference does not replace runtime validation. [TypeBox provider](https://github.com/fastify/fastify-type-provider-typebox), [scoped type providers](https://fastify.dev/docs/latest/Reference/Type-Providers/).

For service parameters, infer types from existing schemas where they describe the actual business input, and let return types infer where reliable. Keep explicit annotations for dependency boundaries and database rows that would otherwise become any. Share a short local type alias only when it actually eliminates repeated definitions. No conversion to TypeScript is required.

## What native TypeScript means

Current Node can execute `.mts` containing erasable TypeScript annotations directly. It removes type syntax at runtime; it does not type-check. This became stable in Node 25.2 and 24.12. The repository's Node 26 runtime therefore supports it. [Node TypeScript documentation](https://nodejs.org/api/typescript.html).

Equivalent signatures:

```javascript
// JavaScript .mjs
/** @param {import('pg').Pool} pool @param {string} accountId */
export async function findAccount(pool, accountId) { /* SQL */ }
```

```typescript
// TypeScript .mts
import type { Pool } from 'pg';
export async function findAccount(pool: Pool, accountId: string) { /* SQL */ }
```

The potential saving is shorter annotations and less type-casting ceremony. It does not remove routes, services, schemas, configuration, or tests. Continue running tsc --noEmit. Node does not support transformation-dependent syntax such as enums and parameter properties, does not apply tsconfig aliases at runtime, and refuses type stripping under node_modules. Published contracts should continue shipping JavaScript and declarations.

For the current proposal, retain `.mjs` and simplify its JSDoc first. A language migration is optional and separate; it is not a prerequisite for better organization.

## Development watching

Retain nodemon. The reported inode/replacement behavior in the Skaffold workflow defeats the proposed native-watch substitution. Node documents that fs.watch can stay attached to the original inode after a path is replaced. That corroborates the mechanism, but does not independently diagnose whether a particular failure is in host-side syncing or container-side watching. [Node inode caveat](https://nodejs.org/api/fs.html#inodes).

If files arrive in the container but restarts fail, polling mode is an available nodemon fallback; use it only where needed and restrict watched paths. If files do not arrive, changing the container watcher cannot repair the host/Skaffold sync step. Keep the existing working runner and signal behavior rather than writing a custom watcher. [Nodemon troubleshooting](https://github.com/remy/nodemon#application-isnt-restarting).

## Relay and projector consistency

Use the same three lifecycle names for the relay:

```text
src/
  index.mjs      environment validation, telemetry, dynamic server import
  server.mjs     PG/NATS connections, stream JSON, probes, signals, cleanup
  app.mjs        relayOutbox and its private publication transaction
```

The existing outbox.mjs processing implementation can become app.mjs; avoid keeping both files with app merely forwarding to outbox. App is an exported worker function, not a Fastify instance. Keep the existing event-agnostic interface and stream-configuration ownership. Await the relay loop before disposing resources; preserve its transaction and PubAck boundaries.

The Plans projector can use index for bootstrap, server for connections/consumer/probes, and app for the consume loop that calls its existing event handler and acknowledges after successful processing. Keep the domain handler separate where its transaction logic warrants it. Similar lifecycle names do not require a shared runtime class.

## Package scope and validation

Retain the current private workload packages, independent Docker build contexts, domain-owned migrations, published contract packages, and shared relay image. No additional runtime dependency is required for the proposal. Existing scripts continue launching index.mjs; nodemon remains the development runner.

A future implementation must preserve HTTP URLs and response semantics, separate version documents, authentication and problem details, TypeBox behavior, observability load order, SQL/event invariants, and graceful cleanup. Validate HTTP adapters with injection and real domain tests; validate worker changes with the qualified event-path suite. The isolated Swagger experiment proves version isolation for the demonstrated shape, not an already implemented migration.
