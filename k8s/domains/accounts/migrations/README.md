# Accounts Migrations

This folder is built as the `accounts-migrate` deployable unit.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make accounts
```

Local and live deployment order stays `db -> migrate -> api/worker`.
