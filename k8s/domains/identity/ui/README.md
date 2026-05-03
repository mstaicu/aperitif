# identity-ui

Remix 3 beta UI for the identity domain.

- `app/router.ts` wires explicit Remix routes.
- `app/pages/*` are route handlers and server-rendered pages.
- `app/domains/passkeys.ts` calls the identity API.
- `app/pages/*.client.ts` is browser-only WebAuthn code.

- `GET /identity/register` renders the passkey registration page through Traefik.
- `POST /identity/register/challenge` proxies the identity registration challenge.
- `POST /identity/register` verifies the browser WebAuthn response through the identity API and stores the returned refresh token as an HttpOnly cookie.
- `GET /identity/login` renders the passkey login page through Traefik.
- `POST /identity/login/challenge` proxies the identity login challenge.
- `POST /identity/login` verifies the browser WebAuthn response through the identity API and stores the returned refresh token as an HttpOnly cookie.

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
- For host-only testing, use `API_INTERNAL_V1_URL=https://api.tma.com/v1` after `make ingress`.
- `COOKIE_SECURE=true`; set `COOKIE_SECURE=false` when testing cookies over plain `http://localhost`.

Host-only HTTPS testing with mkcert:

```sh
NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" \
API_INTERNAL_V1_URL=https://api.tma.com/v1 \
npm run dev
```
