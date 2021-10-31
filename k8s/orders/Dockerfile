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

COPY . .

RUN npm install

CMD ["npm", "start"]

# ----
# Build
# ----
FROM dev as build

# TODO: Bundle the application
RUN npm run build

# ----
# Prod
# ----
FROM base as prod

COPY --from=build /home/node/app/dist /home/node/app

USER node

CMD ["node", "index.js"]
