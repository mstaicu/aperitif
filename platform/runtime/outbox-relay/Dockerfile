FROM docker.io/library/node:26.7.0-alpine3.24 AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app

ENTRYPOINT ["/sbin/tini", "--"]

FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

FROM base AS dev

ENV NODE_ENV=development

RUN chown node:node /home/node/app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000

USER node

CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

FROM base AS prod

ENV NODE_ENV=production

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node src ./src

USER node

CMD ["node", "src/index.mjs"]
