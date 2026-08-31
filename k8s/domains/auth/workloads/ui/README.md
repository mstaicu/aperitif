# Auth UI

The Auth UI is a Remix server for passkey signup and login. Session tokens stay
in `HttpOnly`, `Secure` cookies; browser JavaScript never receives them.

| Location | Responsibility |
| --- | --- |
| `src/server.ts` | Pages, assets, probes, and Auth API actions |
| `src/pages/` | Login and signup UI plus browser behavior |
| `src/passkeys.ts` | Proxy passkey ceremonies to the Auth API |
| `src/otel.ts` | Server telemetry |
| `infra/` | Deployment, ingress, network policy, and environment overlays |

Run it from this directory:

```sh
npm ci
npm run dev
```

Remix compiles browser modules on demand; there is no separate application build
step for local development. Serve the browser route over HTTPS because its session
cookie is always `Secure`.

| Variable | Meaning |
| --- | --- |
| `API_INTERNAL_V1_URL` | Internal Auth API base URL |
| `PORT` | HTTP port; defaults to `3000` |

For another domain UI, reuse the Docker stages, probes, telemetry, asset
allowlist, NetworkPolicy, and Kustomize base/overlay structure. Replace only its
identity, hosts, internal API URL, pages, and product behavior.
