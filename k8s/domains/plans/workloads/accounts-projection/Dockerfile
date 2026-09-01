FROM docker.io/library/node:26.7.0-alpine3.24 AS base

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
# it forwards signals to the projection process and reaps child processes.
ENTRYPOINT ["/sbin/tini", "--"]

# DEPS
FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

# DEV
FROM base AS dev

ENV NODE_ENV=development

RUN chown node:node /home/node/app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000

USER node

# Dev process tree:
#   tini
#     nodemon
#       node src/index.mjs
# Keep nodemon as tini's direct child so Skaffold restarts and pod termination
# do not go through npm or a shell wrapper.
CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# PROD
FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node src ./src

USER node

# Prod process tree:
#   tini
#     node src/index.mjs
# Run node directly in prod so SIGTERM reaches the worker through one tiny init
# layer, without npm or shell signal-forwarding behavior in the middle.
CMD ["node", "src/index.mjs"]
