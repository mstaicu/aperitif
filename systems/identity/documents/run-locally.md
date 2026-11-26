# Run Identity locally

Run from the repository root in the intended disposable context. Check `kubectl config current-context` first. On macOS, `brew bundle` installs the [CLI tools](../../../Brewfile).

## API development

```sh
make -C systems/identity up
(cd systems/identity && skaffold dev -m identity-api)
```

`up` starts Postgres and runs Flyway with the SQL in your checkout. Rerun it after editing migrations. Select `identity-api,identity-ui` to develop both. Ctrl-C ends the dev loop. `make -C systems/identity down` deletes the Identity namespace and its local database. [Makefile](../Makefile) · [Skaffold modules](../skaffold.yaml)

## Browser tests

After `make -C systems/identity up`, deploy the API and UI. Match the API's WebAuthn origin to the browser port.

```sh
(cd systems/identity && skaffold run -m identity-api,identity-ui)
kubectl set env -n identity deployment/api ORIGIN=http://localhost:8080
kubectl rollout status -n identity deployment/api
kubectl port-forward -n identity service/ui 8080:3000
```

Leave the port forward running. Start the browser suite in a second terminal from the repository root.

```sh
cd systems/identity/ui
npm ci
npx playwright install chromium
PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:e2e
```

## Event delivery

Start these workloads when a scenario needs published messages. The API can commit outbox rows while the relay is stopped.

```sh
kubectl apply -k systems/platform/infra/event-bus/overlays/local
kubectl rollout status -n nats statefulset/nats
kubectl apply -k systems/identity/infra/outbox-relay/overlays/local
kubectl rollout status -n identity deployment/outbox-relay
```

To try a locally built relay on kind, build a fresh tag and load it into the named cluster. Select that tag in the [local relay overlay](../infra/outbox-relay/overlays/local/kustomization.yaml) before applying it. The deployment uses `IfNotPresent`.

```sh
docker build --target prod -t ghcr.io/mstaicu/outbox-relay:dev-001 systems/platform/outbox-relay
kind load docker-image ghcr.io/mstaicu/outbox-relay:dev-001 --name identity-dev
```

To stop only the relay, run `kubectl delete -k systems/identity/infra/outbox-relay/overlays/local`.
