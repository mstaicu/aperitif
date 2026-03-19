helm repo update

helm template linkerd-control-plane linkerd/linkerd-control-plane --set identity.externalCA=true --set identity.issuer.scheme=kubernetes.io/tls --set proxyInit.runAsRoot=true -n linkerd > linkerd-depl.yaml

helm template linkerd-crd linkerd/linkerd-crds --set installGatewayAPI=true > linkerd-crd.yaml
