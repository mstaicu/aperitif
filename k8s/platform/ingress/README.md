# Ingress Platform

Ingress owns Traefik, Traefik CRDs, and the local Traefik dashboard route.

It does not own domain API or UI routes. Domain HTTP-serving units own their own `IngressRoute` resources.

## Units

```text
crds -> ingress
```

- `crds`: Traefik CRDs required before `IngressRoute` resources can be applied.
- `ingress`: Traefik deployment, services, and the local dashboard route.

## Local

`make deploy-ingress` is the local entrypoint. It:

- applies Traefik CRDs,
- waits for CRDs to be established,
- installs the local mkcert CA,
- adds the configured domain to `/etc/hosts`,
- creates the local `traefik-tls` Secret,
- deploys Traefik through Skaffold,
- waits for `traefik-depl`.

The default local domain is `tma.com`:

```sh
make deploy-ingress
```

Override it when needed:

```sh
make deploy-ingress DOMAIN=example.test
```

In kind or CI, prefer a port-forward instead of relying on host LoadBalancer behavior:

```sh
kubectl -n traefik port-forward svc/traefik-lb 8443:443
```

## Live

Live ingress is reconciled by Flux from:

```text
clusters/prod-eu/platform/ingress.yaml
```

The Kustomization points at:

```text
platform/ingress/overlays/live
```

Live TLS is issued by Traefik ACME through Cloudflare DNS-01. The Cloudflare token must be managed as environment-specific secret material. Do not commit generated local mkcert material.

## Route Attachment

Domain API/UI units own their own `IngressRoute`s. Public routes bind to the `https` entrypoint and internal routes bind to the `http` entrypoint.

## Checks

```sh
kubectl kustomize platform/ingress/crds
kubectl kustomize platform/ingress/overlays/dev
kubectl kustomize platform/ingress/overlays/live
```
