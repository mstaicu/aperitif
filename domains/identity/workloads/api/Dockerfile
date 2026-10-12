FROM docker.io/library/node:26.10.0-alpine3.24 AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app/workloads/api

ENTRYPOINT ["/sbin/tini", "--"]

FROM base AS deps

COPY --chown=node:node contracts/package*.json /home/node/app/contracts/
COPY --chown=node:node workloads/api/package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

FROM base AS dev

ENV NODE_ENV=development

RUN chown node:node /home/node/app

COPY --chown=node:node contracts /home/node/app/contracts
COPY --chown=node:node workloads/api ./
RUN npm ci

EXPOSE 3000

USER node

CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/workloads/api/node_modules ./node_modules
COPY --chown=node:node contracts /home/node/app/contracts
COPY --chown=node:node workloads/api/src ./src

EXPOSE 3000

USER node

CMD ["node", "src/index.mjs"]
