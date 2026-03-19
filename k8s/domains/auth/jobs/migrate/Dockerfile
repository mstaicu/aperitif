FROM node:22-alpine

WORKDIR /app

# This path is relative to the Docker build context
# cd ./domains/auth
# docker build -f jobs/migrate/Dockerfile .
# That last dot specifies the context that this Dockerfile
# uses as a starting point
COPY jobs/migrate/package*.json ./
RUN npm ci --omit=dev

COPY migrations /migrations

CMD ["node_modules/.bin/node-pg-migrate", "up", "-m", "/migrations"]

# /
#  ├── app
#  │    ├── package.json
#  │    ├── node_modules/
#  │
#  └── migrations
#       └── 1770740146106_init.sql