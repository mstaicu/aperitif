#!/bin/sh
set -eu

PATH="./node_modules/.bin:$PATH"
export PATH

esbuild app/pages/register.client.ts app/pages/login.client.ts \
  --bundle \
  --format=esm \
  --outdir=public/identities/assets \
  --entry-names='[name]' \
  --sourcemap \
  --watch=forever &

assets_pid="$!"
trap 'kill "$assets_pid" 2>/dev/null || true' EXIT INT TERM

NODE_ENV=development tsx watch server.ts
