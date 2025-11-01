https://github.com/SigNoz/charts/blob/main/charts/signoz/README.md

helm repo add signoz https://charts.signoz.io
helm repo update
helm template signoz signoz/signoz \
 --namespace signoz \
 --create-namespace \
 --set global.storageClass=hostpath
