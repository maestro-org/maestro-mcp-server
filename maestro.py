#!/usr/bin/env python

import httpx
from mcp.server.fastmcp import FastMCP
from typing import Any, Awaitable, Callable, Dict, List, Optional
from config import API_KEY, MAESTRO_BASE_URL

# Init FastMCP server
mcp = FastMCP('maestro')

headers = {
    'User-Agent': 'maestro-mcp',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'api-key': API_KEY
}

# Fixed number of API results returned
# Temporary fix for returning too many results and breaking LLM client memory
MAX_COUNT = 5

# Helpers

async def fetch_api(endpoint: str, params: Optional[Dict] = None) -> Dict:
    '''Make a GET request to the Maestro RPC API with error handling'''
    url = f'{MAESTRO_BASE_URL}/{endpoint}'

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

async def post_api(endpoint: str, data: Dict) -> Dict:
    '''Make a POST request to the Maestro RPC API with error handling'''
    url = f'{MAESTRO_BASE_URL}/{endpoint}'

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
async def blockchain_info() -> Dict:
    '''
    Retrieve blockchain info

    Endpoint: /rpc/general/info
    '''
    return await fetch_api('rpc/general/info')

## Blocks
@mcp.tool()
async def latest_block() -> Dict:
    '''
    Retrieve latest block

    Endpoint: /rpc/block/latest
    '''
    params = {'page': 1, 'count': 100}
    return await fetch_api('rpc/block/latest', params=params)

## Transactions
@mcp.tool()
async def send_transaction(raw_tx: str) -> Dict:
    '''
    Submit a raw Bitcoin transaction

    Endpoint: /rpc/transaction/submit
    '''
    data = {'tx': raw_tx}
    return await post_api('rpc/transaction/submit', data)

@mcp.tool()
async def transaction_info_rpc(tx_id: str) -> Dict:
    '''
    Retrieve raw transaction details from RPC endpoint

    Endpoint: /rpc/transaction/:tx_id 
    '''
    return await fetch_api(f'rpc/transaction/{tx_id}')

### Indexer API
## Addresses

# internal
async def fetch_transactions_by_address(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''List of all transactions which consumed or produced a UTxO controlled by the specified address or script pubkey'''
    params = {
        'count': MAX_COUNT
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/txs', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def transactions_by_address(address_id: str) -> List[Dict]:
    '''
    Retrieve all transactions for a Bitcoin address (paginated)

    Endpoint: /addresses/:address_id/txs 
    '''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_transactions_by_address(address_id, cursor)

    return await paginate_api(fetch_page)

# internal
async def fetch_runes_by_address(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''Map of all Runes tokens and corresponding amounts in UTxOs controlled by the specified address or script pubkey'''
    params = {
        'count': MAX_COUNT
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/runes', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def runes_by_address(address_id: str) -> Dict:
    '''
    Map of all Runes tokens and corresponding amounts in UTxOs controlled by the specified address or script pubkey (paginated)

    Endpoint: /addresses/:address_id/runes 
    '''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_runes_by_address(address_id, cursor)

    return await paginate_api(fetch_page)

# internal
async def fetch_utxos_by_address(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''List of all UTxOs which reside at the specified address or script pubkey'''
    params = {
        'count': MAX_COUNT
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'addresses/{address_id}/txs', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def utxos_by_address(address_id: str) -> List[Dict]:
    '''
    List of all UTxOs which reside at the specified address or script pubkey (paginated)

    Endpoint: /addresses/:address_id/utxos 
    '''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_utxos_by_address(address_id, cursor)

    return await paginate_api(fetch_page)

## Assets
@mcp.tool()
async def runes_info(rune_id: str) -> Dict:
    '''
    Retrieve rune metadata by rune ID

    Endpoint: /assets/:rune_id
    '''
    return await fetch_api(f'assets/runes/{rune_id}')

@mcp.tool()
async def list_runes() -> Dict:
    '''
    List of ID and names of all deployed Rune assets

    Endpoint: /assets/runes 
    '''
    return await fetch_api('assets/runes')

## Transactions
@mcp.tool()
async def fetch_transaction_details(tx_id: str) -> Dict:
    '''
    Retrieve transaction metadata

    Endpoint: /transactions/:tx_id 
    '''
    return await fetch_api(f'transactions/{tx_id}')

### Mempool API
## Addresses

# internal
async def fetch_utxos_for_address_mempool(address_id: str, cursor: Optional[str] = None) -> Dict:
    '''List of all UTxOs which reside at the specified address or script pubkey (mempool-aware)'''
    params = {
        'count': MAX_COUNT
    }
    if cursor:
        params['cursor'] = cursor

    response = await fetch_api(f'mempool/addresses/{address_id}/utxos', params=params)
    return {
        'data': response.get('data', []),
        'next_cursor': response.get('next_cursor')
    }

@mcp.tool()
async def utxos_by_address_mempool_aware(address_id: str) -> List[Dict]:
    '''
    List of all UTxOs which reside at the specified address or script pubkey (mempool-aware, paginated)

    Endpoint: /mempool/addresses/:address_id/utxos 
    '''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_utxos_for_address_mempool(address_id, cursor)

    return await paginate_api(fetch_page)

if __name__ == '__main__':
	# Init and run server
	mcp.run(transport='stdio')
