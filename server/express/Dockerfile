# ---------- Build ----------
FROM node:12-stretch AS build

WORKDIR /build

COPY package*.json .env ./
COPY src ./src

RUN npm ci

RUN npm prune --production

# ---------- Runtime ----------
FROM alpine:3.10

RUN apk add --update nodejs-current

RUN addgroup -S node && adduser -S node -G node

USER node

WORKDIR /home/node/express

COPY --chown=node:node --from=build /build .

EXPOSE 3000

# todo: find a way to 'npm run start'
# CMD ['node', 'index.js']