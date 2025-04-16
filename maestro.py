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

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/rpc/general/info' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/t2mux52/bitcoin-node-rpc-api?entity=request-fe1a486d-53a3-44c0-b7a3-0bc233b00eab
    '''
    return await fetch_api('rpc/general/info')

## Blocks
@mcp.tool()
async def latest_block() -> Dict:
    '''
    Retrieve latest block

    Endpoint: /rpc/block/latest

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/rpc/block/latest?page=1&count=100&verbose=%3Cboolean%3E' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/t2mux52/bitcoin-node-rpc-api?entity=request-83060ed5-343c-45c2-b54e-197a037aab74
    '''
    params = {'page': 1, 'count': 100}
    return await fetch_api('rpc/block/latest', params=params)

## Transactions
@mcp.tool()
async def send_transaction(raw_tx: str) -> Dict:
    '''
    Submit a raw Bitcoin transaction

    Endpoint: /rpc/transaction/submit

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/rpc/transaction/submit' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}' \
--data '{{raw_tx}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/t2mux52/bitcoin-node-rpc-api?entity=request-e183fa71-d233-465d-8fb5-9dca19c6fa8f
    '''
    data = {'tx': raw_tx}
    return await post_api('rpc/transaction/submit', data)

@mcp.tool()
async def transaction_info_rpc(tx_id: str) -> Dict:
    '''
    Retrieve raw transaction details from RPC endpoint

    Endpoint: /rpc/transaction/:tx_id

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/rpc/transaction/{{tx_id}}?verbose=%3Cboolean%3E' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/t2mux52/bitcoin-node-rpc-api?entity=request-0c8f904a-5046-4306-894a-6718d435dea6
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

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/addresses/{{address_id}}/txs?count=100&confirmations=%3Clong%3E&order=asc&from=%3Clong%3E&to=%3Clong%3E&cursor=%3Cstring%3E' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/3lhc5bu/bitcoin-blockchain-indexer-api?entity=request-d3a65d0d-d000-42fa-a4d3-da33c87fdb4b
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

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/addresses/{{address_id}}/runes' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/3lhc5bu/bitcoin-blockchain-indexer-api?entity=request-9e576b6f-1ad1-4d96-b735-b4c5db199ffc
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

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/addresses/{{address_id}}/utxos?filter_dust=%3Cboolean%3E&filter_dust_threshold=%3Clong%3E&exclude_metaprotocols=%3Cboolean%3E&count=100&order=asc&from=%3Clong%3E&to=%3Clong%3E&cursor=%3Cstring%3E' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/3lhc5bu/bitcoin-blockchain-indexer-api?entity=request-2e419a52-351c-4900-8899-6076b9fddcb7
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

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/assets/runes/{{rune_id}}' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/3lhc5bu/bitcoin-blockchain-indexer-api?entity=request-f88bd246-c75f-4b64-87f2-7b92c4890c48
    '''
    return await fetch_api(f'assets/runes/{rune_id}')

@mcp.tool()
async def list_runes() -> Dict:
    '''
    List of ID and names of all deployed Rune assets

    Endpoint: /assets/runes

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/assets/runes?count=100&cursor=%3Cstring%3E' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/3lhc5bu/bitcoin-blockchain-indexer-api?entity=request-f868e716-6b9f-4774-9d53-40c01e159851
    '''
    return await fetch_api('assets/runes')

## Transactions
@mcp.tool()
async def transaction_info_indexer(tx_id: str) -> Dict:
    '''
    Retrieve transaction metadata

    Endpoint: /transactions/:tx_id

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/transactions/{{tx_id}}' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/3lhc5bu/bitcoin-blockchain-indexer-api?entity=request-30817523-22bd-4c1d-baf7-3e6963936a42
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

    CURL: curl --location 'https://xbt-mainnet.gomaestro-api.org/v0/mempool/addresses/{{address_id}}/utxos?filter_dust=%3Cboolean%3E&filter_dust_threshold=%3Clong%3E&exclude_metaprotocols=%3Cboolean%3E&count=100&order=asc&from=%3Clong%3E&to=%3Clong%3E&mempool_blocks_limit=%3Cinteger%3E&cursor=%3Cstring%3E' \
--header 'Accept: application/json' \
--header 'api-key: {{apiKey}}'

    Docs URL: https://www.postman.com/go-maestro/maestro-api/documentation/p2pmda6/bitcoin-mempool-monitoring-api?entity=request-f0188244-aed4-497c-b845-2fbda382adac
    '''

    async def fetch_page(cursor: Optional[str]) -> Dict:
        return await fetch_utxos_for_address_mempool(address_id, cursor)

    return await paginate_api(fetch_page)

if __name__ == '__main__':
	# Init and run server
	mcp.run(transport='stdio')
