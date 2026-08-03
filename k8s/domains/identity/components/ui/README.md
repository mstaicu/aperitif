# Identity UI

This Remix server provides passkey signup and login. Refresh tokens remain in
HttpOnly cookies; browser JavaScript never receives them.

Run it directly with:

```sh
npm install
npm run dev
```

The browser route must be served through HTTPS because the refresh-token cookie
is always `Secure`.

Environment:

- `API_INTERNAL_V1_URL`: required Identity API base URL;
- `PORT`: HTTP port, default `3000`.
