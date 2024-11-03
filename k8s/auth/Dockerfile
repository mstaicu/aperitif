# ----
# Base
# ----
FROM node:alpine AS base

ENV NODE_ENV=production

RUN apk add --no-cache tini

WORKDIR /home/node/app

ENTRYPOINT ["/sbin/tini", "--"]

# ----
# Dependencies
# ----
#
# Install production dependencies only, to leverage layer caching
#
FROM base AS dependencies

COPY package*.json ./
RUN npm ci --only=production

# ----
# Development
# ----
FROM base AS dev

ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000 9229

CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# ----
# Production
# ----
FROM base AS prod

COPY --from=dependencies /home/node/app/node_modules ./node_modules

COPY . .

USER node

EXPOSE 3000

CMD ["node", "src/index.mjs"]