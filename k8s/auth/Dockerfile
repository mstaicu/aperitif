# Base
FROM node:alpine AS base

WORKDIR /home/node/app

RUN apk add --no-cache tini

ENTRYPOINT ["/sbin/tini", "--"]

ENV NODE_ENV=production

USER node

# Dependencies
FROM base AS dependencies

COPY package*.json ./

RUN npm ci --only=production

# Development
FROM base AS dev

ENV NODE_ENV=development

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000 9229

CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# Production
FROM base AS prod

COPY --from=dependencies /home/node/app/node_modules ./node_modules

COPY . .

EXPOSE 3000

CMD ["node", "src/index.mjs"]