FROM oven/bun:1-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

FROM base AS pkg
WORKDIR /usr/src/app
# Copy package files for better layer caching
COPY package.json bun.lock ./

FROM pkg AS build
# Install all dependencies including devDependencies for building
RUN bun install --frozen-lockfile
# Copy source files only (thanks to .dockerignore)
COPY . .
# Build the application
RUN bun run build

FROM pkg AS deps
# Install only production dependencies
RUN bun install --frozen-lockfile --production

FROM base AS maestro-mcp-server

LABEL org.opencontainers.image.source=https://github.com/maestro-org/maestro-mcp-server

# Create non-root user early in the layer
RUN addgroup -g 65532 -S nonroot && \
    adduser -S nonroot -u 65532 -G nonroot

WORKDIR /usr/src/app

# Copy production dependencies and built application
COPY --from=deps --chown=nonroot:nonroot /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=nonroot:nonroot /usr/src/app/build .

USER nonroot

EXPOSE 3000

ENV HOST=0.0.0.0 \
    NODE_ENV=production

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "index.js", "--transport=streamable-http"]
