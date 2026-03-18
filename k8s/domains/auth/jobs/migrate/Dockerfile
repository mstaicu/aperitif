FROM node:22-alpine

WORKDIR /app

COPY jobs/migrate ./
RUN npm ci

COPY migrations /migrations

CMD ["node", "src/index.mjs"]