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

CMD ["npm", "run", "dev"]

# ----
# Build
# ----
FROM dev as build

RUN npm run build

# ----
# Prod
# ----
FROM base as prod

COPY --from=build /home/node/app/public /home/node/app/public
COPY --from=build /home/node/app/.next /home/node/app/.next
COPY --from=build /home/node/app/package.json /home/node/app/package.json

USER node

CMD ["npm", "start"]
