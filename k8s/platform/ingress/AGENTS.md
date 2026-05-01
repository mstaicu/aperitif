# AGENTS.md

Ingress agent traps only. Read `README.md` for the platform model.

- Keep Gateway API CRDs before Traefik. Gateway and HTTPRoute resources fail
  before the CRDs exist.
- Do not commit local mkcert output. `make ingress` creates local TLS material.
- Only API namespaces need `tma.com/gateway-access: traefik`; do not add
  ingress semantics to DB/migrate overlays unless they share that namespace.
- In kind or CI, use `kubectl port-forward` instead of relying on
  LoadBalancer host behavior.
