https://github.com/traefik/traefik-helm-chart/blob/master/README.md
https://github.com/traefik/traefik-helm-chart/blob/master/CONTRIBUTING.md#about-crds

helm repo list

helm repo add traefik https://traefik.github.io/charts
helm repo update

helm search repo traefik/traefik --versions

helm show crds traefik/traefik \
  --version 39.0.6 \
  > crds.yaml

helm template traefik traefik/traefik \
  --version 39.0.6 \
  -n traefik \
  > controller.yaml

# Cloudflare

1. Cloudflare custom token -> Zone → DNS → Edit AND Zone → Zone → Read
2. Add it to traefik-cf, encrypt it with with age