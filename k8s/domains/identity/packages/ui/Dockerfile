FROM node:25-alpine AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app

# Kubernetes placement hierarchy:
#   Kubernetes cluster
#     Node
#       Pod
#         Container
#           PID 1 process
#             child processes
#
# Kubernetes sends pod shutdown signals to container PID 1. Tini is PID 1 here:
# it forwards signals and reaps child processes. `-g` sends signals to the
# process group, which matters in dev because the UI runs two watchers.
ENTRYPOINT ["/sbin/tini", "-g", "--"]

# DEPS
FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

# DEV
FROM base AS dev

ENV NODE_ENV=development
ENV PORT=3000

RUN chown node:node /home/node/app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

# 9229 should be for debugger
EXPOSE 3000 9229

USER node

# Dev process tree:
#   tini
#     sh ./dev.sh
#       esbuild --watch=forever
#       tsx --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./app/platform/observability/otel.ts --watch server.ts
# Keep npm out of the container process chain. `dev.sh` starts both watchers,
# leaves the server watcher in the foreground, and cleans up the asset watcher
# on exit. Tini's process-group mode sends SIGTERM to both watchers during
# Skaffold restarts and Kubernetes pod termination.
CMD ["sh", "./dev.sh"]

# BUILD
FROM base AS build

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

# PROD
FROM base AS prod

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --from=build /home/node/app/dist ./dist
COPY --from=build /home/node/app/public ./public
COPY --chown=node:node package*.json ./

EXPOSE 3000

USER node

# Prod process tree:
#   tini
#     node --experimental-loader=@opentelemetry/instrumentation/hook.mjs --import ./dist/otel.js dist/server.js
# Run node directly in prod so SIGTERM reaches the server through one tiny init
# layer, without npm or shell signal-forwarding behavior in the middle. OTel is
# preloaded before the server so automatic HTTP instrumentation can patch first.
CMD ["node", "--experimental-loader=@opentelemetry/instrumentation/hook.mjs", "--import", "./dist/otel.js", "dist/server.js"]
