# AGENTS.md

Ingress agent traps only. Read `README.md` for the platform model.

- Keep Gateway API CRDs before Traefik. Gateway and HTTPRoute resources fail
  before the CRDs exist.
- Do not commit local mkcert output. `make ingress` creates local TLS material.
- Gateway listeners use `allowedRoutes.namespaces.from: All`; do not add
  namespace-label attachment policy unless the repo intentionally changes that
  model.
- In kind or CI, use `kubectl port-forward` instead of relying on
  LoadBalancer host behavior.
