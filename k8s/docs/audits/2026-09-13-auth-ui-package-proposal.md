# Auth UI blueprint

The implemented UI uses Remix 3 directly, with one deployable package per domain. Application source is **319 lines of TypeScript across six files**, down from 440 lines across ten files in the first refactor. CSS is unchanged.

```text
ui/
├── package.json / package-lock.json
├── tsconfig.json
├── Dockerfile / .dockerignore
├── skaffold.yaml
├── playwright.config.mjs
├── src/
│   ├── index.ts                 # environment checks, telemetry, dynamic import
│   ├── server.ts                # Node HTTP listener and process lifetime
│   ├── app.ts                   # Remix assets, middleware, routes
│   ├── passkeys/
│   │   ├── api.ts               # Auth API calls and session cookie
│   │   ├── page.ts              # login/signup document and markup
│   │   └── public/client.ts     # browser interaction
│   └── public/styles.css
├── test/e2e/passkeys.spec.mjs
└── infra/
    ├── base/
    └── overlays/{local,prod-eu}/
```

## Responsibilities

- `index.ts` validates required configuration, starts the existing HTTP/Undici instrumentation, dynamically imports the server, and flushes the SDK when the server finishes.
- `server.ts` uses Node's `await using` to drain HTTP on shutdown. Remix handles unexpected errors and aborted requests. Kubernetes enforces the existing 15-second termination grace period; there is no application shutdown timer. A request that consumes the entire grace period can prevent final telemetry flushing.
- `app.ts` directly configures `createAssetServer`, `cop()`, and the router. Only public browser files and SimpleWebAuthn are allowed through the asset server. Two route entries map login/signup to their API ceremonies.
- `passkeys/page.ts` renders the complete document for both ceremonies and obtains asset URLs from Remix. There is no `PageAssets` type, asset URL forwarding chain, route-registration wrapper, or single-use document module.
- `passkeys/api.ts` owns one request flow. It keeps the native five-second upstream request timeout and cancellation, handles malformed JSON and upstream failures, validates the returned session with Remix's existing schema package, and preserves the opaque secure cookie. Cryptography and business validation remain in Auth API.
- `passkeys/public/client.ts` runs only on its own page, using the markup's ceremony and action. Browser capability checks and user-facing failure handling remain.

The package still uses its existing TypeScript loader, HTML templates, and Remix asset serving. No new framework or shared runtime package was introduced. Nodemon is the only added dependency, for development: polling watches TS/TSX/CSS under `src`, and Skaffold performs file sync. There is one watcher.

## Domain ownership

Keep each UI's Dockerfile, Skaffold configuration, and `infra/` inside its workload. Keep shared infrastructure and cluster Flux wiring at their existing higher levels. Copy this small package boundary into another domain and replace its feature, API URL, image, ingress, and telemetry identity.

Extract a shared document or visual package only when multiple actual pages need it. Add API-version adapters only when the UI must support multiple API contracts. No empty extension directories or generic service framework are needed now.

OTLP still goes through the existing collector/OpenObserve configuration. Proxy-header trust remains disabled in the UI because local Traefik permits untrusted forwarded headers. Remix's tokenless origin guard allows requests with no provenance headers; it is not a universal CSRF guarantee.

## Validation

- Required `make -C domains/auth check` passed, including two API tests and manifest renders.
- The first deployed E2E run exposed missing local database tables. Auth's existing migration target restored the schema; both signup/login browser tests then passed.
- The earlier production image smoke test and repeated Skaffold TS/CSS sync checks passed. The reduced source was subsequently rebuilt and redeployed to `docker-desktop`.
- A temporary harness checks asset isolation, 400/415/403 responses, session cookies, invalid upstream/session 502 responses, 504 timeout, cancellation, in-flight shutdown, and OTLP export to a local receiver.
- No repository test files were added. Production-cluster deployment and end-to-end OpenObserve ingestion were not performed.

## Research basis

Inspected source, installed package APIs, and upstream documentation on 13 September 2026. Repository documentation was not treated as evidence of correctness. Remix **3.0.0-rc.1** is a release candidate; these are supported APIs, not a claim of years of production maturity.

Sources: [Remix release](https://remix.run/blog/remix-3-release-candidate), [Node adapter](https://github.com/remix-run/remix/tree/main/packages/node-fetch-server), [assets](https://github.com/remix-run/remix/tree/main/packages/assets), [schema validation](https://github.com/remix-run/remix/tree/main/packages/data-schema), [origin protection](https://github.com/remix-run/remix/tree/main/packages/cop-middleware), [Node HTTP disposal](https://nodejs.org/api/http.html#serversymbolasyncdispose), [OTel ESM](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md), [SCS](https://scs-architecture.org/), [Skaffold sync](https://skaffold.dev/docs/filesync/).
