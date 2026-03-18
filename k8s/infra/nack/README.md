helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm search repo nats --versions

helm template nack nats/nack \
 --set jetstream.nats.url=nats://nats.default.svc.cluster.local:4222 \
 --version 0.33.2
