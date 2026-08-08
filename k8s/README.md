# Aperitif

A small Kubernetes platform for independently developed domains.

```text
domains/             business domains and their deployable components
platform/            ingress, event bus, and observability
clusters/prod-eu/    production Flux inventory
.github/workflows/   checks and image publication
```

## Domains

| Domain     | Owns                                                 |
| ---------- | ---------------------------------------------------- |
| `auth`     | Users, passkeys, sessions, operator status, and JWKS |
| `accounts` | Accounts and membership                              |
| `plans`    | Plans and resolved account features                  |

Each domain owns its database. Domains exchange versioned events through an
outbox and NATS JetStream; they never read each other's databases.

Each deployable component keeps its implementation, Dockerfile, and Kubernetes
manifests under `domains/<domain>/components/<component>`.

## Work locally

Install tools:

```sh
brew bundle
```

Deploy the shared units you need:

```sh
make -C platform/ingress deploy
make -C platform/event-bus deploy
make -C platform/observability deploy  # optional
```

Every domain exposes the same commands:

```sh
make -C domains/<domain> help
make -C domains/<domain> check
make -C domains/<domain> migrate
make -C domains/<domain> deploy
make -C domains/<domain> dev
```

There is no root Makefile or repository-wide development loop.

## Deliver changes

When this directory becomes the repository root:

```text
pull request
  -> check changed domains and platform units

merge to master
  -> build changed component images
  -> scan the immutable image digest
  -> move :latest to that digest
  -> Flux commits the digest into the production overlay
  -> Flux reconciles the cluster
```

Infrastructure changes are reconciled directly from Git. Database changes use
expand/contract, and migration Jobs complete before dependent workloads.

See [clusters/prod-eu/README.md](clusters/prod-eu/README.md) for production
bootstrap and operation.

## Secrets and telemetry

Secrets remain SOPS-encrypted in their environment overlays. Ephemeral and
production use different Age keys. KSOPS decrypts locally; Flux decrypts
production with `Secret/flux-system/sops-age`.

Applications and Traefik send OpenTelemetry to the cluster Collector. The node
agent collects container logs and Kubernetes metrics. Environment overlays
choose the backend; both currently use OpenObserve.

See [TODO.md](TODO.md) for unfinished production work.
