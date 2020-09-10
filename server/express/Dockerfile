# ---------- Build ----------
FROM node:14.10.0 AS build

ENV NODE_ENV production

WORKDIR /home/node/workdir

COPY package*.json .env ./

COPY src ./src

RUN npm install

# If necessary, add a step to build the app

# ---------- Runtime ----------
FROM node:14.10.0-slim

ENV NODE_ENV production

WORKDIR /home/node/server

USER node

COPY --chown=node:node --from=build /home/node/workdir .

# Currently publishing the Docker image with the production dependencies 
# and the unobfuscated sources on the container's filesystem
# RUN npm ci --production && npm cache clean --force

# If the --production flag is specified or the NODE_ENV environment variable is set to production, 
# this command will remove the packages specified in your devDependencies. 
# Setting --no-production will negate NODE_ENV being set to production.

RUN npm prune

EXPOSE 3000

# Currently publishing the Docker image with the production dependencies 
# and the unobfuscated sources on the container's filesystem
CMD ["sh", "-c", "exec node -r esm src"]