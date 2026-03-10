```yaml
# values.yaml

global:
  clusterName: fintech-cluster

postgresql:
  enabled: false

signoz-otel-gateway:
  enabled: false

redpanda:
  enabled: false

signoz:
  replicaCount: 1

otelCollector:
  replicaCount: 1

clickhouse:
  persistence:
    size: 20Gi
```

```bash
helm repo add signoz https://charts.signoz.io
helm repo update

helm template signoz signoz/signoz \
  --namespace observability \
  --create-namespace \
  -f values.yaml \
  > signoz-rendered.yaml
```

`kubectl-slice signoz-rendered.yaml --output-dir signoz-manifests`