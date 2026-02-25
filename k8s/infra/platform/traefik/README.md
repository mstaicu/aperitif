https://github.com/traefik/traefik-helm-chart/blob/master/README.md
https://github.com/traefik/traefik-helm-chart/blob/master/CONTRIBUTING.md#about-crds

helm repo list

helm repo add traefik https://traefik.github.io/charts
helm repo update

helm search repo traefik/traefik --versions

helm show crds traefik/traefik \
  --version 39.0.2 \
  > crds.yaml

helm template traefik traefik/traefik \
  --version 39.0.2 \
  -n traefik \
  > controller.yaml