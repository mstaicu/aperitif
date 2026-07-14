# Documents

Documents is a local example product. It proves that a product can authorize
requests from locally projected account membership and entitlement state
without reading another domain's database.

It is intentionally absent from production Flux and has no production
overlays.

## Runtime

```text
ACCOUNTS stream -------> accounts projector -----+
ENTITLEMENTS stream ---> entitlements projector -+-> PostgreSQL -> API -> UI
```

| Part | Purpose |
| --- | --- |
| `components/accounts-projector` | Project account membership |
| `components/entitlements-projector` | Project `documents.enabled` |
| `components/api` | Create and list documents after local authorization |
| `components/ui` | Example product UI |
| `components/migrations` | Flyway SQL and its Job |
| `infra/postgres` | Disposable in-cluster database |

Documents consumes `accounts.account.opened.v1` and
`entitlements.account_entitlements.updated.v1`. It publishes no events.

## Work here

```sh
make -C domains/documents check
make -C domains/documents migrate
make -C domains/documents deploy
make -C domains/documents dev
```

Add schema changes as `components/migrations/sql/V###__description.sql`.
Projection writes must ignore equal or older source versions.
