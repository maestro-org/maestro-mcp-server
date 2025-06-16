FROM node:24-alpine AS base

FROM base AS pkg
WORKDIR /usr/src/app
COPY package.json package-lock.json ./

FROM pkg AS build
RUN npm ci
COPY . .
RUN npm run build

FROM pkg AS deps
RUN npm ci --only=production

FROM base AS maestro-mcp-server

LABEL org.opencontainers.image.source=https://github.com/maestro-org/maestro-mcp-server

# Create non-root user
RUN addgroup -g 65532 -S nonroot && \
    adduser -S nonroot -u 65532 -G nonroot

WORKDIR /usr/src/app

COPY --from=deps --chown=nonroot:nonroot /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /usr/src/app/build .

USER nonroot

EXPOSE 3000

ENV HOST=0.0.0.0

CMD ["node", "index.js", "--transport=streamable-http"]
