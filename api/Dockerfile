FROM node:14.15-alpine as base

ENV NODE_ENV=production

EXPOSE 3000

RUN apk add --no-cache tini

#
# Install the node modules, in the container, in the parent directory of the api sources
#
# Reason for this is to give developers the freedom to run the api either as part of 
# a container orchestrator or as standalone application
#
ENV PATH /home/node/api/node_modules/.bin:$PATH

USER node

RUN mkdir /home/node/api

WORKDIR /home/node/api

COPY package*.json ./

RUN npm ci

# HEALTHCHECK --interval=30s CMD node healthcheck.js

ENTRYPOINT ["/sbin/tini", "--"]

#
# To build the dev stage:
#
# $ docker build -t api:dev --target dev .
#
# ⚠️ This stage is intended to be used in docker-compose
#
# Trying to run a container based on the development image
# will fail, as there are no sources copied in the image.
# The sources are bind mounted by docker-compose
#
FROM base as dev

ENV NODE_ENV=development

RUN npm install --only=development

#
# WORKDIR creates folders with the root user as the owner
# which prevents us from writing with the node user
# when building the app
#
RUN mkdir /home/node/api/dev

WORKDIR /home/node/api/dev

CMD ["ts-node-dev", \
  "--inspect=0.0.0.0:9229", \
  "--transpile-only", \
  "./src" \
]

FROM dev as build

#
# Since the development target has the sources bind mounted,
# we need to copy the sources of the api from the host file system
# in order to build the sources for production
#
# We copy the contents in the /home/node folder, which has the hoisted
# node modules
#
# Note that we won't copy the host node modules in the 
# production image due to our rules in .dockerignore, which does not
# include the host node modules when tar-ing the context before
# sending it to the Docker engine
#
COPY --chown=node:node . .

# TODO: Implement a build process that bundles, minifies the sources
RUN tsc

FROM build as audit

USER root

RUN apk add curl \
    && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin \
    && trivy filesystem --exit-code 1 --no-progress /

#
# To build the prod stage:
# $ docker build -t mdstaicu/api .
#
FROM base as prod

COPY --from=build /home/node/api/dev/dist /home/node/api/dist

CMD ["node", "/home/node/api/dist"]
