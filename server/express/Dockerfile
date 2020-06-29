# ---------- Build ----------
FROM node:12-stretch AS build

ENV NODE_ENV production

WORKDIR /build

COPY package*.json .env ./

COPY src ./src

RUN npm ci

# If NODE_ENV environment variable is set to production,
# this command will remove the packages specified in your devDependencies
RUN npm prune

# ---------- Runtime ----------
FROM alpine:3.10

ENV NODE_ENV production

RUN apk add --update nodejs-current

RUN addgroup -S node && adduser -S node -G node

USER node

WORKDIR /home/node/express

COPY --chown=node:node --from=build /build .

EXPOSE 3000

# Currently publishing the Docker image with the production dependencies 
# and the unobfuscated sources on the container's filesystem
CMD ["sh", "-c", "exec node -r esm src"]