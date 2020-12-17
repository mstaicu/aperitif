FROM node:14.15-alpine

# These env vars should be passed by the runtime orchestrator
ENV PORT=3000
ENV MORGAN_LEVEL='tiny'
ENV SIGNATURE='hahaha'

EXPOSE 3000

# RUN apk add --no-cache tini

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

COPY . .

RUN npm run build

# ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "./dist"]
