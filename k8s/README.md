# Aperitif Kubernetes

This repo is the Kubernetes and delivery spine for Aperitif. It keeps platform capabilities and domain capabilities explicit, composable, and deployable through the same mental model in local development and Flux-managed environments.

The project is intentionally not hiding deployment units behind a fake "app" abstraction. A domain is composed from small units with clear ownership:

```text
db -> migrate -> api -> ui/worker
```

`ui` and `worker` are added only when the domain actually owns those capabilities.

## Principles

- Keep deployable unit boundaries honest. `db`, `migrate`, `api`, `ui`, and `worker` are separate units with separate manifests and lifecycle.
- Keep local and live composition on the same spine. Local uses Skaffold and Make; live uses Flux Kustomizations.
- Keep contracts explicit. HTTP contracts are OpenAPI/TypeBox; event contracts must name subjects and payloads; database ownership is per domain.
- Keep platform dependencies explicit. A domain should not silently assume platform capabilities unless those capabilities are deployed by the environment.
- Keep deleting fake abstractions. Prefer direct, readable wiring over clever layers that hide ownership.

## Current Shape

```text
clusters/
  prod-eu/
    platform/             Flux Kustomizations for platform units
    domains/              Flux Kustomizations for domain units
    image-automation/     Flux image repositories, policies, and updates
    flux-system/          bootstrap notes; Flux creates runtime sync resources
  staging-eu/
    flux-system/          bootstrap notes

platform/
  ingress/                Traefik, Gateway API CRDs, Gateways, HTTPRoutes
  event-bus/              NATS JetStream for durable domain events
  observability/          present, not currently composed
  mesh/                   present, not currently composed

domains/
  identities/             passkeys, sessions, JWKS, identity signing keys
  accounts/               tenant/customer accounts, memberships, activation requirements

Makefile                  local orchestration
Brewfile                  local toolchain
.sops.yaml                SOPS age recipient rules
skaffold.yaml             root Skaffold composition
```

The currently composed platform units are ingress and event-bus. Observability and mesh folders may exist, but they are not part of the active local/prod-eu spine unless explicitly added.

## Domain Model

Each domain should document itself in `domains/<domain>/README.md`.

Current domains:

- `identities`: owns passkey registration/login, sessions, token signing, and JWKS.
- `accounts`: owns the tenant/customer relationship, account memberships, and activation requirements.

Each domain owns its database schema and migrations. Other domains must call the owning API or consume declared events; they must not read or write another domain database directly.

## Deployment Units

Each domain follows this order:

```text
db -> migrate -> api
```

The `api` unit is also where HTTP route ownership lives. If a domain API exposes `HTTPRoute`s through Traefik, its namespace must opt in with:

```yaml
metadata:
  labels:
    tma.com/gateway-access: traefik
```

The API unit owns the gateway-access label because it owns HTTP routes. DB and migrate units should not carry ingress semantics.

Migration units are one-shot Kubernetes Jobs. In live, migration Kustomizations must be Flux-managed and use `force: true` so reconciliation can recreate completed Jobs when migration image content changes. Prefer immutable image tags or digests for migrations; do not rely on a static `latest` tag when migration content needs to trigger a rerun.

## Platform Model

Ingress is the active platform baseline.

Local ingress setup does three different jobs:

- Installs Gateway API CRDs.
- Creates local machine trust and host routing with `mkcert` and `/etc/hosts`.
- Applies Traefik and Gateway API manifests through Skaffold/Kustomize.

Live ingress is managed by Flux from `clusters/prod-eu/platform/ingress.yaml` and points at `platform/ingress/overlays/live`.

Traefik Gateway listeners use namespace selectors for route attachment. Domain namespaces must opt in with `tma.com/gateway-access: traefik`; otherwise their `HTTPRoute`s should not attach to the shared Gateway.

## Local Development

Install tools:

```sh
brew bundle
```

Start Docker Desktop or another local Kubernetes cluster, then run one of:

```sh
make dev
make dev-identities
make dev-accounts
```

The Make targets intentionally run the same dependency order as live:

```text
ingress -> db -> migrate -> wait for migration Job -> api dev loop
```

Use `make ingress` when you only need Traefik, Gateway API CRDs, local TLS, and local host routing.

The default local domain is `tma.com`. Override it when needed:

```sh
make ingress DOMAIN=example.test
```

