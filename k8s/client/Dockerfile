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

CMD ["npm", "run", "dev"]

# ----
# Build
# ----
FROM dev as build

# https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information
# By default, the container can access the secret at /run/secrets/<secret_name>, but you can customize the file name on the container using the target option.

# To build with this secret
#
# $ STRIPE_PUBLISHABLE_KEY=WTFMATE docker build -t mdstaicu/client --secret id=stripe_publishable_key,env=STRIPE_PUBLISHABLE_KEY .
#
RUN --mount=type=secret,id=stripe_publishable_key \
  STRIPE_PUBLISHABLE_KEY=$(cat /run/secrets/stripe_publishable_key) \
  npm run build

# ----
# Prod
# ----
FROM base as prod

COPY --from=build /home/node/app/public /home/node/app/public
COPY --from=build /home/node/app/.next /home/node/app/.next
COPY --from=build /home/node/app/package.json /home/node/app/package.json

USER node

CMD ["npm", "start"]
