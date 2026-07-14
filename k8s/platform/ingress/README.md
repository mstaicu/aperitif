# Ingress

This unit runs Traefik and its CRDs. Domains own their API and UI
`IngressRoute`s; the platform owns the controller and TLS entry points.

Deploy locally with:

```sh
make -C platform/ingress deploy
```

The command installs the CRDs, installs the local mkcert CA, adds `tma.com` and
`api.tma.com` to `/etc/hosts`, creates a cluster-local TLS Secret, and deploys
Traefik. It therefore changes both the workstation and the current Kubernetes
cluster. Generated certificates are temporary and never committed.

CI can reach Traefik without changing DNS:

```sh
kubectl -n traefik port-forward service/traefik-public 8443:443
```

Production uses Traefik ACME with Cloudflare DNS-01. Direct origin restriction,
multiple ingress replicas, and hardened forwarded-header trust remain
production work in [TODO.md](../../TODO.md).

Render manifests with:

```sh
kubectl kustomize platform/ingress/crds >/dev/null
kubectl kustomize platform/ingress/overlays/ephemeral >/dev/null
kubectl kustomize platform/ingress/overlays/prod-eu >/dev/null
```
