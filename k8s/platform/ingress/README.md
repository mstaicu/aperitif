# Ingress Platform

Ingress owns Traefik, Gateway API CRDs, shared Gateways, and the Traefik dashboard route.

It does not own domain API or UI routes. Domain HTTP-serving units own their own `HTTPRoute` resources and attach to the shared Gateway.

## Units

```text
crds -> ingress
```

- `crds`: Gateway API CRDs required before Gateway/HTTPRoute resources can be applied.
- `ingress`: Traefik deployment, services, GatewayClass, Gateways, and dashboard route.

## Local

`make deploy-ingress` is the local entrypoint. It:

- applies Gateway API CRDs,
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

Live TLS and DNS provider material must be managed as environment-specific secrets. Do not commit generated local mkcert material.

## Route Attachment

Gateway listeners currently accept routes from all namespaces. Domain API/UI units own their own `HTTPRoute`s; DB and migrate units should not own gateway concerns.

The public Gateway has separate HTTPS listeners for browser UI traffic on `tma.com` and API traffic on `api.tma.com`. Public route host ownership still belongs on the `HTTPRoute`, and internal routes stay hostless on `traefik-igw`.

## Checks

```sh
kubectl kustomize platform/ingress/crds
kubectl kustomize platform/ingress/overlays/dev
kubectl kustomize platform/ingress/overlays/live
```
