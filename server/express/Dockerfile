FROM node:14.15-alpine as base

EXPOSE 3000

RUN apk add --no-cache tini

WORKDIR /home/node

ENV PORT=3000
ENV MORGAN_LEVEL='common'

COPY package*.json ./

RUN npm install

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

WORKDIR /home/node/api

CMD ["../node_modules/.bin/ts-node-dev", \
  "--inspect=0.0.0.0:9229", \
  "--transpile-only", \
  "./src/index.ts" \
]

# To build the prod stage:
# $ docker build -t express:prod .
FROM base as prod

ENV NODE_ENV=production

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
COPY . .

# TODO: Implement a build process that bundles, minifies the sources
RUN ./node_modules/.bin/tsc

# Remove the sources after we've compiled the Typescript sources to Javascript
RUN rm -rf ./src

# TODO: Find a better way of uninstalling the development node modules
RUN npm prune && npm cache clean --force

CMD ["node", "./dist"]
