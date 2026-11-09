FROM docker.io/library/node:26.10.0-alpine3.24 AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app

ENTRYPOINT ["/sbin/tini", "--"]

FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node src ./src

USER node

CMD ["node", "src/index.mjs"]
