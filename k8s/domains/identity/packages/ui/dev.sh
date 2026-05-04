#!/bin/sh
set -eu

PATH="./node_modules/.bin:$PATH"
export PATH

# esbuild watches browser-only entrypoints and writes the files loaded by
# <script type="module" src="/identity/assets/*.client.js">.
esbuild app/pages/*.client.ts \
  --bundle \
  --format=esm \
  --outdir=public/identity/assets \
  --entry-names='[name]' \
  --sourcemap \
  --watch=forever &

assets_pid="$!"
trap 'kill "$assets_pid" 2>/dev/null || true' EXIT INT TERM

# tsx preloads OTel before server.ts so HTTP/Undici instrumentation can patch
# the runtime before Remix creates the server and performs internal fetches.
NODE_ENV=development tsx \
  --experimental-loader=@opentelemetry/instrumentation/hook.mjs \
  --import ./app/platform/observability/otel.ts \
  --watch server.ts
