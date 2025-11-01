helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm template nats nats/nats \
 --set config.jetstream.enabled=true \
 --set config.jetstream.memoryStore.enabled=true \
 --set config.cluster.enabled=true --wait

helm template nack nats/nack \
 --set jetstream.nats.url=nats://nats.default.svc.cluster.local:4222 --wait
