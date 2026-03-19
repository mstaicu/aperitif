# https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/

helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts

helm repo update

helm install my-opentelemetry-collector open-telemetry/opentelemetry-collector \
 --set image.repository="otel/opentelemetry-collector-k8s" \
 --set mode=<daemonset|deployment|statefulset>
