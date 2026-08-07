#!/bin/sh
set -eu

PATH="./node_modules/.bin:$PATH"
export PATH

# esbuild watches browser-only entrypoints and writes the files loaded by
# <script type="module" src="/auth/assets/*.client.js">.
esbuild app/pages/*.client.ts \
  --bundle \
  --format=esm \
  --outdir=public/auth/assets \
  --entry-names='[name]' \
  --sourcemap \
  --watch=forever &

assets_pid="$!"
trap 'kill "$assets_pid" 2>/dev/null || true' EXIT INT TERM

NODE_ENV=development tsx \
  --watch server.ts
