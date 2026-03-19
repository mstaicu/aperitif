helm repo add linkerd https://helm.linkerd.io/stable
helm repo update

helm search repo linkerd --versions

helm template linkerd-crd linkerd/linkerd-crds \
 --version 1.8.0 \
 --set installGatewayAPI=true > linkerd-crd.yaml

helm template linkerd-control-plane linkerd/linkerd-control-plane \
 --version 1.16.11 \
 --set identity.externalCA=true \
 --set identity.issuer.scheme=kubernetes.io/tls \
 --set proxyInit.runAsRoot=true \
 -n linkerd > linkerd-depl.yaml
