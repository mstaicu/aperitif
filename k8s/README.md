In case you reset the cluster

kubectl create secret generic jwt-secret --from-literal=JWT_SECRET=asdf
kubectl create secret generic stripe-secret --from-literal=STRIPE_KEY=sk_test*...

Adding a new service:

1. Create the package folder, add sources, install dependencies
2. Create the Docker image locally:
   $ docker build -t mdstaicu/expiration .
3. Push the Docker image to dockerhub under your username, else you'll get order-depl-5677d794fb-wx6zz 0/1 ImagePullBackOff 0 10m
   $ docker push mdstaicu/expiration

Debug why traffic doesn't reach any services

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
traefik-srv ClusterIP 10.107.161.105 <none> 80/TCP 26s

Fix the <pending> state of the entry to Traefik by deleting the service while Skaffold is running, then closing Skaffold and restarting the cluster

$ kubectl delete service traefik-lb-srv

Debug Mongo

1. kubectl exec ticket-mongo-depl-5dddd6d44-4n6lh -it -- bash
2. show dbs;
3. use tickets; || use orders;
4. db.tickets.find()

Test optimistic concurrency control (from browser, with session)

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

Caveats:

Mongoose broke @types/bson for mongoose.Types.ObjectId.isValid and toHexString. Install @types/bson@4.0.3

Update NPM packages:

npm update @tartine/commons

Traefik https://doc.traefik.io/traefik/user-guides/crd-acme/

# Use kubectl to switch contexts from docker-desktop to Digital Ocean

1. Install and Configure doctl https://docs.digitalocean.com/reference/doctl/how-to/install/
2. Generate an access Applications & API Token https://cloud.digitalocean.com/account/api/tokens?i=23e796
3. $ doctl auth init
4. The commands under `doctl kubernetes cluster kubeconfig` are used to manage Kubernetes cluster credentials on your local machine. `doctl kubernetes cluster kubeconfig` to configure `kubectl` to connect to the cluster. You are then able to use `kubectl` to create and manage workloads. `doctl kubernetes cluster kubeconfig save <digital ocean cluster name>` This command adds the credentials for the specified cluster to your local kubeconfig. After this, your kubectl installation can directly manage the specified cluster.
5. $ doctl kubernetes cluster kubeconfig save k8s-ticketing
   Notice: Adding cluster credentials to kubeconfig file found in "/Users/mircea/.kube/config"
   Notice: Setting current-context to do-fra1-k8s-ticketing
6. $ kubectl config view
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

7. From this point on, any commands issued by kubectl will be ran on the digital ocean cluster
8. $ kubectl get nodes
   NAME STATUS ROLES AGE VERSION
   pool-hpo8g2vpl-81479 Ready <none> 141m v1.21.3
   pool-hpo8g2vpl-8147z Ready <none> 141m v1.21.3
   pool-hpo8g2vpl-814mn Ready <none> 141m v1.21.3
9. If we wanna switch back to the docker desktop local context
   $ kubectl config view
   $ kubectl config use-context <name of context>
   $ kubectl config use-context do-fra1-k8s-ticketing

# Build and deploy images from Workflows

1. Add a Github secret containing the Docker login token, Docker username and Digital Ocean access token

# Deploy infra

1. Buy a domain name, update the nameservers where you bought the domain name from, then:
  1. go to Digital Ocean
  1. go to Networking, Domains
  1. Enter the purchased domain name, without the www subdomain
  1. The purchased domain should point to the LoadBalancer of the cluster, go to A records, enter '@' in the Hostname input and 'Will redirect' to the cluster's LoadBalancer
  1. Add a CNAME, enter 'www' in the Hostname input and for the 'Is an alias of' input enter '@'
2. Update the prod ingress-depl with the new domain name in the Host rules
3. Create the secrets
  $ kubectl create secret generic jwt-secret --from-literal=JWT_SECRET=asdf
  $ kubectl create secret generic stripe-secret --from-literal=STRIPE_KEY=sk_test...
4. Create the cluster resources
  $ kubectl apply -f infra/k8s-setup
  $ kubectl apply -f infra/k8s infra/k8s-prod
5. Traefik Dashboard at http[s]://www.[domain]/dashboard/ (NOTICE THE LAST SLASH, very important)