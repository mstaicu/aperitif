FROM node:14.15-alpine as base

EXPOSE 3000

ENV NODE_ENV=production

ENV PATH /home/node/node_modules/.bin:$PATH

ENV PORT=3000
ENV MORGAN_LEVEL='common'

WORKDIR /home/node

RUN apk add --no-cache tini

USER node

COPY package*.json ./

RUN npm ci

HEALTHCHECK --interval=12s --timeout=12s --start-period=30s \  
  CMD node healthcheck.js

ENTRYPOINT ["/sbin/tini", "--"]

# To build the dev stage:
# $ docker build -t express:dev --target dev .
#
# ⚠️ Trying to run a container based on the development image
# will fail, as there are no sources copied in the image
#
# This stage is intended to be used in docker-compose
FROM base as dev

ENV NODE_ENV=development

RUN npm install --only=development

# WORKDIR creates folders with the root user as the owner
# which prevents us from writing with the node user
# when building the app
RUN mkdir /home/node/api

WORKDIR /home/node/api

CMD ["ts-node-dev", \
  "--inspect=0.0.0.0:9229", \
  "--transpile-only", \
  "./src/index.ts" \
]

FROM dev as build

# Since the development target has the bind mounted sources,
# we need to copy the contents of the express api in the production
# image file system
#
# We copy the contents in the /home/node folder, which has the hoisted
# node modules
#
# Note that we won't copy the host node modules in the 
# production image due to our rules in .dockerignore, which does not
# include the host node modules when tar-ing the context before
# sending it to the Docker engine
COPY --chown=node:node . .

# TODO: Implement a build process that bundles, minifies the sources
RUN tsc

# To build the prod stage:
# $ docker build -t express:prod .
FROM base as prod

COPY --from=build /home/node/api/dist/ ./dist

RUN npm prune && npm cache clean --force

CMD ["node", "./dist"]
