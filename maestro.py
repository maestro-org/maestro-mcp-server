#!/usr/bin/env python

from typing import Any, Dict, Optional
import httpx
from mcp.server.fastmcp import FastMCP

# Init FastMCP server
mcp = FastMCP('maestro')

async def fetch_api(endpoint: str, params: Optional[Dict] = None) -> Dict:
    '''Make a GET request to the Maestro RPC API with error handling.'''
    headers = {
        'User-Agent': 'maestro-mcp',
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

async def post_api(endpoint: str, data: Dict) -> Dict:
    '''Make a POST request to the Maestro RPC API with error handling.'''
    headers = {
        'User-Agent': 'maestro-mcp',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': API_KEY
    }

    url = f'{MAESTRO_API_BASE}/{endpoint}'

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data, timeout=30.0)
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

@mcp.tool()
async def fetch_rune_by_id(rune_id: str) -> Dict:
    '''Retrieve rune metadata by rune ID'''
    return await fetch_api(f'assets/runes/{rune_id}')

@mcp.tool()
async def fetch_rune_balance_for_address(address_id: str, rune_id: str) -> Dict:
    '''Retrieve rune balance for an address'''
    return await fetch_api(f'addresses/{address_id}/runes/{rune_id}')

@mcp.tool()
async def fetch_transactions_for_address(address_id: str) -> Dict:
    '''Retrieve transactions for a Bitcoin address'''
    # TODO pagination
    params = {'page': 1, 'count': 25}
    return await fetch_api(f'addresses/{address_id}/txs', params=params)

@mcp.tool()
async def fetch_runes_for_address(address_id: str) -> Dict:
    '''Retrieve all runes held by an address'''
    return await fetch_api(f'addresses/{address_id}/runes')

@mcp.tool()
async def fetch_utxos_for_address(address_id: str) -> Dict:
    '''Retrieve UTXOs for a Bitcoin address'''
    return await fetch_api(f'addresses/{address_id}/utxos')

@mcp.tool()
async def submit_raw_transaction(raw_tx: str) -> Dict:
    '''Submit a raw Bitcoin transaction'''
    data = {'tx': raw_tx}
    return await post_api('rpc/transaction/submit', data)

@mcp.tool()
async def fetch_all_runes() -> Dict:
    '''Retrieve all runes on the asset registry'''
    return await fetch_api('assets/runes')

@mcp.tool()
async def fetch_transaction_from_rpc(tx_id: str) -> Dict:
    '''Retrieve raw transaction details from RPC endpoint'''
    return await fetch_api(f'rpc/transaction/{tx_id}')

@mcp.tool()
async def fetch_transaction_details(tx_id: str) -> Dict:
    '''Retrieve transaction metadata'''
    return await fetch_api(f'transactions/{tx_id}')

if __name__ == '__main__':
	# Init and run server
	mcp.run(transport='stdio')
