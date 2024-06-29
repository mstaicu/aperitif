# ----
# Base
# ----
FROM node:alpine as base

ENV NODE_ENV=production

EXPOSE 3000

RUN apk add --no-cache tini

WORKDIR /home/node/app

ENTRYPOINT ["/sbin/tini", "--"]

# ----
# Dev
# ----
FROM base as dev

ENV NODE_ENV=development

COPY ./package*.json ./

RUN npm install

COPY . .

CMD ["./node_modules/.bin/nodemon", "src/server.js"]

# ----
# Prod
# ----
FROM base as prod

ENV NODE_ENV=production

COPY ./package*.json ./

RUN npm install

COPY . .

CMD ["node", "src/server.js"]