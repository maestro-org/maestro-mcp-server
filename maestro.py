#!/usr/bin/env python

import httpx
from mcp.server.fastmcp import FastMCP
from typing import Any, Awaitable, Callable, Dict, List, Optional
from config import API_KEY, MAESTRO_API_BASE

# Init FastMCP server
mcp = FastMCP('maestro')

headers = {
    'User-Agent': 'maestro-mcp',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'api-key': API_KEY
}

# Helpers

async def fetch_api(endpoint: str, params: Optional[Dict] = None) -> Dict:
    '''Make a GET request to the Maestro RPC API with error handling'''
    url = f'{MAESTRO_API_BASE}/{endpoint}'

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

async def post_api(endpoint: str, data: Dict) -> Dict:
    '''Make a POST request to the Maestro RPC API with error handling'''
    url = f'{MAESTRO_API_BASE}/{endpoint}'

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=data, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

async def paginate_api(
    fetch_fn: Callable[[Optional[str]], Awaitable[Dict]],
) -> List[Dict]:
    '''General-purpose paginator for endpoints returning `next_cursor` and `data`'''
    results = []
    cursor = None

    while True:
        response = await fetch_fn(cursor)
        results.extend(response.get('data', []))
        cursor = response.get('next_cursor')
        if not cursor:
            break

    return results

### Heartbeat

@mcp.tool()
async def return_greeting() -> str:
    return 'hello from maestro-mcp'

### Node API
## General

@mcp.tool()
async def fetch_blockchain_info() -> Dict:
    '''Retrieve blockchain info'''
    return await fetch_api('rpc/general/info')

## Blocks
@mcp.tool()
async def fetch_latest_block() -> Dict:
    '''Retrieve latest block'''
    params = {'page': 1, 'count': 100}
    return await fetch_api('rpc/block/latest', params=params)

## Transactions
@mcp.tool()
async def submit_raw_transaction(raw_tx: str) -> Dict:
    '''Submit a raw Bitcoin transaction'''
    data = {'tx': raw_tx}
    return await post_api('rpc/transaction/submit', data)

@mcp.tool()
async def fetch_transaction_from_rpc(tx_id: str) -> Dict:
    '''Retrieve raw transaction details from RPC endpoint'''
    return await fetch_api(f'rpc/transaction/{tx_id}')

### Indexer API
## Addresses

# internal
async def fetch_rune_balance_for_address(address_id: str, rune_id: str,  cursor: Optional[str] = None) -> Dict:
    '''Retrieve rune balance for an address'''
    params = {
        'count': 100
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/runes/{rune_id}', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def fetch_all_rune_balance_for_address(address_id: str, rune_id: str) -> Dict:
    '''Retrieve rune balance for an address (paginated)'''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_rune_balance_for_address(address_id, rune_id, cursor)

    return await paginate_api(fetch_page)

# internal
async def fetch_transactions_for_address(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''List of all transactions which consumed or produced a UTxO controlled by the specified address or script pubkey'''
    params = {
        'count': 100
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/txs', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def fetch_all_transactions_for_address(address_id: str) -> List[Dict]:
    '''Retrieve all transactions for a Bitcoin address (paginated)'''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_transactions_for_address(address_id, cursor)

    return await paginate_api(fetch_page)

# internal
async def fetch_runes_for_address(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''Map of all Runes tokens and corresponding amounts in UTxOs controlled by the specified address or script pubkey'''
    params = {
        'count': 100
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/runes', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def fetch_all_runes_for_address(address_id: str) -> Dict:
    '''Map of all Runes tokens and corresponding amounts in UTxOs controlled by the specified address or script pubkey (paginated)'''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_runes_for_address(address_id, cursor)

    return await paginate_api(fetch_page)

# internal
async def fetch_utxos_for_address(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''List of all UTxOs which reside at the specified address or script pubkey'''
    params = {
        'count': 100
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/txs', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def fetch_all_utxos_for_address(address_id: str) -> List[Dict]:
    '''List of all UTxOs which reside at the specified address or script pubkey (paginated)'''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_utxos_for_address(address_id, cursor)

    return await paginate_api(fetch_page)

## Assets
@mcp.tool()
async def fetch_rune_by_id(rune_id: str) -> Dict:
    '''Retrieve rune metadata by rune ID'''
    return await fetch_api(f'assets/runes/{rune_id}')

@mcp.tool()
async def fetch_all_runes() -> Dict:
    '''List of ID and names of all deployed Rune assets'''
    return await fetch_api('assets/runes')

## Transactions
@mcp.tool()
async def fetch_transaction_details(tx_id: str) -> Dict:
    '''Retrieve transaction metadata'''
    return await fetch_api(f'transactions/{tx_id}')

### Mempool API
## Addresses

# internal
async def fetch_utxos_for_address_mempool(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''List of all UTxOs which reside at the specified address or script pubkey (mempool-aware)'''
    params = {
        'count': 100
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'mempool/addresses/{address_id}/utxos', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def fetch_all_utxos_for_address_mempool(address_id: str) -> List[Dict]:
    '''List of all UTxOs which reside at the specified address or script pubkey (mempool-aware, paginated)'''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_utxos_for_address_mempool(address_id, cursor)

    return await paginate_api(fetch_page)

if __name__ == '__main__':
	# Init and run server
	mcp.run(transport='stdio')
