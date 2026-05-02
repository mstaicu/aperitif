# UI Unit Template

Use this when a domain needs a server-rendered UI unit.

- Keep the UI as its own deployable unit under `domains/<domain>/ui`.
- Keep route definitions explicit in `app/routes.ts`, rooted at `/<domain>`.
- Keep server actions/loaders in `app/pages`; do not call another domain database.
- Keep domain API calls in `app/domains`.
- Call domain APIs through the gateway URL configured by env, not through direct service names unless the overlay explicitly owns that choice.
- Keep browser JavaScript small and only for browser-only capabilities such as WebAuthn, drag/drop, or client-side progressive enhancement.

Suggested Remix 3 beta spine:

```txt
ui/
  app/
    domains/
      domain.ts
    pages/
      home.ts
    router.ts
    routes.ts
  public/
    assets/
  package.json
  server.ts
  tsconfig.json
```

Keep browser code next to the page that owns it, for example
`app/pages/register.client.ts`. Do not create `app/ui/` until shared UI actually
exists.

This template intentionally does not include Kubernetes manifests. Add `infra/ui`
only when the UI becomes a deployable unit for the domain, and keep the API on
`/<domain>/v1` so UI and API routes do not conflict.
