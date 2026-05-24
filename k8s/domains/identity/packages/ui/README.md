# identity-ui

Remix UI for passkey signup and login.

## Files

- `app/router.ts`: explicit route wiring.
- `app/pages/*`: server-rendered routes.
- `app/pages/*.client.ts`: browser-only WebAuthn code.
- `app/domains/passkeys.ts`: identity API calls.

## Routes

```text
GET  /signup
POST /signup/challenge
POST /signup
GET  /login
POST /login/challenge
POST /login
GET  /identity/assets/*
```

The UI stores returned refresh tokens in HttpOnly cookies.

## Local

```sh
npm install
npm run dev
```

Host-only HTTPS testing:

```sh
NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem" \
API_INTERNAL_V1_URL=https://api.tma.com/v1 \
npm run dev
```

## Runtime Defaults

- `PORT=44100`
- `API_INTERNAL_V1_URL=http://traefik-srv.traefik.svc.cluster.local/v1`
- `COOKIE_SECURE=true`
- OTel is enabled only when the overlay sets `OTEL_EXPORTER_OTLP_ENDPOINT`.
