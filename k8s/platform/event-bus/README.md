helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm search repo nats --versions

helm template nats nats/nats \
 --version 2.12.4 \
 --set config.jetstream.enabled=true \
 --set config.jetstream.memoryStore.enabled=true \
 --set config.cluster.enabled=true

helm show values nats/nats --version 2.12.4

```values.yaml

config:
  cluster:
    enabled: true
    replicas: 3

  jetstream:
    enabled: true
    fileStore:
      enabled: true
      pvc:
        enabled: true
        size: 20Gi

container:
  resources:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 2
      memory: 2Gi

podTemplate:
  configChecksumAnnotation: true
  topologySpreadConstraints:
    kubernetes.io/hostname:
      maxSkew: 1

promExporter:
  enabled: true

service:
  ports:
    leafnodes:
      enabled: false
    websocket:
      enabled: false
    mqtt:
      enabled: false
    gateway:
      enabled: false
```