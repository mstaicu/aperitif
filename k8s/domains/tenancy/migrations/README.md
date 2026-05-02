# Tenancy Migrations

This folder is built as the `tenancy-migrate` deployable unit.

Run it through the domain target instead of building or pushing the image by hand:

```sh
make tenancy
```

Local and live deployment order stays `db -> migrate -> api/worker`.
