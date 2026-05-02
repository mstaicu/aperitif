# Identities Migrations

This folder is built as the `identities-migrate` deployable unit.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make identities
```

Local and live deployment order stays `db -> migrate -> api -> ui`.
