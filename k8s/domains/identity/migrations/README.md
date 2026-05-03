# Identity Migrations

This folder is built as the `identity-migrate` deployable unit.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make identity
```

Local and live deployment order stays `db -> migrate -> api -> ui`.
