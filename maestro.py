#!/usr/bin/env python

import os
from dotenv import load_dotenv
from typing import Any, Dict, Optional
import httpx
from mcp.server.fastmcp import FastMCP

'''
Config

"maestro": {
  "command": "/Users/jr/.local/bin/uv",
  "args": [
    "--directory",
    "/Users/jr/Desktop/work/maestro/repos/mcp/maestro",
    "run",
    "maestro.py"
  ],
  "env": {
    "MAESTRO_API_KEY": "<MAESTRO_API_KEY>"
  }
}

Logs

tail -n 20 -f ~/Library/Logs/Claude/mcp-maestro.log
'''

# Load env vars
load_dotenv()

# Init FastMCP server
mcp = FastMCP('maestro')

# Constants
MAESTRO_API_BASE = 'https://xbt-testnet.gomaestro-api.org/v0'
API_KEY = os.getenv('MAESTRO_API_KEY', '')

async def fetch_api(endpoint: str, params: Optional[Dict] = None) -> Dict:
    '''Make a request to the Maestro RPC API with proper error handling.'''
    headers = {
        'User-Agent': 'mcp-maestro',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': API_KEY
    }

    url = f'{MAESTRO_API_BASE}/{endpoint}'

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

@mcp.tool()
async def fetch_blockchain_info() -> Dict:
    '''Retrieve blockchain info'''
    return await fetch_api('rpc/general/info')

@mcp.tool()
async def fetch_latest_block() -> Dict:
    '''Retrieve latest block'''
    params = {'page': 1, 'count': 100}
    return await fetch_api('rpc/block/latest', params=params)

if __name__ == '__main__':
	# Init and run server
	mcp.run(transport='stdio')
