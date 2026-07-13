FROM node:25-alpine AS base

RUN apk add --no-cache tini

WORKDIR /home/node/app

ENTRYPOINT ["/sbin/tini", "--"]

FROM base AS deps

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --strict-peer-deps

FROM base AS dev

ENV NODE_ENV=development
ENV PORT=3000

RUN chown node:node /home/node/app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000

USER node

CMD ["./node_modules/.bin/tsx", "--watch", "server.ts"]

FROM base AS build

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build

FROM base AS prod

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /home/node/app/node_modules ./node_modules
COPY --from=build /home/node/app/dist ./dist
COPY --chown=node:node package*.json ./

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
