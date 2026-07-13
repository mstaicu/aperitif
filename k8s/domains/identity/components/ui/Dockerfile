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

EXPOSE 3000

USER node

# Dev process tree:
#   tini
#     sh ./dev.sh
#       esbuild --watch=forever
#       tsx --watch server.ts
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

CMD ["node", "dist/server.js"]
