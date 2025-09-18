# Welcome to k8s!

-> Load Balancer
-> Client ( receives cookies, unpacks them and forwards the request with Bearer )
-> (This should be exposed publicly in the future) Traefik
-> forwardAuth ( exclude auth services requests )
-> Microservices

## Development

From your terminal:

```sh
task
```

This starts the entire cluster in development mode, redeploying services on file changes

## Debug

From your terminal:

```sh
task debug
```

This starts the entire cluster in debug mode where you can attach debuggers to the applications running inside the containers, redeploying services on file changes

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

$ nats subscribe --stream=math --creds /tmp/auth.creds

$ nats consumer add math worker-1 --filter "math.>" --deliver all --ack all --creds /tmp/auth.creds

$ nats consumer next math worker-1 --creds /tmp/auth.creds

$ nats pub math.add '{"id": 1}' --creds /tmp/auth.creds
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

kubectl create secret generic auth-jwt-keys \
  --from-file=jwt-private.pem \
  --from-file=jwt-public.pem \
  --dry-run=client -o yaml > secrets/auth-jwt-keys.yaml

sops --encrypt --in-place secrets/auth-jwt-keys.yaml

## Linkerd

# Generate the Linkerd trust anchor (root CA)
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure

# Generate the Linkerd issuer certificate and key signed by the trust anchor
step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
  --profile intermediate-ca --not-after=8760h \  # 1 year
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
  "tma.com" "*.tma.com" localhost 127.0.0.1 ::1

kubectl create secret tls traefik-tls \
  --cert=traefik.crt --key=traefik.key \
  --dry-run=client -o yaml > traefik-tls.yaml

sops --encrypt --in-place traefik-tls.yaml
