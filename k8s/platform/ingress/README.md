# Ingress Platform

Ingress owns Traefik, Gateway API CRDs, shared Gateways, and the Traefik dashboard route.

It does not own domain API routes. Domain APIs own their own `HTTPRoute` resources and attach to the shared Gateway by labeling their namespace.

## Units

```text
crds -> ingress
```

- `crds`: Gateway API CRDs required before Gateway/HTTPRoute resources can be applied.
- `ingress`: Traefik deployment, services, GatewayClass, Gateways, and dashboard route.

## Local

`make ingress` is the local entrypoint. It:

- applies Gateway API CRDs,
- waits for CRDs to be established,
- installs the local mkcert CA,
- adds the configured domain to `/etc/hosts`,
- creates the local `traefik-tls` Secret,
- deploys Traefik through Skaffold,
- waits for `traefik-depl`.

The default local domain is `tma.com`:

```sh
make ingress
```

Override it when needed:

```sh
make ingress DOMAIN=example.test
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

Gateway listeners accept routes only from namespaces labeled:

```yaml
tma.com/gateway-access: traefik
```

API overlays add this label because APIs own HTTPRoutes. DB and migrate overlays should not carry ingress semantics unless they share a namespace object that must remain consistently labeled.

## Checks

```sh
kubectl kustomize platform/ingress/crds
kubectl kustomize platform/ingress/overlays/dev
kubectl kustomize platform/ingress/overlays/live
```
