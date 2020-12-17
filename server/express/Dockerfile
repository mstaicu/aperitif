##############################################
#                  2-stage                   #
##############################################

# To build the dev stage:
# $ docker build -t express:dev --target dev .
FROM node:14.15-alpine as dev

ENV NODE_ENV=development

EXPOSE 3000

WORKDIR /app

RUN apk add --no-cache tini

COPY package*.json ./

RUN npm install

COPY . .

# These env vars should be passed by the runtime orchestrator
ENV PORT=3000
ENV MORGAN_LEVEL='tiny'
ENV SIGNATURE='hahaha'

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["./node_modules/.bin/ts-node-dev", "--transpile-only", "--ignore-watch=node_modules", "./src/index.ts"]

# To build the prod stage:
# $ docker build -t express:prod .
FROM dev as prod

ENV NODE_ENV=production

# Compile / build the Typescript app
RUN npm run build
# Remove the development dependencies after building the app
RUN npm prune && npm cache clean --force
# RUN rm -v !("filename1"|"filename2") 

# These env vars should be passed by the runtime orchestrator
ENV PORT=3000
ENV MORGAN_LEVEL='tiny'
ENV SIGNATURE='hahaha'

CMD ["node", "./dist"]
