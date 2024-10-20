# ----
# Base
# ----
FROM node:alpine AS base

ENV NODE_ENV=production

EXPOSE 3000

RUN apk add --no-cache tini

WORKDIR /home/node/app

ENTRYPOINT ["/sbin/tini", "--"]

# ----
# Dev
# ----
FROM base AS dev

ENV NODE_ENV=development

COPY ./package*.json ./

RUN npm install

COPY . .

# Expose debug port for dev stage
EXPOSE 9229

CMD ["./node_modules/.bin/nodemon", "src/index.mjs"]

# ----
# Prod
# ----
FROM base AS prod

ENV NODE_ENV=production

COPY ./package*.json ./

RUN npm install

COPY . .

USER node

CMD ["node", "src/index.mjs"]