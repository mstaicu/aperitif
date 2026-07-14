# Identity UI

This Remix server provides passkey signup and login. Refresh tokens remain in
HttpOnly cookies; browser JavaScript never receives them.

Run it directly with:

```sh
npm install
npm run dev
```

Environment:

- `API_INTERNAL_V1_URL`: Identity API base URL;
- `COOKIE_SECURE`: whether the refresh cookie requires HTTPS;
- `PORT`: HTTP port, default `3000`.
