# Identity

Identity is Aperitif's canonical local-development boundary for passkey
authentication, sessions, access tokens, JWKS, accounts, and generic
membership. New Product domains integrate with Identity; see
[ADR 0001](../../docs/adr/0001-identity-is-the-canonical-development-boundary.md).

## Local workflow

Install the shared cluster capabilities required by the scenario:

```sh
# Browser and HTTP traffic at http://localhost
kubectl apply -k platform/cluster/ingress/overlays/local

# Relay publication and current-state feeds
kubectl apply -k platform/cluster/event-bus/overlays/local
```

From the repository root:

```sh
make -C domains/identity check
make -C domains/identity up
make -C domains/identity dev
make -C domains/identity e2e
make -C domains/identity down
```

`up` prepares the disposable database, runs migrations, and deploys the runtime.
`dev` uses the same preparation before starting Skaffold development loops.
`e2e` starts the domain and runs browser E2E tests; it needs local ingress.

The API documents its implemented routes at `/v1/identity/docs`. Its current-state
contracts live in [`contracts`](contracts/README.md). They publish account and
membership snapshots to the `IDENTITY` stream only when the event bus is
installed.
