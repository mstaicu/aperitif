# Ingress Platform

Ingress owns Traefik, Traefik CRDs, and local dashboard routing.

## Units

```text
crds -> ingress
```

- `crds`: Traefik CRDs.
- `ingress`: Traefik deployment, services, dashboard route, TLS config.

Domain API/UI units own their own `IngressRoute`s.

## Local

```sh
make deploy-ingress
make deploy-ingress DOMAIN=example.test
```

The target installs CRDs, creates local mkcert TLS, updates `/etc/hosts`, deploys
Traefik, and waits for `traefik-depl`.

For kind/CI, use a port-forward:

```sh
kubectl -n traefik port-forward svc/traefik-lb 8443:443
```

## Live

Flux reconciles:

```text
clusters/prod-eu/platform/ingress.yaml
platform/ingress/overlays/live
```

Live TLS is Traefik ACME with Cloudflare DNS-01. Do not commit local mkcert
material.

## Checks

```sh
kubectl kustomize platform/ingress/crds
kubectl kustomize platform/ingress/overlays/dev
kubectl kustomize platform/ingress/overlays/live
```
