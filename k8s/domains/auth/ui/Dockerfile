FROM docker.io/library/node:26.7.0-alpine3.24@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019 AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app

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

CMD ["node", "--watch", "--import", "remix/node-tsx", "src/server.ts"]

# PROD
FROM base AS prod

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node tsconfig.json ./tsconfig.json

EXPOSE 3000

USER node

CMD ["node", "--import", "remix/node-tsx", "src/server.ts"]
