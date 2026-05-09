# identity-ui

Remix 3 beta UI for the identity domain.

- `app/router.ts` wires explicit Remix routes.
- `app/pages/*` are route handlers and server-rendered pages.
- `app/domains/passkeys.ts` calls the identity API.
- `app/pages/*.client.ts` is browser-only WebAuthn code.

- `GET /signup` renders the passkey signup page through Traefik.
- `POST /signup/challenge` proxies the identity registration challenge.
- `POST /signup` verifies the browser WebAuthn response through the identity API and stores the returned refresh token as an HttpOnly cookie.
- `GET /login` renders the passkey login page through Traefik.
- `POST /login/challenge` proxies the identity login challenge.
- `POST /login` verifies the browser WebAuthn response through the identity API and stores the returned refresh token as an HttpOnly cookie.
- `/identity/assets/*` serves namespaced browser bundles for this UI deployment.

Run it locally:

```sh
npm install
npm run dev
```

Build and run the production server locally:

```sh
npm run build
node dist/server.js
```

Defaults:

- `PORT=44100`
- `API_INTERNAL_V1_URL=http://traefik-srv.traefik.svc.cluster.local/v1` for in-cluster UI pods.
- For host-only testing, use `API_INTERNAL_V1_URL=https://api.tma.com/v1` after `make deploy-ingress`.
- `COOKIE_SECURE=true`; set `COOKIE_SECURE=false` when testing cookies over plain `http://localhost`.
- OTel is opt-in. The Kubernetes dev/live overlays set `OTEL_SERVICE_NAME=identity-ui`, `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-srv.otel.svc.cluster.local:4318`, `OTEL_TRACES_EXPORTER=otlp`, `OTEL_METRICS_EXPORTER=none`, and `OTEL_LOGS_EXPORTER=none`.

Host-only HTTPS testing with mkcert:

```sh
NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" \
API_INTERNAL_V1_URL=https://api.tma.com/v1 \
npm run dev
```
