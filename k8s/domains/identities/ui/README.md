# identities-ui

Remix 3 beta UI for the identities domain.

- `app/router.ts` wires explicit Remix routes.
- `app/pages/*` are route handlers and server-rendered pages.
- `app/domains/passkeys.ts` calls the identities API.
- `app/pages/*.client.ts` is browser-only WebAuthn code.

- `GET /identities/register` renders the passkey registration page through Traefik.
- `POST /identities/register/challenge` proxies the identities registration challenge.
- `POST /identities/register` verifies the browser WebAuthn response through the identities API and stores the returned refresh token as an HttpOnly cookie.
- `GET /identities/login` renders the passkey login page through Traefik.
- `POST /identities/login/challenge` proxies the identities login challenge.
- `POST /identities/login` verifies the browser WebAuthn response through the identities API and stores the returned refresh token as an HttpOnly cookie.

Run it locally:

```sh
npm install
npm run dev
```

Build and run the production server locally:

```sh
npm run build
npm run start
```

Defaults:

- `PORT=44100`
- `IDENTITIES_API_INTERNAL_URL=http://traefik-srv.traefik.svc.cluster.local/identities/v1` for in-cluster UI pods.
- For host-only testing, use `IDENTITIES_API_INTERNAL_URL=https://tma.com/identities/v1` after `make ingress`.
- `COOKIE_SECURE=true`; set `COOKIE_SECURE=false` when testing cookies over plain `http://localhost`.

Host-only HTTPS testing with mkcert:

```sh
NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" \
IDENTITIES_API_INTERNAL_URL=https://tma.com/identities/v1 \
npm run dev
```
