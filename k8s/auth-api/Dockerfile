FROM node:25-alpine AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app
ENTRYPOINT ["/sbin/tini", "--"]

# DEPS
FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

# DEV
FROM base AS dev

ENV NODE_ENV=development

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

# 9229 should be for debugger
EXPOSE 3000 9229

USER node

# tini
#   └── nodemon
#         └── node
CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# PROD
FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

USER node

# tini
#   └── node
CMD ["node", "src/index.mjs"]