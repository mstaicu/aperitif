################################################
#                  2-stage                     #
################################################

################################################
# To build the dev stage:                      #
# $ docker build -t express:dev --target dev . #
################################################

# Development file system structure:
# /home
#   /node
#     /node_modules
#     /package.json
#     /package-lock.json
#
#     /api

FROM node:14.15-alpine as dev

ENV NODE_ENV=development

EXPOSE 3000

RUN apk add --no-cache tini

WORKDIR /home/node

COPY package*.json ./

RUN npm i

WORKDIR /home/node/api

COPY . .

# Default environment variables
ENV PORT=3000
ENV MORGAN_LEVEL='tiny'

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["../node_modules/.bin/ts-node-dev", \
  "--inspect=0.0.0.0:9229", \
  "--transpile-only", \
  "./src/index.ts" \
]

################################################
# To build the prod stage:                     #
# $ docker build -t express:prod .             #
################################################

# Production file system structure:
# /home
#   /node
#     /node_modules
#     /package.json
#     /package-lock.json
#
#     /dist

FROM dev as prod

ENV NODE_ENV=production

# Compile the Typescript web application sources
# using the hoisted Debian built node modules

RUN ["../node_modules/.bin/tsc"]

WORKDIR /home/node

# Move the distribution out of the development sources
# and remove the sources from the production image
RUN ["cp", "-r", "./api/dist", "./dist"]
RUN ["rm", "-rf", "./api"]

# Remove the development dependencies after building the app
RUN npm prune && npm cache clean --force

# Default environment variables
ENV PORT=3000
ENV MORGAN_LEVEL='common'

CMD ["node", "./dist"]
