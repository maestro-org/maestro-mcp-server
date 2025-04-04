# maestro-mcp

A Model Context Protocol (MCP) server for interacting with Bitcoin via the Maestro RPC API. This package provides a set of tools for exploring blocks, transactions, addresses, and other aspects of the Bitcoin blockchain.


### Installation

#### Requirements
- Python >=3.10
- Python MCP SDK >= 1.2.0
- `uv`

#### Install UV
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Setup Virual Environment
```bash
# Create a virtual environment
uv venv

# Activate virtual environment
# Linux/MacOS
source .venv/bin/activate
# Windows
# .venv\Scripts\activate

# Install dependencies
pip install .
```

### Configure Claude (Desktop)

Download Claude Desktop [here](https://claude.ai/download).

#### Steps
1. Open Claude Desktop settings
    
    ![](https://github.com/user-attachments/assets/2112c203-ae28-4a97-881a-b98a629c7809)

2. Select `Edit Config`

    ![](https://github.com/user-attachments/assets/23a2faf2-d634-4cbd-ba6c-b62a1aeb18b8)

3. Open the Claude App configuration file located at: `~/Library/Application Support/Claude/claude_desktop_config.json` and copy the below contents into this file

You will need 3 things:
1. Absolute path to `uv`; ie, `which uv`
2. Absolute path to `mcp-maestro` repo
3. Maestro API key

```json
{
  "mcpServers": {
    "maestro-mcp": {
      "command": "/ABSOLUTE/PATH/TO/uv",
      "args": [
        "--directory",
        "/ABSOLUTE/PATH/TO/maestro-mcp",
        "run",
        "maestro.py"
      ],
      "env": {
        "MAESTRO_API_BASE": "https://xbt-mainnet.gomaestro-api.org/v0",
        "MAESTRO_API_KEY": "<MAESTRO_API_KEY>"
      }
    }
  }
}
```

### Usage
- Restart Claude after any change to either the `claude_desktop_config.json` or the source code.

1. Launch Claude Desktop

2. Locate hammer icon
    ![](https://github.com/user-attachments/assets/21bdf2a4-eaaf-47fb-b613-b24a6624b6d6)

3. View available MCP tools
    ![](https://github.com/user-attachments/assets/690c7a01-1454-4e7c-970d-bb05e55ae1c2)

4. Prompt Claude
- "Fetch the latest Bitcoin block"
- "Get the blockchain info for Bitcoin"

    ![](https://github.com/user-attachments/assets/5389404c-0c42-4e30-abba-80c3a618f9dd)

**NOTE:** You will need to approve the request within Claude.

### Debugging
#### CLI inspector tool
- [mcp-cli](https://github.com/wong2/mcp-cli)

#### Logs
```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp-server-maestro-mcp.log
```

### Support
If you are experiencing any trouble with the above, [open an issue](https://github.com/maestro-org/maestro-mcp/issues/new) or reach out on [Discord](https://discord.gg/ES2rDhBJt3).
