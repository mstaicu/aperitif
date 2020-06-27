FROM node:12-stretch AS build
 
WORKDIR /build
 
COPY package.json package-lock.json ./
 
RUN npm ci

COPY . .

FROM alpine:3.10

RUN apk add --update nodejs-current

RUN addgroup -S node && adduser -S node -G node

USER node

WORKDIR /home/node/code

COPY --chown=node:node --from=build /build .

EXPOSE 3000

CMD ['node', 'index.js']