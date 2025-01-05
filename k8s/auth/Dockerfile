# Base
FROM node:alpine AS base

RUN apk add --no-cache tini

ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /home/node/app

ENV NODE_ENV=production

# Dependencies
FROM base AS dependencies

COPY --chown=node:node package*.json ./

RUN npm ci --only=production

# Development
FROM base AS dev

ENV NODE_ENV=development

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000 9229

USER node

CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# Production
FROM base AS prod

COPY --from=dependencies /home/node/app/node_modules ./node_modules

COPY --chown=node:node . .

EXPOSE 3000

USER node

CMD ["node", "src/index.mjs"]