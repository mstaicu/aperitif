helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm search repo nats --versions

helm template nats nats/nats \
 --version 2.12.4 \
 --set config.jetstream.enabled=true \
 --set config.jetstream.memoryStore.enabled=true \
 --set config.cluster.enabled=true
