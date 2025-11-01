https://github.com/traefik/traefik-helm-chart/blob/master/README.md

helm repo add traefik https://traefik.github.io/charts
helm template traefik-crds traefik/traefik-crds
helm template traefik oci://ghcr.io/traefik/helm/traefik --skip-crds