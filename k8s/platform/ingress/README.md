# Ingress

Traefik CRDs, Traefik, local TLS, and dashboard routing.

Domain API/UI units own their own `IngressRoute`s.

## Local

```sh
make -C platform/ingress deploy
```

The target installs CRDs, creates local mkcert TLS, updates `/etc/hosts`, and
deploys Traefik. Local routing uses the fixed `tma.com` and `api.tma.com`
hostnames.

For kind/CI:

```sh
kubectl -n traefik port-forward svc/traefik-lb 8443:443
```

## Live

Live TLS is Traefik ACME with Cloudflare DNS-01. Do not commit local mkcert
material.

TODO: after direct load-balancer access is blocked to Cloudflare IP ranges, make
the live `https` entrypoint trust Cloudflare forwarded headers. Do not apply
that to the internal `http` entrypoint.

## Checks

```sh
kubectl kustomize platform/ingress/crds
kubectl kustomize platform/ingress/overlays/ephemeral
kubectl kustomize platform/ingress/overlays/prod-eu
```
