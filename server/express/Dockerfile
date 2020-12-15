# ---------- Build ----------
FROM node:14.10.0 AS build

ENV NODE_ENV production

WORKDIR /home/node/workdir

COPY package*.json .env ./

COPY src ./src

RUN npm install

# ---------- Runtime ----------
FROM node:14.10.0-slim

ENV NODE_ENV production

WORKDIR /home/node/server

USER node

COPY --chown=node:node --from=build /home/node/workdir .

RUN npm prune

EXPOSE 3000

CMD ["sh", "-c", "exec node -r esm src"]