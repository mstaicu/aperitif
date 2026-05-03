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
  .dockerignore
  Dockerfile
  dev.sh
  package.json
  server.ts
  tsconfig.json
```

Keep browser code next to the page that owns it, for example
`app/pages/register.client.ts`. Do not create `app/ui/` until shared UI actually
exists.

After copying the template, run `npm install` in the new UI folder and commit
the generated `package-lock.json`; the Dockerfile uses `npm ci`.

If the UI adds browser-only entrypoints, extend `build` and `dev.sh` to compile
them into `public/<domain>/assets`. If `dev.sh` starts more than one watcher,
switch the Dockerfile entrypoint to `tini -g` so Kubernetes shutdown signals
reach the whole process group.

This template intentionally does not include Kubernetes manifests. Add `infra/ui`
only when the UI becomes a deployable unit for the domain, and keep the API on
`api.tma.com/<domain>/v1` so UI and API routes do not conflict on `tma.com`.
