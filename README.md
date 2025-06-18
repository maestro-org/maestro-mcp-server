# Maestro MCP Server

[![CI](https://github.com/maestro-org/maestro-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/maestro-org/maestro-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server for interacting with Bitcoin via the Maestro API platform. Provides tools for exploring blocks, transactions, addresses, and more on the Bitcoin blockchain.

---

## Quick Links

- **Hosted Mainnet:** [`https://xbt-mainnet.gomaestro-api.org/v0/mcp`](https://xbt-mainnet.gomaestro-api.org/v0/mcp)
- **Hosted Testnet4:** [`https://xbt-testnet.gomaestro-api.org/v0/mcp`](https://xbt-testnet.gomaestro-api.org/v0/mcp)
- **API Key Required:** [Get your Maestro API key](https://docs.gomaestro.org/getting-started)
- **Client Examples:** [maestro-mcp-client-examples](https://github.com/maestro-org/maestro-mcp-client-examples)

---

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/en) v20 or higher

### Installation & Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Copy and edit environment variables
cp .env.example .env
# Edit .env to add your Maestro API key and any other config
```

### Running the Server

```bash
npm run start:http
```

- The server will start on the port specified in your `.env` (default: 3000).
- Access the MCP endpoint at `http://localhost:<PORT>/mcp`.

---

## Features

- 🚀 **Streamable HTTP MCP server** ([spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http))
- 🔑 **API Key authentication** (see `.env.example`)
- 📦 **Multiple APIs:**
  - Blockchain Indexer
  - Mempool Monitoring
  - Market Price
  - Wallet
  - Node RPC
- 🌐 **Supported Networks:**
  - Mainnet: `API_BASE_URL=https://xbt-mainnet.gomaestro-api.org/v0`
  - Testnet4: `API_BASE_URL=https://xbt-testnet.gomaestro-api.org/v0`

---

## API Reference & Examples

- [Maestro API Postman Workspace](https://www.postman.com/go-maestro/maestro-api/overview)
- [Client Usage Examples](https://github.com/maestro-org/maestro-mcp-client-examples)

---

## Server Generation

This server is generated using [`openapi-mcp-generator`](https://github.com/harsha-iiiv/openapi-mcp-generator):

```bash
npx openapi-mcp-generator --input openapi-merged.json --output ./ --force --transport streamable-http --port 3000
```

---

## Contributing & Development

Contributions and feature requests are welcome! Please:

- Document your changes clearly
- Submit a [pull request](https://github.com/maestro-org/maestro-mcp/compare) or [open an issue](https://github.com/maestro-org/maestro-mcp/issues/new)

### Local Development

- Use `npm run dev` for hot-reloading (if configured)
- Run tests with `npm test`

---

## Support

- [Open an issue](https://github.com/maestro-org/maestro-mcp/issues/new)
- [Join Discord](https://discord.gg/ES2rDhBJt3)

---

## License

[Apache 2.0](LICENSE)