## Live Deployment With Flux

Flux live composition starts at:

```text
clusters/prod-eu/kustomization.yaml
```

That file includes:

- `image-automation`
- `platform.yaml`
- `domains.yaml`

`platform.yaml` reconciles platform units. `domains.yaml` reconciles domain units.

For each domain, live Flux Kustomizations should preserve this dependency order:

```text
<domain>-db -> <domain>-migrate -> <domain>-api
```

The API Kustomization depends on ingress and the domain migration unit. The migration Kustomization depends on the DB unit and uses `force: true`.

Bootstrap details live in:

- `clusters/prod-eu/flux-system/README.md`
- `clusters/staging-eu/flux-system/README.md`

## Secrets

SOPS uses age recipients from `.sops.yaml`. The private key is never committed.

Set your local key path:

```sh
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

Useful commands:

```sh
make sops-pubkey
make sops-updatekeys
make sops-secret
```

`make sops-secret` creates the Flux `sops-age` secret in `flux-system` from `SOPS_AGE_KEY_FILE`.

Secrets are scoped per deployable unit. Even if two units use the same database URL, they should consume separate Secret names, for example `identities-api-db` and `identities-migrate-db`.

## Contracts

APIs are Fastify services with TypeBox schemas and OpenAPI docs.

Route work should preserve:

- Explicit request schemas.
- Explicit success response schemas.
- Explicit domain error responses.
- Stable OpenAPI operation descriptions that are useful to generated clients and LLM tools.

Events are not implicit. If a domain emits or consumes an event, document the subject, payload schema, producer, consumer, and delivery expectation.

Database ownership is exclusive to the owning domain. Migrations live in `domains/<domain>/migrations`.

## How To Work Here

When changing manifests:

- Render the exact overlay you changed with `kubectl kustomize` or `kustomize build --enable-alpha-plugins --enable-exec` when KSOPS generators are involved.
- Check local and live parity if the change affects deployable unit structure.
- Keep generated Secrets and ConfigMaps in the intended namespace.
- Do not make platform assumptions from domain manifests unless the platform unit is composed in that environment.

When changing a domain API:

- Keep route handlers thin.
- Put business decisions in `api/src/domains/*`.
- Put shared process concerns in `api/src/platform/*`.
- Keep TypeBox/OpenAPI schemas in sync with actual responses.
- Treat request validation errors and domain errors as part of the API contract.

When adding a new domain:

- Copy the current domain spine, not stale Appendix examples.
- Add `domains/<domain>/README.md`.
- Add Skaffold modules for local units.
- Add Flux Kustomizations for live units.
- Add image automation only for images Flux should update.
- Add network policies for only the traffic the unit actually needs.

## Checks

Common render checks:

```sh
kubectl kustomize platform/ingress/overlays/dev
kubectl kustomize platform/ingress/overlays/live
kubectl kustomize domains/identities/infra/db/overlays/dev
kubectl kustomize domains/identities/infra/db/overlays/live
kubectl kustomize domains/accounts/infra/db/overlays/dev
kubectl kustomize domains/accounts/infra/db/overlays/live
kustomize build --enable-alpha-plugins --enable-exec domains/identities/infra/api/overlays/dev
kubectl kustomize domains/identities/infra/api/overlays/live
kubectl kustomize domains/accounts/infra/api/overlays/dev
kubectl kustomize domains/accounts/infra/api/overlays/live
git diff --check
```

Use narrower checks when changing a narrow part of the repo. Use the full spine checks when changing shared structure, deployment ordering, namespaces, Gateway routing, secrets, or image automation.

## Appendix

### NATS

```
$ helm repo add nats https://nats-io.github.io/k8s/helm/charts/
$ helm repo update
$ helm repo list
$ helm install nats nats/nats --dry-run --set config.cluster.enabled=true --set config.jetstream.enabled=true > helms
```

```
$ nats context ls
$ nats context save tma
$ nats context edit tma

url: nats://127.0.0.1:4222 # LoadBalancer should expose this locally when running the k8s
user: admin
password: password

$ nats context select tma
$ nats server ls --sort=name
$ while true; do nats server ls --sort=name; sleep 1; done
```

### Jetstream https://www.synadia.com/newsletter/nats-weekly-27

```
$ kubectl get secret nats-sys-creds-secret -o jsonpath="{.data.sys\.creds}" -n dev | base64 --decode > /tmp/sys.creds

$ nats server report js --creds /tmp/sys.creds

$ nats server ls --creds /tmp/sys.creds

$ nats subscribe --stream=math --creds /tmp/identities.creds

$ nats consumer add math worker-1 --filter "math.>" --deliver all --ack all --creds /tmp/identities.creds

$ nats consumer next math worker-1 --creds /tmp/identities.creds

$ nats pub math.add '{"id": 1}' --creds /tmp/identities.creds
```

### Adding a new service:

1. Create the package folder, add sources, install dependencies
2. Create the Docker image locally:
   `$ docker build -t mdstaicu/expiration .`
3. Push the Docker image to dockerhub under your username, else you'll get order-depl-5677d794fb-wx6zz 0/1 ImagePullBackOff 0 10m
   `$ docker push mdstaicu/expiration`

### Debug why traffic doesn't reach any services

```
$ kubectl get services
NAME TYPE CLUSTER-IP EXTERNAL-IP PORT(S) AGE
auth-mongo-srv ClusterIP 10.101.106.144 <none> 27017/TCP 27s
auth-srv ClusterIP 10.99.31.132 <none> 3000/TCP 27s
client-srv ClusterIP 10.110.51.152 <none> 3000/TCP 26s
kubernetes ClusterIP 10.96.0.1 <none> 443/TCP 56m
nats-srv ClusterIP 10.97.95.133 <none> 4222/TCP,8222/TCP 25s
order-mongo-srv ClusterIP 10.103.85.93 <none> 27017/TCP 24s
order-srv ClusterIP 10.105.28.9 <none> 3000/TCP 25s
ticket-mongo-srv ClusterIP 10.103.43.47 <none> 27017/TCP 24s
ticket-srv ClusterIP 10.105.97.188 <none> 3000/TCP 24s
traefik-lb-srv LoadBalancer 10.109.197.237 <pending> 80:32082/TCP 26s
```

Fix the <pending> state of the entry to Traefik by deleting the service while Skaffold is running, then closing Skaffold and restarting the cluster

```
$ kubectl delete service traefik-lb-srv
```

### Debug Mongo

```
$ kubectl exec ticket-mongo-depl-5dddd6d44-4n6lh -it -- bash
$ mongosh // https://www.mongodb.com/docs/manual/release-notes/6.0-compatibility/#legacy-mongo-shell-removed
$ show dbs;
$ show collections;
$ use tickets; || use orders;
$ db.tickets.find()
```

### Test optimistic concurrency control (from browser, with session)

```
var doRequest = async () => {
  const {id} = await fetch("/api/tickets", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({title: 'Cathy buys PLTR', price: 1})
  }).then(res => res.json());

  await fetch(`/api/tickets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({title: 'Cathy sells PLTR', price: 10})
  });

  fetch(`/api/tickets/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({title: 'Cathy sells PLTR', price: 15})
  });
}

(async() => {
  for (let i = 0; i < 200; i++ ) {
    doRequest()
  }
})();
```

### Caveats:

Mongoose broke @types/bson for mongoose.Types.ObjectId.isValid and toHexString. Install @types/bson@4.0.3

### Update NPM packages:

```
$ npm update @tartine/commons
```

Traefik https://doc.traefik.io/traefik/user-guides/crd-acme/

### Use kubectl to switch contexts from docker-desktop to Digital Ocean

1. Install and Configure doctl https://docs.digitalocean.com/reference/doctl/how-to/install/
2. Generate an access Applications & API Token https://cloud.digitalocean.com/account/api/tokens?i=23e796
3. $ doctl auth init
4. The commands under `doctl kubernetes cluster kubeconfig` are used to manage Kubernetes cluster credentials on your local machine. `doctl kubernetes cluster kubeconfig` to configure `kubectl` to connect to the cluster. You are then able to use `kubectl` to create and manage workloads. `doctl kubernetes cluster kubeconfig save <digital ocean cluster name>` This command adds the credentials for the specified cluster to your local kubeconfig. After this, your kubectl installation can directly manage the specified cluster.

```
$ doctl kubernetes cluster kubeconfig save k8s-ticketing
   Notice: Adding cluster credentials to kubeconfig file found in "/Users/mircea/.kube/config"
   Notice: Setting current-context to do-fra1-k8s-ticketing
$ kubectl config view
   apiVersion: v1
   clusters:

- cluster:
  certificate-authority-data: DATA+OMITTED
  server: https://fb230cc7-6971-4f9e-8abd-b0c1ac2db82b.k8s.ondigitalocean.com
  name: do-fra1-k8s-ticketing
- cluster:
  certificate-authority-data: DATA+OMITTED
  server: https://kubernetes.docker.internal:6443
  name: docker-desktop
  contexts:
- context:
  cluster: do-fra1-k8s-ticketing
  user: do-fra1-k8s-ticketing-admin
  name: do-fra1-k8s-ticketing
- context:
  cluster: docker-desktop
  user: docker-desktop
  name: docker-desktop
  current-context: do-fra1-k8s-ticketing
  kind: Config
  preferences: {}
  users:
- name: do-fra1-k8s-ticketing-admin
  user:
  exec:
  apiVersion: client.authentication.k8s.io/v1beta1
  args: - kubernetes - cluster - kubeconfig - exec-credential - --version=v1beta1 - --context=default - fb230cc7-6971-4f9e-8abd-b0c1ac2db82b
  command: doctl
  env: null
  provideClusterInfo: false
- name: docker-desktop
  user:
  client-certificate-data: REDACTED
  client-key-data: REDACTED
```

7. From this point on, any commands issued by kubectl will be ran on the digital ocean cluster

```
$ kubectl get nodes
   NAME STATUS ROLES AGE VERSION
   pool-hpo8g2vpl-81479 Ready <none> 141m v1.21.3
   pool-hpo8g2vpl-8147z Ready <none> 141m v1.21.3
   pool-hpo8g2vpl-814mn Ready <none> 141m v1.21.3
```

If we wanna switch back to the docker desktop local context

```
$ kubectl config view
$ kubectl config use-context <name of context>
$ kubectl config use-context do-fra1-k8s-ticketing
```

### Build and deploy images from Workflows

1. Add a Github secret containing the Docker login token, Docker username, Digital Ocean access token, Stripe Test Secret, Stripe Webhook test secret

### Test TLS locally ( https://testssl.sh/ )

```
$ brew install testssl
$ testssl.sh https://ticketing/dashboard/
```

### Save intermediate and root certificates locally so that we don't get browser errors

```
$ kubectl port-forward <pebble-deployment-name> 15000:15000
$ curl -s -o intermediate.crt https://localhost:15000/intermediates/0
$ curl -s -o root.crt https://localhost:15000/roots/0
```

### Deploy infra on Digital Ocean

1. Buy a domain name, update the nameservers where you bought the domain name from, then:
1. go to Digital Ocean
1. go to Networking, Domains
1. Enter the purchased domain name, without the www subdomain
1. The purchased domain should point to the LoadBalancer of the cluster, go to A records, enter '@' in the Hostname input and 'Will redirect' to the cluster's LoadBalancer
1. Add a CNAME, enter 'www' in the Hostname input and for the 'Is an alias of' input enter '@'
1. Update the prod ingress-depl with the new domain name in the Host rules (?)
1. Create the secrets
1. Create a mongodb managed database cluster, and have each service use a database on that cluster
   Create a mysql database for nats
   Create a volume for storing traefik certificates
1. Create the cluster resources

```
$ kubectl apply -f infra/k8s-setup
$ kubectl apply -f infra/k8s infra/k8s-prod
```

1. Traefik Dashboard at http[s]://www.[domain]/dashboard/ (NOTICE THE LAST SLASH, very important)

### Pod security, use service accounts

```
$ kubectl get pods/pebble-depl-5ff7c4b5bc-h5xhd -o yaml

  serviceAccount: default
  serviceAccountName: default
  volumes:
  - name: kube-api-access-xx5st
    projected:
      defaultMode: 420
      sources:
      - serviceAccountToken:
          expirationSeconds: 3607
          path: token
      - configMap:
          items:
          - key: ca.crt
            path: ca.crt
          name: kube-root-ca.crt
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace
```

Every pod gets the `kube-api-access` volume mounted, which exposes the following inside the pod:

```
$ kubectl exec traefik-depl-77f5dd6748-gjc56 -it -- ash
$ KUBE_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
$ curl -sSk -H "Authorization: Bearer $KUBE_TOKEN" \
  https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_PORT_443_TCP_PORT/api/v1/namespaces/default/pods/$HOSTNAME
```

We get the bearer token which can access the control plane. The API permissions of the service account depend on the authorization plugin and policy in use, hence we need to customise each pod's access to the API server based on the principle of least privilege

In version 1.6+, you can opt out of automounting API credentials for a service account by setting automountServiceAccountToken: false on the service account:

We cannot disable automountServiceAccountToken for Traefik:

```
time="2021-11-16T13:53:14Z" level=error msg="Cannot start the provider *crd.Provider: failed to create in-cluster configuration: open /var/run/secrets/kubernetes.io/serviceaccount/token: no such file or directory"
```

The default service account has the following permissions

```
$ kubectl get serviceaccounts
NAME      SECRETS   AGE
default   1         72d

$ kubectl get serviceaccounts/default -o yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  creationTimestamp: "2021-09-04T18:23:38Z"
  name: default
  namespace: default
  resourceVersion: "393"
  uid: ff35ed7b-a814-4b1c-b7a4-f67ff5b61ed0
secrets:
- name: default-token-xgckj

$ kubectl get secrets default-token-xgckj
NAME                  TYPE                                  DATA   AGE
default-token-xgckj   kubernetes.io/service-account-token   3      72d

$ kubectl describe secrets default-token-xgckj
Name:         default-token-xgckj
Namespace:    default
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: default
              kubernetes.io/service-account.uid: ff35ed7b-a814-4b1c-b7a4-f67ff5b61ed0

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1066 bytes
namespace:  7 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6IlZaeVdnbjdkRnpsdHZOVVZ1ZmtROXVjeEM2ZWVZV1dZWDFRUkI3QzZpMTgifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJkZWZhdWx0Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZWNyZXQubmFtZSI6ImRlZmF1bHQtdG9rZW4teGdja2oiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVmYXVsdCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VydmljZS1hY2NvdW50LnVpZCI6ImZmMzVlZDdiLWE4MTQtNGIxYy1iN2E0LWY2N2ZmNWI2MWVkMCIsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmRlZmF1bHQifQ.rY3arfKQUw7ScDMv4P3sCwvL8ByY0sFnrVdQoosSOJhGkSgkUMjk3HjE9l__N9y3fMVsHbxLXblLv4RYqT9kKgqSqa0ntd9opWnAd9POvkNY41Q_qYPIOuol60Zzm3jiCMEJEVN6TXV5q2nkPJxGB36J6WoMK6WprEQI-ed0YBdI73i1aqHmMXHlJWI-NshIbRuA5B2mmcO5wLC_Np64T6GA8snxMqSuaR0tz-DnHr-DFSg4rD7A1jUkazt5SPwkshvWwABys3jmcilGJCeBWXSxQERRIyQC2KccQpHYA6vmO0dC-lZ4kJh3-crvmT0MlkTKW36vdRHC2HcVR8rc5w
```

seed linkerd root / intermediary

> step certificate create root.linkerd.cluster.local ca.crt ca.key \
> --profile root-ca --no-password --insecure

> step certificate create identity.linkerd.cluster.local issuer.crt issuer.key --profile intermediate-ca --not-after 8760h --no-password --insecure \
> --ca ca.crt --ca-key ca.key

> kubectl -n linkerd create secret generic linkerd-identity-issuer \
>  --from-file=tls.crt=issuer.crt \
>  --from-file=tls.key=issuer.key \
>  --from-file=ca.crt=ca.crt

> kubectl -n linkerd create configmap linkerd-identity-trust-roots \
>  --from-file=ca-bundle.crt=ca.crt

> kubectl -n traefik create secret generic linkerd-trust-bundle \
>  --from-file=ca.crt=ca.crt

> mkcert -cert-file /certs/traefik-tls.crt -key-file /certs/traefik-tls.key "$DOMAIN" "*.$DOMAIN"

> linkerd install --set proxyInit.runAsRoot=true --identity-external-ca --identity-external-issuer > output.yaml

## Ephemeral workloads

0. Build and push the Docker image of the microservice in this pull request, tag it and export the file to use in the kustomize build next step. All namespace scoped resources will now use the namespace resources, for example the trafik ingress will now point to the identity instance in this namespace

skaffold build \
 --profile identity-prod \
 --file-output build.json

skaffold render \
 --profile identity-prod \
 --build-artifacts build.json \
 --namespace identity-pr-123 \
 --output identity-pr-123.yaml

1. Programmatically create the namespace for the ephemeral microservice

kubectl create namespace identity-pr-123
kubectl label namespace identity linkerd.io/inject=enabled

2. Commit this file to the Flux directory so that the controller syncs the state of the cluster with the new ephemeral microservice namespace

mkdir -p clusters/dev/apps/identity-pr-123

export PR_DOMAIN=pr-123.tma.com
envsubst < identity-pr-123.yaml > clusters/dev/apps/identity-pr-123/identity.yaml

git add clusters/dev/apps/identity-pr-123
git commit -m "Deploy identity domain pr preview for pr #123"
git push

3. Don't forget to clean up this namespace after the PR is merged or closed (automate it in CI).

# Keys

## JWT

step crypto keypair jwt-public.pem jwt-private.pem \
 --kty EC --crv P-256 --use sig --alg ES256

kubectl create secret generic identities-jwt-keys \
 --from-file=jwt-private.pem \
 --from-file=jwt-public.pem \
 --dry-run=client -o yaml > secrets/identities-jwt-keys.yaml

sops --encrypt --in-place secrets/identities-jwt-keys.yaml

## Linkerd

# Generate the Linkerd trust anchor (root CA)

step certificate create root.linkerd.cluster.local ca.crt ca.key \
 --profile root-ca --no-password --insecure

# Generate the Linkerd issuer certificate and key signed by the trust anchor

step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
 --profile intermediate-ca --not-after=8760h \ # 1 year
--ca ca.crt --ca-key ca.key --no-password --insecure

kubectl create secret tls linkerd-identity-issuer \
 --cert=issuer.crt --key=issuer.key \
 --dry-run=client -o yaml > linkerd-identity-issuer.yaml

kubectl create secret generic linkerd-trust-anchor \
 --from-file=ca.crt=ca.crt \
 --dry-run=client -o yaml > linkerd-trust-anchor.yaml

sops --encrypt --in-place linkerd-identity-issuer.yaml
sops --encrypt --in-place linkerd-trust-anchor.yaml

## Traefik

mkcert -install

mkcert -cert-file traefik.crt -key-file traefik.key \
 "tma.com" "\*.tma.com" localhost 127.0.0.1 ::1

kubectl create secret tls traefik-tls \
 --cert=traefik.crt --key=traefik.key \
 --dry-run=client -o yaml > traefik-tls.yaml

sops --encrypt --in-place traefik-tls.yaml

# Install Flux

flux install --namespace=flux-system

flux install \
 --components=source-controller,kustomize-controller,image-reflector-controller,image-automation-controller \
 --export > gotk-components.yaml

#

kubectl get ns signoz -o json | jq
kubectl get clickhouseinstallations.clickhouse.altinity.com -n signoz
kubectl patch clickhouseinstallations.clickhouse.altinity.com signoz-clickhouse \
 -n signoz \
 --type merge \
 -p '{"metadata":{"finalizers":null}}'
kubectl delete clickhouseinstallations.clickhouse.altinity.com signoz-clickhouse -n signoz

# From Postgres to Rate Limits — Clean, Cohesive, Easy Math

Think of the system like this:

- Postgres = total lanes
- pg.Pool.max = lanes per pod
- inFlight = cars allowed on the road
- p95 = travel time
- throughput = cars finishing per second
- rateLimit = how aggressive one driver can be

We calculate from the database upward.

---

# 1) Start With Postgres (Hard Limit)

Default:

max_connections = 100

You cannot exceed this. Ever.

If you do:

- Connections block
- Latency spikes
- Things break

So everything must fit under 100.

---

# 2) Reserve Some Safety Buffer

Never give all 100 to the app.

Reserve 20:

usable = 100 − 20 = 80

Now the entire system must stay under 80.

---

# 3) Allocate Budget to Auth

Let’s give auth 75%:

auth_budget = 80 × 0.75 = 60

This means:

All auth pods combined may open at most 60 DB connections.

---

# 4) Divide by Replicas → pg.Pool.max

If you run 3 pods:

pg.Pool.max = 60 / 3 = 20

Each pod can open 20 connections.

Across all pods:

3 × 20 = 60

Still within safe DB budget.

Why this matters:
Without pg.Pool.max, one pod could consume all 100 connections and kill the database.

---

# 5) Choose Safe Concurrency (Don’t Use 100%)

Even though 60 connections exist,
don’t run at 100%.

Use ~60% to avoid saturation:

safe_concurrency = 60 × 0.6 = 36

This means:

At most 36 DB operations should run simultaneously.

This prevents:

- Lock storms
- Queue buildup
- Latency explosions

---

# 6) inFlight = Enforce That Concurrency

inFlight limits how many HTTP requests execute at once.

Set:

inFlight_cluster = safe_concurrency = 36

If 2 Traefik pods:

per_instance = 36 / 2 = 18

Now:

No more than 36 DB-heavy requests run at once.
The DB never saturates.

This protects infrastructure stability.

# 7️⃣ Throughput (Validation, Not Enforcement)

Given:

safe_concurrency = 36  
p95 = 70ms

Each concurrency slot completes:

1 / 0.07 (in seconds) = 1000 / 70 ( in ms ) = 14.28 requests per second

Total sustainable throughput:

throughput ≈ safe_concurrency / p95  
throughput ≈ 36 requests / (70ms/1000 ms in 1 second, convert to seconds) ≈ 514 RPS

## Unit Check

36 requests / 0.07 seconds  
= 514 requests / second

Units simplify to:

RPS

This is theoretical sustainable throughput under current latency.

Important:

- This validates your concurrency model.
- It does NOT enforce it.
- inFlight enforces concurrency.
- Throughput math just tells you the ceiling.

If p95 changes, throughput changes.  
inFlight still protects you.

---

# 8️⃣ Designing rateLimit (Abuse Friction Layer)

We design rate limits not to protect the DB (inFlight does that),  
but to increase attacker cost and reduce noise.

Define:

C = sustainable_rps (requests / second)  
L = per_ip_limit_rps (requests / second / IP)

We want to know:

How many IPs are required to saturate the system?

Formula:

N = C / L

## Dimensional Analysis

N = (RPS) / (RPS / IP)

Dividing by a fraction means multiplying by its reciprocal:

= RPS × (IP / RPS)

Cancel RPS:

= IP

So:

N = number of IPs required to saturate the system

---

## Example

C = 500 RPS  
L = 0.3 RPS per IP (≈20 per minute)

Then:

N = 500 / 0.3 ≈ 1667 IPs

Meaning:

An attacker needs ~1700 distinct IPs to fully saturate theoretical throughput.

That is economically non-trivial.

So rateLimit is chosen to:

- Allow legitimate human behavior
- Force large botnet scale to cause trouble
- Reduce edge waste and noise

It is an economic lever, not a capacity lever.

---

# 9️⃣ Burst Logic (Token Bucket Model)

average = sustained refill rate  
burst = bucket capacity

Example:

average: 20/min  
burst: 40

Interpretation:

- Client may send 40 requests immediately.
- Bucket refills at 20 per minute.
- Sustained rate becomes:

20 / 60 = 0.33 RPS

Units:

20 requests / 60 seconds  
= 0.33 requests / second

Burst:

- Improves UX for short spikes.
- Does not increase sustained throughput.
- Does not override inFlight.

---

# 🔟 Do You Technically Need rateLimit?

## Question 1

Will my DB die without rateLimit if inFlight exists?

Answer:

No.

If inFlight is correct, the DB remains safe.  
inFlight caps concurrency.  
Pool caps connections.  
The system survives.

---

## Question 2

Should I remove rateLimit entirely?

Answer:

No.

Because without rateLimit:

- TLS termination cost increases
- Traefik CPU increases
- Log volume explodes
- Bandwidth waste increases
- Error rate becomes noisy
- Observability degrades

rateLimit reduces attack surface cost.  
inFlight guarantees survival.

They solve different problems.

---

# 1️⃣1️⃣ Clean Final Mental Model

## Hard Physics (Cannot Be Violated)

DB connections  
→ pool caps  
→ safe_concurrency  
→ inFlight

This guarantees survival.

---

## Economic Friction (Can Be Tuned)

rateLimit per IP  
→ increase attacker cost  
→ reduce noise  
→ improve fairness

This guarantees sanity.

---

# Final One-Line Summary

Throughput math validates concurrency.  
inFlight enforces capacity.  
Rate limits price the cost of abuse.
