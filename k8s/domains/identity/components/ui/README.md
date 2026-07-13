# Identity UI

Remix UI for passkey signup and login.

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

Refresh tokens are stored in HttpOnly cookies.

## Local

```sh
npm install
npm run dev
```

Required environment:

```text
API_INTERNAL_V1_URL
COOKIE_SECURE
PORT
```
