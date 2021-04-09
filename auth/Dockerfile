#
# Base
#
FROM node:14.15-alpine as base

ENV NODE_ENV=production

EXPOSE 3000

RUN apk add --no-cache tini

USER node

WORKDIR /home/node

COPY package*.json ./

RUN npm ci

ENTRYPOINT ["/sbin/tini", "--"]

#
# Dev
# $ docker build -t starters/auth .
#
FROM base as dev

ENV NODE_ENV=development

COPY --chown=node:node . .

RUN npm install --only=development

CMD ["npm", "start"]

#
# Build
#
FROM dev as build

# TODO: Implement a build process that bundles, minifies the sources
RUN tsc

#
# Audit
#
FROM build as audit

USER root

RUN apk add curl \
    && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin \
    && trivy filesystem --exit-code 1 --no-progress /

#
# Prod
# $ docker build -t starters/auth .
#
FROM base as prod

COPY --from=build /home/node/dist /home/node/dist

CMD ["node", "/home/node/dist"]
