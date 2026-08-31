# Ingress

This unit runs Traefik and its CRDs. Domains own their API and UI
`IngressRoute`s; the platform owns the controller and TLS entry points.

```sh
make -C platform/cluster/ingress deploy
```

For local development, the command installs the CRDs, local mkcert CA, temporary
cluster TLS Secret, hosts entries for `tma.com`, `api.tma.com`, `traefik.tma.com`,
and `observe.tma.com`, then deploys Traefik. It changes both the workstation and
the selected Kubernetes cluster. Generated certificates are temporary and never
committed.

The local dashboard is at `https://traefik.tma.com/dashboard/`. CI can reach
Traefik without local DNS changes:

```sh
kubectl -n traefik port-forward service/traefik-public 8443:443
```

Production uses Traefik ACME with Cloudflare DNS-01. Redundant ingress, direct-
origin restriction, and hardened forwarded-header trust remain intentional
production work in [TODO.md](../../../TODO.md).

```sh
kubectl kustomize platform/cluster/ingress/crds >/dev/null
kubectl kustomize platform/cluster/ingress/overlays/ephemeral >/dev/null
kubectl kustomize platform/cluster/ingress/overlays/prod-eu >/dev/null
```
