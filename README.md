# Maestro MCP Server

[![CI](https://github.com/maestro-org/maestro-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/maestro-org/maestro-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server for interacting with Bitcoin via the Maestro API platform. Provides tools for exploring blocks, transactions, addresses, and more on the Bitcoin blockchain.

## Quick Links

- **API Key Required:** [Get your Maestro API key](https://docs.gomaestro.org/getting-started)

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
npm run start
```

- Local MCP server
- 🔑 **API Key authentication** (see `.env.example`)
- 📦 **Multiple APIs:**

  > [Full API Reference - Postman](https://www.postman.com/go-maestro/maestro-api/overview)

  - Blockchain Indexer
  - Mempool Monitoring
  - Market Price
  - Wallet
  - Node RPC

- 🌐 **Supported Networks:**
  - Mainnet: `API_BASE_URL=https://xbt-mainnet.gomaestro-api.org/v0`
  - Testnet4: `API_BASE_URL=https://xbt-testnet.gomaestro-api.org/v0`

## API Reference & Examples

- [Maestro API Postman Workspace](https://www.postman.com/go-maestro/maestro-api/overview)
- [Client Usage Examples](https://github.com/maestro-org/maestro-mcp-client-examples)

## Server Generation

This server is generated using [`openapi-mcp-generator`](https://github.com/harsha-iiiv/openapi-mcp-generator):

```bash
npx openapi-mcp-generator --input openapi-merged.json --output ./ --force --transport streamable-http --port 3000
```

## Local MCP

### Configure Claude (Desktop)

You will need 3 things:

1. Absolute path to `npm`; ie, `which npm`
2. Absolute path to `maestro-mcp-server` repo
3. Maestro API key

### Steps

1. Clone the [repo](https://github.com/maestro-org/maestro-mcp-server.git).

   _After cloning the repo, the server files are stored and sourced locally on your machine._

2. Download Claude Desktop [here](https://claude.ai/download).

3. Open Claude Desktop settings.

   ![](https://github.com/user-attachments/assets/2112c203-ae28-4a97-881a-b98a629c7809)

4. Select `Edit Config`.

5. Open the Claude App configuration file located at:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`Add commentMore actions
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

5. Copy the below into your Claude Desktop config.

```json
{
  "mcpServers": {
    "maestro-mcp-server": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": ["/ABSOLUTE/PATH/TO/maestro-mcp-server/src/index.ts"],
      "env": {
        "MAESTRO_BASE_URL": "https://xbt-mainnet.gomaestro-api.org/v0",
        "API_KEY_API_KEY": "<MAESTRO_API_KEY>"
      }
    }
  }
}
```

> **Note:** Restart Claude after any change to either the `claude_desktop_config.json` or the source code.

### Usage

1. Launch Claude Desktop.

2. Locate the tools icon.

   ![](https://github.com/user-attachments/assets/053e1589-faf9-4ec9-bab8-2f77b44f2757)

3. Select `maestro-mcp-server`.

   ![](https://github.com/user-attachments/assets/302b2535-8b1c-4cab-b3f6-e244a0ffddcc")

4. View available MCP tools.

   ![](https://github.com/user-attachments/assets/91503920-6908-463b-b27f-614acf052ac5)

5. Prompt Claude.

- "Fetch the latest Bitcoin block"
- "Get the blockchain info for Bitcoin"

  ![](https://github.com/user-attachments/assets/5389404c-0c42-4e30-abba-80c3a618f9dd)

  > **NOTE:** You will need to approve the request within Claude.

### Debugging

#### CLI inspector tool

- [mcp-cli](https://github.com/wong2/mcp-cli)

#### Logs

```bash
tail -n 20 -f ~/Library/Logs/Claude/maestro-mcp-server.log
```

## Contributing & Development

Contributions and feature requests are welcome! Please:

- Document your changes clearly
- Submit a [pull request](https://github.com/maestro-org/maestro-mcp/compare) or [open an issue](https://github.com/maestro-org/maestro-mcp/issues/new)

### Local Development

- Use `npm run dev` for hot-reloading (if configured)
- Run tests with `npm test`

## Support

- [Open an issue](https://github.com/maestro-org/maestro-mcp/issues/new)
- [Join Discord](https://discord.gg/ES2rDhBJt3)

## License

[Apache 2.0](LICENSE)
