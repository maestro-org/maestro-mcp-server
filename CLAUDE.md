# Maestro MCP Server - Developer Guide

This document provides essential context for working with the Maestro MCP Server codebase.

## Overview

This is a **Model Context Protocol (MCP) server** that provides LLM-accessible tools for interacting with Bitcoin blockchain via the Maestro API platform. It exposes 119 tools covering addresses, assets (BRC20/Runes/Inscriptions), blocks, transactions, mempool data, and Node RPC operations.

## Architecture

```
src/
├── index.ts           # Main server (4400+ lines) - tool definitions, MCP handlers, API execution
└── streamable-http.ts # HTTP transport layer using Hono framework
```

### Key Components

1. **Tool Definition Map** (`toolDefinitionMap`) - Static map of 119 API endpoints translated to MCP tools
2. **Zod Schema Cache** (`zodSchemaCache`) - Pre-compiled validation schemas for all tools
3. **Session Management** (`MCPStreamableHttpServer.sessions`) - Per-session state including auth tokens
4. **HTTP Client** (`apiClient`) - Axios instance with connection pooling

## Code Generation

The server is **auto-generated** from OpenAPI specification:

```bash
npx openapi-mcp-generator --input openapi-merged.json --output ./ \
  --force --transport streamable-http --port 3000
```

Look for `/* MAESTRO OVERRIDE */` comments to find custom modifications that should be preserved when regenerating.

## Performance Optimizations (2026-02)

The following optimizations were implemented to improve reliability and performance:

### 1. Zod Schema Caching
- **Before**: `eval()` called on every API request to convert JSON Schema → Zod
- **After**: All schemas pre-compiled at startup, cached in `zodSchemaCache`
- **Impact**: Eliminates ~5-10ms per request

### 2. Per-Session Authentication
- **Before**: Single `bearerAuth` string shared across all sessions (bug)
- **After**: Each session stores its own `bearerAuth` in `SessionData`
- **Impact**: Fixes correctness issue with multiple concurrent clients

### 3. HTTP Connection Pooling
- **Before**: New TCP/TLS connection for every API call
- **After**: `apiClient` with `keepAlive: true`, 50 max sockets
- **Impact**: Reduced latency for subsequent requests

### 4. ListTools Response Caching
- **Before**: Created 119 new objects on every `tools/list` call
- **After**: `cachedToolsForClient` built once at startup
- **Impact**: Zero allocation on tools listing

### 5. Async File Operations
- **Before**: Synchronous `fs.statSync()` and `fs.readFileSync()`
- **After**: Async `fs.promises.stat()` and `fs.promises.readFile()`
- **Impact**: Non-blocking static file serving

### 6. Module-Level Imports
- **Before**: Dynamic `import('fs')` on every static file request
- **After**: Imports at module level with pre-computed paths
- **Impact**: Eliminates module resolution overhead

### 7. Session Timeout/Cleanup
- **Before**: Sessions stored indefinitely until explicit close
- **After**: Automatic cleanup of sessions inactive for 30 minutes (configurable)
- **Impact**: Prevents memory leaks from abandoned sessions

### 8. Configurable Logging
- **Before**: Verbose `console.error()` on every request
- **After**: Debug logging controlled by `LOG_LEVEL` env var
- **Impact**: Reduced I/O overhead in production

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level (`info` or `debug`) |
| `API_BASE_URL` | `https://xbt-mainnet.gomaestro-api.org/v0` | Maestro API endpoint |
| `SESSION_TIMEOUT_MS` | `1800000` | Session timeout (30 min) |

## API Authentication

The server supports Bearer token authentication passed via the `Authorization` header:

```
Authorization: Bearer <maestro-api-key>
```

Tokens are stored per-session and passed to the Maestro API as the `api-key` header.

## Testing

```bash
# Build
bun run build

# Start server
PORT=3001 bun run start:http

# Test health endpoint
curl http://localhost:3001/health

# Test MCP initialize
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

## Key Files to Understand

1. **[src/index.ts](src/index.ts)** - Main entry point
   - Lines 22-66: Imports and configuration (logging, HTTP agents, caches)
   - Lines 67-110: Server and cache initialization
   - Lines 3890-3930: Cache initialization function
   - Lines 3932-3965: MCP request handlers
   - Lines 4088-4180: `executeApiTool()` - API call execution
   - Lines 4463-4486: `getZodSchemaFromJsonSchema()` - Schema lookup

2. **[src/streamable-http.ts](src/streamable-http.ts)** - HTTP transport
   - Lines 65-72: `SessionData` interface
   - Lines 74-120: Session cleanup logic
   - Lines 132-239: Request handling with per-session auth
   - Lines 271-281: `getBearerAuth()` - Per-session token retrieval

## Common Tasks

### Adding a New Tool
Tools are auto-generated from `openapi-merged.json`. To add manually:
1. Add entry to `toolDefinitionMap` in `index.ts`
2. Schema will be auto-compiled at startup

### Modifying API Call Behavior
Edit `executeApiTool()` function in `index.ts` (around line 4088).

### Changing Session Behavior
Edit `MCPStreamableHttpServer` class in `streamable-http.ts`.

### Debugging
Set `LOG_LEVEL=debug` for verbose output:
```bash
LOG_LEVEL=debug bun run start:http
```

## Known Issues

1. Two tools have malformed JSON schemas that fail Zod compilation:
   - `mkt-btc-prices-by-timestamps`
   - `mkt-rune-prices-by-timestamps`

   These fall back to passthrough validation and still work.

2. The `API_BASE_URL` environment variable support was added but the value is also hardcoded as a fallback.
