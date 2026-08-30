# Auth UI

This Remix 3 server provides passkey signup and login. Session tokens remain in
HttpOnly cookies; browser JavaScript never receives them.

- `src/server.ts` serves pages, assets, probes, and Auth API actions.
- `src/pages/` contains the login and signup UI and their browser behavior.
- `src/passkeys.ts` proxies passkey ceremonies to the Auth API.
- `src/otel.ts` configures server telemetry.

Run it directly with:

```sh
npm install
npm run dev
```

Remix compiles browser modules on demand. There is no separate application
build step.

The browser route must be served through HTTPS because the session-token cookie
is always `Secure`.

Environment:

- `API_INTERNAL_V1_URL`: Auth API base URL.
- `PORT`: HTTP port, default `3000`.

## New domain UI

Copy this component, then replace:

- Package, image, service, and telemetry names.
- Public hosts and paths.
- Internal API environment variables.
- Domain-specific pages, browser code, dependencies, and server routes.

Keep the Docker stages, probes, telemetry, asset allowlist, NetworkPolicy, and
base/overlay structure.
