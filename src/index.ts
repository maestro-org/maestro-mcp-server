#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for bitcoin---merged-services-api v1.0.0
 * Generated on: 2025-06-22T15:25:43.624Z
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { setupStreamableHttpServer } from './streamable-http.js';

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';

/* MAESTRO OVERRIDE */
import { mcpHandler } from './streamable-http.js';
/* MAESTRO OVERRIDE */

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  method: string;
  pathTemplate: string;
  executionParameters: { name: string; in: string }[];
  requestBodyContentType?: string;
  securityRequirements: any[];
}

/**
 * Server configuration
 */
export const SERVER_NAME = 'Maestro Bitcoin API';
export const SERVER_VERSION = 'v0.2.0';
export const API_BASE_URL = process.env.API_BASE_URL || 'https://xbt-mainnet.gomaestro-api.org/v0';

/**
 * MCP Server instance
 */
const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } }
);

/**
 * Map of tool definitions by name
 */
const toolDefinitionMap: Map<string, McpToolDefinition> = new Map([
  [
    'satoshi_activity_by_address',
    {
      name: 'satoshi_activity_by_address',
      description: `Returns all transactions for a given address or script pubkey, allowing insight into when the balance increased, decreased, or remained the same. This endpoint supports customization to narrow results by time, transaction type, or ordering, enabling tailored historical views.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions included on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions included on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          activity_kind: {
            allOf: [{ type: 'string', enum: ['self_transfer', 'increase', 'decrease'] }],
            type: 'null',
            description:
              'Only return transactions of a specific activity kind. Supported values: "increase" for transactions where satoshi balance increases, "decrease" for decrease, and "self_transfer" for transactions where satoshi balance remained the same.',
          },
          exclude_self_transfers: {
            type: ['boolean', 'null'],
            description:
              'Do not return self-transfer transactions - transactions in which satoshi balance did not increase or decrease.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/activity',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'activity_kind', in: 'query' },
        { name: 'exclude_self_transfers', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'satoshi_balance_by_address',
    {
      name: 'satoshi_balance_by_address',
      description: `Returns the total balance in satoshis held at the specified address or script pubkey by summing all unspent outputs (UTXOs). This is a direct snapshot of the address's spendable funds and does not include mempool transactions.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/balance',
      executionParameters: [{ name: 'address', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'historical_satoshi_balance_by_address',
    {
      name: 'historical_satoshi_balance_by_address',
      description: `Returns the historical satoshi balances, itemized by block and including USD price.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description:
              'Return only blocks included on or after a specific height or timestamps. If this parameter is not provided, the starting point will be the first block where the address has seen its balance increase or decrease.',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only blocks included on or before a specific height or timestamp',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          height_params: {
            type: ['boolean', 'null'],
            description:
              'Whether the from and to integer query params should be read as timestamps or as block heights. True (the default) means from and to params should be read as block heights.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/balance/historical',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'height_params', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'brc20_by_address',
    {
      name: 'brc20_by_address',
      description: `Returns a collection of BRC20 tokens associated with the address, showing both the total and available (transferable) balances. This is essential for building BRC20 token wallets and dashboards.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/brc20',
      executionParameters: [{ name: 'address', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'brc20_transfer_inscriptions_by_address',
    {
      name: 'brc20_transfer_inscriptions_by_address',
      description: `Returns all unspent BRC20 transfer inscriptions residing at the address. This endpoint is critical for applications facilitating token transfers, as it identifies transfer-eligible inscriptions.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          ticker: { type: ['string', 'null'], description: 'BRC20 ticker string' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/brc20/transfer_inscriptions',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'ticker', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'inscriptions_by_address',
    {
      name: 'inscriptions_by_address',
      description: `Retrieves all inscriptions currently controlled by a specific address. Useful for wallet UIs and inscription portfolio views.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/inscriptions',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'inscription_activity_by_address',
    {
      name: 'inscription_activity_by_address',
      description: `Returns all inscription-related transactions involving a specific address. Can be filtered by activity type (send, receive, self-transfer), narrowed to a specific inscription, and sorted chronologically. Useful for building dashboards, tracking user behavior, or filtering unwanted spam activity.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          inscription_id: {
            type: ['string', 'null'],
            description:
              'Return only transactions containing a specific inscription, specified by an inscription ID. In presence of activity_kind, it relates to this specific inscription. In presence of exclude_self_transfers, it is this specific inscription that should be sent or received but not self-transferred.',
          },
          activity_kind: {
            allOf: [{ type: 'string', enum: ['self_transfer', 'send', 'receive'] }],
            type: 'null',
            description:
              'Filter txs by presence of specific activity kind. Supported values: send, receive, self_transfer. In presence of inscription filter, the activity kind relates to that specific inscription. In presence of exclude_self_transfers, this activity kind cannot be self_transfer.',
          },
          exclude_self_transfers: {
            type: ['boolean', 'null'],
            description:
              'Exclude txs only containing inscriptions self-transfers. In presence of activity_kind, it cannot be self_transfer. In presence of inscription filter, that specific inscription should be sent or received, not self-transferred.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/inscriptions/activity',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'inscription_id', in: 'query' },
        { name: 'activity_kind', in: 'query' },
        { name: 'exclude_self_transfers', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'runes_by_address',
    {
      name: 'runes_by_address',
      description: `Provides a list of all Rune assets held by the specified address. It returns both total and available balances, allowing for token inventory management and portfolio tracking.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/runes',
      executionParameters: [{ name: 'address', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rune_activity_by_address',
    {
      name: 'rune_activity_by_address',
      description: `Return all transactions where the specified address has rune activity, with the option to filter by a specific rune kind.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          rune: {
            type: ['string', 'null'],
            description:
              'Return only transactions containing a specific rune, specified either by the rune ID (etching block number and transaction index) or name (spaced or un-spaced). In presence of activity_kind, it relates to this specific rune. In presence of exclude_self_transfers, it is this specific rune that the queried address should see increase or decrease in balance in the tx, not just being self-transferred.',
          },
          activity_kind: {
            allOf: [{ type: 'string', enum: ['self_transfer', 'increase', 'decrease'] }],
            type: 'null',
            description:
              'Filter txs by presence specific activity kind. Supported values: increased, decreased, self_transfer. In presence of rune filter, the activity kind relates to that specific rune. In presence of exclude_self_transfers, this activity kind cannot be self_transfer.',
          },
          exclude_self_transfers: {
            type: ['boolean', 'null'],
            description:
              'Exclude txs only containing runes self-transfers. In presence of activity_kind, it cannot be self_transfer. In presence of rune filter, that specific rune should be sent or received, not self-transferred.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/runes/activity',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'rune', in: 'query' },
        { name: 'activity_kind', in: 'query' },
        { name: 'exclude_self_transfers', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rune_utxos_by_address_v2',
    {
      name: 'rune_utxos_by_address_v2',
      description: `Lists all UTXOs at the address or script pubkey that contains Rune tokens, with optional refinement based on Rune type or metadata. Helpful for spend analysis or wallet state audits.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          rune: {
            type: ['string', 'null'],
            description:
              'Return only UTxOs containing a specific Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          order_by: {
            allOf: [{ type: 'string', default: 'height', enum: ['height', 'amount'] }],
            type: 'null',
            description:
              'The property by which response items should be sorted. Supported values: height (height of block which produced the UTxO - default), amount (amount of runes in UTxO)',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page.',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/runes/utxos',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'rune', in: 'query' },
        { name: 'order_by', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rune_utxos_by_address',
    {
      name: 'rune_utxos_by_address',
      description: `Return all UTxOs controlled by the specified address or script pubkey which contain runes, with the option to filter by a specific rune kind.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          rune: {
            type: 'string',
            description:
              'Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by height at which UTxO was produced)',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address', 'rune'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/runes/{rune}',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'rune', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'address_statistics',
    {
      name: 'address_statistics',
      description: `Returns all current statistics of the address: total txs the address was involved in, total unspent outputs controlled by the address, current satoshi, control of any runes and inscription balance.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/statistics',
      executionParameters: [{ name: 'address', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'txs_by_address',
    {
      name: 'txs_by_address',
      description: `List of all transactions which consumed or produced a UTxO controlled by the specified address or script pubkey.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          confirmations: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Only return transactions with at least a certain amount of confirmations',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by height at which transaction was included in a block)',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions included on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions included on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/txs',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'confirmations', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'utxos_by_address',
    {
      name: 'utxos_by_address',
      description: `Retrieves all UTXOs associated with a Bitcoin address or script pubkey. Ideal for wallet views, dust filtering, or balance calculations. Can be tailored to exclude certain categories of UTXOs such as those used in metaprotocols.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          filter_dust: {
            type: ['boolean', 'null'],
            description: 'Ignore UTxOs containing less than 100000 sats',
          },
          filter_dust_threshold: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Ignore UTxOs containing less than specified satoshis',
          },
          exclude_metaprotocols: {
            type: ['boolean', 'null'],
            description:
              'Exclude UTxOs involved in metaprotocols (currently only runes and inscriptions will be discovered, more metaprotocols may be supported in future)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by height at which UTxO was produced)',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/addresses/{address}/utxos',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'filter_dust', in: 'query' },
        { name: 'filter_dust_threshold', in: 'query' },
        { name: 'exclude_metaprotocols', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'list_brc20s',
    {
      name: 'list_brc20s',
      description: `Retrieves a list of tickers of all deployed BRC20 assets.`,
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
      },
      method: 'get',
      pathTemplate: '/assets/brc20',
      executionParameters: [
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'brc20_info',
    {
      name: 'brc20_info',
      description: `Information about a BRC20 token’s metadata and current state, including its symbol, deployment details, minting rules, total holders, and minted supply.`,
      inputSchema: {
        type: 'object',
        properties: { ticker: { type: 'string', description: 'BRC20 ticker string' } },
        required: ['ticker'],
      },
      method: 'get',
      pathTemplate: '/assets/brc20/{ticker}',
      executionParameters: [{ name: 'ticker', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'brc20_holders_by_ticker',
    {
      name: 'brc20_holders_by_ticker',
      description: `Retrieves a list of script pubkeys or addresses that hold the specified BRC20 asset and corresponding total balances.`,
      inputSchema: {
        type: 'object',
        properties: {
          ticker: { type: 'string', description: 'BRC20 ticker string' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['ticker'],
      },
      method: 'get',
      pathTemplate: '/assets/brc20/{ticker}/holders',
      executionParameters: [
        { name: 'ticker', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'inscriptions_by_collection_symbol',
    {
      name: 'inscriptions_by_collection_symbol',
      description: `List of all inscriptions in the collection represented by the queried symbol.`,
      inputSchema: {
        type: 'object',
        properties: {
          collection_symbol: { type: 'string', description: 'Collection symbol (UTF-8)' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['collection_symbol'],
      },
      method: 'get',
      pathTemplate: '/assets/collections/{collection_symbol}/inscriptions',
      executionParameters: [
        { name: 'collection_symbol', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'collection_metadata_by_collection_symbol',
    {
      name: 'collection_metadata_by_collection_symbol',
      description: `Provides metadata for a given inscription collection symbol, including its name, image, supply, and external links. This is useful for rendering collection summaries or for display in marketplaces and aggregators.`,
      inputSchema: {
        type: 'object',
        properties: {
          collection_symbol: { type: 'string', description: 'Collection symbol (UTF-8)' },
        },
        required: ['collection_symbol'],
      },
      method: 'get',
      pathTemplate: '/assets/collections/{collection_symbol}/metadata',
      executionParameters: [{ name: 'collection_symbol', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'collection_stats_by_collection_symbol',
    {
      name: 'collection_stats_by_collection_symbol',
      description: `Provides stats for a given inscription: total volume (in sats), floor price (in sats), and total listed. This is useful for rendering collection summaries or for display in marketplaces and aggregators.`,
      inputSchema: {
        type: 'object',
        properties: {
          collection_symbol: { type: 'string', description: 'Collection symbol (UTF-8)' },
        },
        required: ['collection_symbol'],
      },
      method: 'get',
      pathTemplate: '/assets/collections/{collection_symbol}/stats',
      executionParameters: [{ name: 'collection_symbol', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'inscription_info',
    {
      name: 'inscription_info',
      description: `Delivers information about a specific inscription, including its type, current location (UTXO and address), associated collection, and metadata like size and content preview (if text-based). Supports resolution of any inscription for wallet or explorer views.
A preview of the content body is given only if its type is \`"text/plain"\`. For the whole content, use the complementary endpoint, namely \`/assets/inscriptions/{inscription_id}/content_body\`.`,
      inputSchema: {
        type: 'object',
        properties: { inscription_id: { type: 'string', description: 'Inscription ID' } },
        required: ['inscription_id'],
      },
      method: 'get',
      pathTemplate: '/assets/inscriptions/{inscription_id}',
      executionParameters: [{ name: 'inscription_id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'activity_by_inscription',
    {
      name: 'activity_by_inscription',
      description: `Lists all transactions that have involved the given inscription, starting from its origin (reveal transaction) and including all transfers.`,
      inputSchema: {
        type: 'object',
        properties: {
          inscription_id: { type: 'string', description: 'Inscription ID' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of transactions per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by block height and tx index in the block)',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['inscription_id'],
      },
      method: 'get',
      pathTemplate: '/assets/inscriptions/{inscription_id}/activity',
      executionParameters: [
        { name: 'inscription_id', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'collection_metadata_by_inscription',
    {
      name: 'collection_metadata_by_inscription',
      description: `Returns metadata of a collection for a given inscription ID, including its name, image, supply and external links.`,
      inputSchema: {
        type: 'object',
        properties: { inscription_id: { type: 'string', description: 'Inscription ID' } },
        required: ['inscription_id'],
      },
      method: 'get',
      pathTemplate: '/assets/inscriptions/{inscription_id}/collection',
      executionParameters: [{ name: 'inscription_id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'content_by_inscription_id',
    {
      name: 'content_by_inscription_id',
      description: `Retrieves the content body byte array of an inscription. This endpoint is complementary to the \`/assets/inscriptions/{inscription_id}\` (Inscription Information) endpoint.`,
      inputSchema: {
        type: 'object',
        properties: {
          inscription_id: { type: 'string', description: 'Inscription ID' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of bytes per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string: the offset in the content body, in the form of an integer. Use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['inscription_id'],
      },
      method: 'get',
      pathTemplate: '/assets/inscriptions/{inscription_id}/content_body',
      executionParameters: [
        { name: 'inscription_id', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'token_metadata_by_inscription',
    {
      name: 'token_metadata_by_inscription',
      description: `Metadata specific to inscription.`,
      inputSchema: {
        type: 'object',
        properties: { inscription_id: { type: 'string', description: 'Inscription ID' } },
        required: ['inscription_id'],
      },
      method: 'get',
      pathTemplate: '/assets/inscriptions/{inscription_id}/metadata',
      executionParameters: [{ name: 'inscription_id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'list_runes',
    {
      name: 'list_runes',
      description: `Lists all Rune tokens deployed, including names and IDs.`,
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
      },
      method: 'get',
      pathTemplate: '/assets/runes',
      executionParameters: [
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'info_by_rune',
    {
      name: 'info_by_rune',
      description: `Returns full details for a specific Rune token, such as its etching (origin) transaction, supply, number of holders.`,
      inputSchema: {
        type: 'object',
        properties: {
          rune: {
            type: 'string',
            description:
              'Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
        },
        required: ['rune'],
      },
      method: 'get',
      pathTemplate: '/assets/runes/{rune}',
      executionParameters: [{ name: 'rune', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'activity_by_rune',
    {
      name: 'activity_by_rune',
      description: `Returns all transactions where the Rune was used or transferred, beginning with the etching (origin) transaction. Useful for auditing or building live token feeds.`,
      inputSchema: {
        type: 'object',
        properties: {
          rune: {
            type: 'string',
            description:
              'Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of transactions per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by block height and tx index in the block)',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or before a specific height',
          },
        },
        required: ['rune'],
      },
      method: 'get',
      pathTemplate: '/assets/runes/{rune}/activity',
      executionParameters: [
        { name: 'rune', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'holders_by_rune',
    {
      name: 'holders_by_rune',
      description: `Lists all addresses currently holding a given Rune, with corresponding balances. Helps visualize token distribution and adoption.`,
      inputSchema: {
        type: 'object',
        properties: {
          rune: {
            type: 'string',
            description:
              'Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['rune'],
      },
      method: 'get',
      pathTemplate: '/assets/runes/{rune}/holders',
      executionParameters: [
        { name: 'rune', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'utxos_by_rune',
    {
      name: 'utxos_by_rune',
      description: `Returns all UTXOs containing the specified Rune. Useful for raw state tracking and detailed token flow visualization.`,
      inputSchema: {
        type: 'object',
        properties: {
          rune: {
            type: 'string',
            description:
              'Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by height at which UTxO was produced)',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['rune'],
      },
      method: 'get',
      pathTemplate: '/assets/runes/{rune}/utxos',
      executionParameters: [
        { name: 'rune', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'block_info',
    {
      name: 'block_info',
      description: `Fetches full details of a block using its hash. Returns information such as height, timestamp, transaction count, miner, and size. Can be used to explore block metadata or confirm inclusion of transactions.`,
      inputSchema: {
        type: 'object',
        properties: {
          height_or_hash: { type: 'string', description: 'Block height or block hash' },
        },
        required: ['height_or_hash'],
      },
      method: 'get',
      pathTemplate: '/blocks/{height_or_hash}',
      executionParameters: [{ name: 'height_or_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'inscription_activity_by_block',
    {
      name: 'inscription_activity_by_block',
      description: `List of all inscription activity in the block, ordered by transaction index in the block and by output index in the transaction.`,
      inputSchema: {
        type: 'object',
        properties: {
          height_or_hash: { type: 'string', description: 'Block height or block hash' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of transactions (with inscription activity) per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['height_or_hash'],
      },
      method: 'get',
      pathTemplate: '/blocks/{height_or_hash}/inscriptions/activity',
      executionParameters: [
        { name: 'height_or_hash', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'txs_by_block',
    {
      name: 'txs_by_block',
      description: `Returns a list of all transaction hashes included in the specified block. Supports pagination for blocks with a large number of transactions.`,
      inputSchema: {
        type: 'object',
        properties: {
          height_or_hash: { type: 'string', description: 'Block height or block hash' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of transactions per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['height_or_hash'],
      },
      method: 'get',
      pathTemplate: '/blocks/{height_or_hash}/transactions',
      executionParameters: [
        { name: 'height_or_hash', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'tx_info',
    {
      name: 'tx_info',
      description: `Returns a full breakdown of a Bitcoin transaction by its hash. Includes inputs, outputs, fees, block confirmation details, and protocol-specific data (e.g., Ordinals, Runes, BRC20). This is useful for explorers, audit tools, or any application requiring full visibility into how funds and inscriptions are moved.`,
      inputSchema: {
        type: 'object',
        properties: { tx_hash: { type: 'string', description: 'Transaction hash' } },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/transactions/{tx_hash}',
      executionParameters: [{ name: 'tx_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'inscription_activity_by_tx',
    {
      name: 'inscription_activity_by_tx',
      description: `List of all inscription activity in the transaction, including their satoshi-level positioning within transactions, ordered by transaction output index.`,
      inputSchema: {
        type: 'object',
        properties: {
          tx_hash: { type: 'string', description: 'Transaction hash' },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of inscriptions per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/transactions/{tx_hash}/inscriptions/activity',
      executionParameters: [
        { name: 'tx_hash', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'tx_info_with_metaprotocols',
    {
      name: 'tx_info_with_metaprotocols',
      description: `Returns an enhanced view of the transaction, including info about metaprotocols in both inputs and outputs. Useful for deep inspection tools.`,
      inputSchema: {
        type: 'object',
        properties: { tx_hash: { type: 'string', description: 'Transaction hash' } },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/transactions/{tx_hash}/metaprotocols',
      executionParameters: [{ name: 'tx_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'tx_output_info',
    {
      name: 'tx_output_info',
      description: `Provides detailed information for a single transaction output, including its value, spend status, and any attached metadata such as Ordinal inscriptions, Runes, or BRC20 data.`,
      inputSchema: {
        type: 'object',
        properties: {
          tx_hash: { type: 'string', description: 'Transaction hash' },
          output_index: { type: 'string', description: 'Transaction output index' },
        },
        required: ['tx_hash', 'output_index'],
      },
      method: 'get',
      pathTemplate: '/transactions/{tx_hash}/outputs/{output_index}',
      executionParameters: [
        { name: 'tx_hash', in: 'path' },
        { name: 'output_index', in: 'path' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mempool_satoshi_balance_by_address',
    {
      name: 'mempool_satoshi_balance_by_address',
      description: `Returns the total balance in satoshis held at the specified address or script pubkey by summing all unspent outputs (UTXOs).

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/mempool/addresses/{address}/balance',
      executionParameters: [{ name: 'address', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mempool_runes_by_address',
    {
      name: 'mempool_runes_by_address',
      description: `Provides a list of all Rune assets held by the specified address. It returns both total and available balances, allowing for token inventory management and portfolio tracking.

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          mempool_blocks_limit: {
            type: ['number', 'null'],
            format: 'int32',
            minimum: 0,
            description:
              'Limit the number of estimated mempool blocks to be reflected in the data (default: as many as available)',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/mempool/addresses/{address}/runes',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'mempool_blocks_limit', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mempool_rune_utxos_by_address',
    {
      name: 'mempool_rune_utxos_by_address',
      description: `Lists all UTXOs at the address or script pubkey that contains Rune tokens, with optional refinement based on Rune type or metadata. Helpful for spend analysis or wallet state audits.

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          rune: {
            type: ['string', 'null'],
            description:
              'Return only UTxOs containing a specific Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          order_by: {
            allOf: [{ type: 'string', default: 'height', enum: ['height', 'amount'] }],
            type: 'null',
            description:
              'The property by which response items should be sorted. Supported values: height (height of block which produced the UTxO - default), amount (amount of runes in UTxO)',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page.',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/mempool/addresses/{address}/runes/utxos',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'rune', in: 'query' },
        { name: 'order_by', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mempool_utxos_by_address',
    {
      name: 'mempool_utxos_by_address',
      description: `Retrieves all UTXOs associated with a Bitcoin address or script pubkey. Ideal for wallet views, dust filtering, or balance calculations. Can be tailored to exclude certain categories of UTXOs such as those used in metaprotocols.

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          filter_dust: {
            type: ['boolean', 'null'],
            description: 'Ignore UTxOs containing less than 100000 sats',
          },
          filter_dust_threshold: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Ignore UTxOs containing less than specified satoshis',
          },
          exclude_metaprotocols: {
            type: ['boolean', 'null'],
            description:
              'Exclude UTxOs involved in metaprotocols (currently only runes and inscriptions will be discovered, more metaprotocols may be supported in future)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description:
              'The order in which the results are sorted (by height at which UTxO was produced)',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
          mempool_blocks_limit: {
            type: ['number', 'null'],
            format: 'int32',
            minimum: 0,
            description:
              'Limit the number of estimated mempool blocks to be reflected in the data (default: as many as available)',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/mempool/addresses/{address}/utxos',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'filter_dust', in: 'query' },
        { name: 'filter_dust_threshold', in: 'query' },
        { name: 'exclude_metaprotocols', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'mempool_blocks_limit', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mempool_holders_by_rune',
    {
      name: 'mempool_holders_by_rune',
      description: `Lists all addresses currently holding a given Rune, with corresponding balances. Helps visualize token distribution and adoption.

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: {
          rune: {
            type: 'string',
            description:
              'Rune, specified either by the Rune ID (etching block number and transaction index) or name (spaced or un-spaced)',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['rune'],
      },
      method: 'get',
      pathTemplate: '/mempool/assets/runes/{rune}/holders',
      executionParameters: [
        { name: 'rune', in: 'path' },
        { name: 'count', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'fee_rates',
    {
      name: 'fee_rates',
      description: `Statistics regarding fee rates of transactions within estimated mempool blocks.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/mempool/fee_rates',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'tx_info_with_metaprotocols1',
    {
      name: 'tx_info_with_metaprotocols1',
      description: `Returns an enhanced view of the transaction, including info about metaprotocols in both inputs and outputs. Useful for deep inspection tools.

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: { tx_hash: { type: 'string', description: 'Transaction hash' } },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/mempool/transactions/{tx_hash}/metaprotocols',
      executionParameters: [{ name: 'tx_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mempool_tx_output_info',
    {
      name: 'mempool_tx_output_info',
      description: `Provides detailed information for a single transaction output, including its value, spend status, and any attached metadata such as Ordinal inscriptions, Runes, or BRC20 data.

In addition to confirmed transactions, mempool endpoints return data which reflects pending transactions in some number of "estimated" blocks - predicted blocks containing transactions which have been propagated around the network but not yet included in a mined block, with transactions with a higher sat/vB value being prioritised. The response details how many of these estimated blocks were considered when fetching the data.`,
      inputSchema: {
        type: 'object',
        properties: {
          tx_hash: { type: 'string', description: 'Transaction hash' },
          output_index: { type: 'string', description: 'Transaction output index' },
        },
        required: ['tx_hash', 'output_index'],
      },
      method: 'get',
      pathTemplate: '/mempool/transactions/{tx_hash}/outputs/{output_index}',
      executionParameters: [
        { name: 'tx_hash', in: 'path' },
        { name: 'output_index', in: 'path' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'wallet_satoshi_activity_by_address',
    {
      name: 'wallet_satoshi_activity_by_address',
      description: `Returns all transactions for a given address or script pubkey, allowing insight into when the balance increased, decreased, or remained the same. This endpoint supports customization to narrow results by time, transaction type, or ordering, enabling tailored historical views.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions included on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions included on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          activity_kind: {
            allOf: [{ type: 'string', enum: ['self_transfer', 'increase', 'decrease'] }],
            type: 'null',
            description:
              'Only return transactions of a specific activity kind. Supported values: "increase" for transactions where satoshi balance increases, "decrease" for decrease, and "self_transfer" for transactions where satoshi balance remained the same.',
          },
          exclude_self_transfers: {
            type: ['boolean', 'null'],
            description:
              'Do not return self-transfer transactions - transactions in which satoshi balance did not increase or decrease.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/wallet/addresses/{address}/activity',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'activity_kind', in: 'query' },
        { name: 'exclude_self_transfers', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'wallet_metaprotocol_activity_by_address',
    {
      name: 'wallet_metaprotocol_activity_by_address',
      description: `Return all transactions where the specified address has satoshi and/or metaprotocols activity. Supported metaprotocols: runes, inscriptions.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only UTxOs created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/wallet/addresses/{address}/activity/metaprotocols',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'wallet_historical_satoshi_balance_by_address',
    {
      name: 'wallet_historical_satoshi_balance_by_address',
      description: `Returns the historical satoshi balances, itemized by block and including USD price.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description:
              'Return only blocks included on or after a specific height or timestamps. If this parameter is not provided, the starting point will be the first block where the address has seen its balance increase or decrease.',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only blocks included on or before a specific height or timestamp',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          height_params: {
            type: ['boolean', 'null'],
            description:
              'Whether the from and to integer query params should be read as timestamps or as block heights. True (the default) means from and to params should be read as block heights.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/wallet/addresses/{address}/balance/historical',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'height_params', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'wallet_inscription_activity_by_address',
    {
      name: 'wallet_inscription_activity_by_address',
      description: `Returns all inscription-related transactions involving a specific address. Can be filtered by activity type (send, receive, self-transfer), narrowed to a specific inscription, and sorted chronologically. Useful for building dashboards, tracking user behavior, or filtering unwanted spam activity.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          inscription_id: {
            type: ['string', 'null'],
            description:
              'Return only transactions containing a specific inscription, specified by an inscription ID. In presence of activity_kind, it relates to this specific inscription. In presence of exclude_self_transfers, it is this specific inscription that should be sent or received but not self-transferred.',
          },
          activity_kind: {
            allOf: [{ type: 'string', enum: ['self_transfer', 'send', 'receive'] }],
            type: 'null',
            description:
              'Filter txs by presence of specific activity kind. Supported values: send, receive, self_transfer. In presence of inscription filter, the activity kind relates to that specific inscription. In presence of exclude_self_transfers, this activity kind cannot be self_transfer.',
          },
          exclude_self_transfers: {
            type: ['boolean', 'null'],
            description:
              'Exclude txs only containing inscriptions self-transfers. In presence of activity_kind, it cannot be self_transfer. In presence of inscription filter, that specific inscription should be sent or received, not self-transferred.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/wallet/addresses/{address}/inscriptions/activity',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'inscription_id', in: 'query' },
        { name: 'activity_kind', in: 'query' },
        { name: 'exclude_self_transfers', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'wallet_rune_activity_by_address',
    {
      name: 'wallet_rune_activity_by_address',
      description: `Return all transactions where the specified address has rune activity, with the option to filter by a specific rune kind.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
          order: {
            allOf: [{ type: 'string', default: 'asc', enum: ['asc', 'desc'] }],
            type: 'null',
            description: 'The order in which the results are sorted. Supported values: asc, desc',
          },
          count: {
            allOf: [{ type: 'integer', default: 100, minimum: 0 }],
            type: 'null',
            description: 'The max number of results per page',
          },
          from: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or after a specific height',
          },
          to: {
            type: ['number', 'null'],
            format: 'int64',
            minimum: 0,
            description: 'Return only transactions created on or before a specific height',
          },
          cursor: {
            type: ['string', 'null'],
            description:
              'Pagination cursor string, use the cursor included in a page of results to fetch the next page',
          },
          rune: {
            type: ['string', 'null'],
            description:
              'Return only transactions containing a specific rune, specified either by the rune ID (etching block number and transaction index) or name (spaced or un-spaced). In presence of activity_kind, it relates to this specific rune. In presence of exclude_self_transfers, it is this specific rune that the queried address should see increase or decrease in balance in the tx, not just being self-transferred.',
          },
          activity_kind: {
            allOf: [{ type: 'string', enum: ['self_transfer', 'increase', 'decrease'] }],
            type: 'null',
            description:
              'Filter txs by presence specific activity kind. Supported values: increased, decreased, self_transfer. In presence of rune filter, the activity kind relates to that specific rune. In presence of exclude_self_transfers, this activity kind cannot be self_transfer.',
          },
          exclude_self_transfers: {
            type: ['boolean', 'null'],
            description:
              'Exclude txs only containing runes self-transfers. In presence of activity_kind, it cannot be self_transfer. In presence of rune filter, that specific rune should be sent or received, not self-transferred.',
          },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/wallet/addresses/{address}/runes/activity',
      executionParameters: [
        { name: 'address', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'cursor', in: 'query' },
        { name: 'rune', in: 'query' },
        { name: 'activity_kind', in: 'query' },
        { name: 'exclude_self_transfers', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'wallet_address_statistics',
    {
      name: 'wallet_address_statistics',
      description: `Returns all current statistics of the address: total txs the address was involved in, total unspent outputs controlled by the address, and current satoshi, rune and inscription balance.`,
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Bitcoin address or hex encoded script pubkey' },
        },
        required: ['address'],
      },
      method: 'get',
      pathTemplate: '/wallet/addresses/{address}/statistics',
      executionParameters: [{ name: 'address', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_latest_block',
    {
      name: 'rpc_latest_block',
      description: `Returns the most recent block on the Bitcoin blockchain.
Useful for syncing frontends, indexing latest chain state, or watching for new block activity. Set \`verbose=true\` for full TX data without need for separate calls.`,
      inputSchema: {
        type: 'object',
        properties: {
          page: { default: 1, type: 'number', description: 'Page number for block transactions.' },
          count: {
            default: 100,
            type: 'number',
            description: 'Max number of block transactions per page.',
          },
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
        },
      },
      method: 'get',
      pathTemplate: '/rpc/block/latest',
      executionParameters: [
        { name: 'page', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'verbose', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_block_range_info',
    {
      name: 'rpc_block_range_info',
      description: `Fetches basic info for a contiguous block range (start and end height).`,
      inputSchema: {
        type: 'object',
        properties: {
          start_height: { type: 'string', description: 'Start height.' },
          end_height: { type: 'string', description: 'End height.' },
          page: { default: 1, type: 'number', description: 'Page number.' },
          count: { default: 10, type: 'number', description: 'Number of blocks.' },
          order: {
            default: 'asc',
            type: 'string',
            description: 'Order blocks by descending (desc) or ascending (asc).',
          },
        },
        required: ['start_height', 'end_height'],
      },
      method: 'get',
      pathTemplate: '/rpc/block/range/{start_height}/{end_height}',
      executionParameters: [
        { name: 'start_height', in: 'path' },
        { name: 'end_height', in: 'path' },
        { name: 'page', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_recent_blocks_info',
    {
      name: 'rpc_recent_blocks_info',
      description: `Returns the most recent blocks from the tip going backward. Useful to view or stream recent blockchain activity.`,
      inputSchema: {
        type: 'object',
        properties: {
          page: { default: 1, type: 'number', description: 'Page number.' },
          count: { default: 10, type: 'number', description: 'Number of blocks.' },
          order: {
            default: 'asc',
            type: 'string',
            description: 'Order blocks by descending (desc) or ascending (asc).',
          },
        },
      },
      method: 'get',
      pathTemplate: '/rpc/block/recent',
      executionParameters: [
        { name: 'page', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_recent_blocks_info_count',
    {
      name: 'rpc_recent_blocks_info_count',
      description: `Returns a list of the most recently mined blocks, limited by count. It provides a snapshot of the latest blockchain activity, starting from the current chain tip and going backward.`,
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            default: 1,
            maximum: 10,
            minimum: 1,
            type: 'number',
            description: 'Number of blocks.',
          },
          order: {
            default: 'asc',
            type: 'string',
            description: 'Order blocks by descending (desc) or ascending (asc).',
          },
        },
        required: ['count'],
      },
      method: 'get',
      pathTemplate: '/rpc/block/recent/{count}',
      executionParameters: [
        { name: 'count', in: 'path' },
        { name: 'order', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_block_info',
    {
      name: 'rpc_block_info',
      description: `Retrieve full or summary information for a specific block.
Useful for analyzing individual blocks or resolving TX data inline.`,
      inputSchema: {
        type: 'object',
        properties: {
          height_or_hash: { type: 'string', description: 'Block height or hash.' },
          page: { default: 1, type: 'number', description: 'Page number for block transactions.' },
          count: {
            default: 100,
            type: 'number',
            description: 'Max number of block transactions per page.',
          },
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
        },
        required: ['height_or_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/block/{height_or_hash}',
      executionParameters: [
        { name: 'height_or_hash', in: 'path' },
        { name: 'page', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'verbose', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_block_miner_info',
    {
      name: 'rpc_block_miner_info',
      description: `Returns metadata about the miner for a specific block.
Includes name, known addresses, icon, and associated tags.
Useful for research or visual analytics on pool distribution.`,
      inputSchema: {
        type: 'object',
        properties: { height_or_hash: { type: 'string', description: 'Block height or hash.' } },
        required: ['height_or_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/block/{height_or_hash}/miner',
      executionParameters: [{ name: 'height_or_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_block_volume',
    {
      name: 'rpc_block_volume',
      description: `Returns total transaction output volume (in satoshis) for a block.
This provides insight into economic activity, not just block size.`,
      inputSchema: {
        type: 'object',
        properties: { height_or_hash: { type: 'string', description: 'Block height or hash.' } },
        required: ['height_or_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/block/{height_or_hash}/volume',
      executionParameters: [{ name: 'height_or_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_chain_info',
    {
      name: 'rpc_chain_info',
      description: `Returns global node and chain info: block count, difficulty, pruning, fork status, etc.
Useful for diagnostics, UI status panels, or infrastructure monitoring.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/rpc/general/info',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_mempool_info',
    {
      name: 'rpc_mempool_info',
      description: `Returns size, memory usage, fee thresholds, and Replace-By-Fee (RBF) state.
Useful for gauging current congestion and planning fees accordingly.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/rpc/mempool/info',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_mempool_transactions',
    {
      name: 'rpc_mempool_transactions',
      description: `Returns a list of transaction IDs currently in the mempool.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/rpc/mempool/transactions',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_mempool_transaction_details',
    {
      name: 'rpc_mempool_transaction_details',
      description: `Returns full information for a mempool transaction: fees, inputs, Replace-By-Fee (RBF) flags, unconfirmed descendants, etc.
Useful for inspecting transactions or verifying status.`,
      inputSchema: {
        type: 'object',
        properties: { tx_hash: { type: 'string', description: 'Transaction hash.' } },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/mempool/transactions/{tx_hash}',
      executionParameters: [{ name: 'tx_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_mempool_transaction_ancestors',
    {
      name: 'rpc_mempool_transaction_ancestors',
      description: `Lists ancestor TXs for a mempool TX, by a TX hash.
Useful for evaluating chains of unconfirmed transactions and replacability via Replace-By-Fee (RBF).`,
      inputSchema: {
        type: 'object',
        properties: { tx_hash: { type: 'string', description: 'Transaction hash.' } },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/mempool/transactions/{tx_hash}/ancestors',
      executionParameters: [{ name: 'tx_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_mempool_transaction_descendants',
    {
      name: 'rpc_mempool_transaction_descendants',
      description: `Lists descendant TXs for a mempool TX, by a TX hash.
Useful for evaluating chains of unconfirmed transactions and replacability via Replace-By-Fee (RBF).`,
      inputSchema: {
        type: 'object',
        properties: { tx_hash: { type: 'string', description: 'Transaction hash.' } },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/mempool/transactions/{tx_hash}/descendants',
      executionParameters: [{ name: 'tx_hash', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_transaction_info_batch',
    {
      name: 'rpc_transaction_info_batch',
      description: `Takes up to 50 TX hashes and returns verbose TX data in a single call. Useful for dashboards or syncing nodes without hitting rate limits.`,
      inputSchema: {
        type: 'object',
        properties: {
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
          requestBody: {
            properties: {
              tx_ids: {
                items: { type: 'string' },
                maxItems: 50,
                type: 'array',
                uniqueItems: false,
              },
            },
            required: ['tx_ids'],
            type: 'object',
            description: 'Transaction hash array.',
          },
        },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/rpc/transaction/batch',
      executionParameters: [{ name: 'verbose', in: 'query' }],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_transaction_decode',
    {
      name: 'rpc_transaction_decode',
      description: `Takes a raw TX hex and returns structured JSON.
Useful when building or validating raw transactions.`,
      inputSchema: {
        type: 'object',
        properties: { requestBody: { type: 'string', description: 'Raw Transaction Hex.' } },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/rpc/transaction/decode',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_estimate_smart_fee',
    {
      name: 'rpc_estimate_smart_fee',
      description: `Estimate approximate fee per kilobyte (kB) needed for a transaction.
Useful for setting dynamic fee rates in wallets or broadcast tools.`,
      inputSchema: {
        type: 'object',
        properties: {
          blocks: {
            default: 1,
            maximum: 1008,
            minimum: 1,
            type: 'number',
            description: 'Confirmation target in blocks.',
          },
          mode: {
            default: 'conservative',
            type: 'string',
            description:
              "Whether to return a more conservative estimate which also satisfies a longer history. A conservative estimate potentially returns a higher feerate and is more likely to be sufficient for the desired target, but is not as responsive to short term drops in the prevailing fee market. Must be one of: 'unset' 'economical' 'conservative'.",
          },
        },
        required: ['blocks'],
      },
      method: 'get',
      pathTemplate: '/rpc/transaction/estimatefee/{blocks}',
      executionParameters: [
        { name: 'blocks', in: 'path' },
        { name: 'mode', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_transaction_info_hex',
    {
      name: 'rpc_transaction_info_hex',
      description: `Same as \`/transaction/decode\` in that it takes a raw TX hex and returns structured JSON, but it also fetches blockchain metadata such as confirmations and block height.`,
      inputSchema: {
        type: 'object',
        properties: {
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
          requestBody: { type: 'string', description: 'Transaction hex.' },
        },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/rpc/transaction/hex',
      executionParameters: [{ name: 'verbose', in: 'query' }],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_psbt_decode',
    {
      name: 'rpc_psbt_decode',
      description: `Takes a signed PSBT hex and returns the internal structure. Covers UTXO metadata, BIP32 deriv paths, inputs/outputs, etc.
Useful for hardware wallet or multisig integrations.`,
      inputSchema: {
        type: 'object',
        properties: { requestBody: { type: 'string', description: 'Signed PSBT Hex.' } },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/rpc/transaction/psbt/decode',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_transaction_recent',
    {
      name: 'rpc_transaction_recent',
      description: `Returns a list of recent on-chain transactions.
Useful for retrieving lastest transactions or monitoring new, on-chain activity by block height.`,
      inputSchema: {
        type: 'object',
        properties: {
          page: { default: 1, type: 'number', description: 'Page number.' },
          count: { default: 100, type: 'number', description: 'Number of blocks.' },
          order: { default: 'asc', type: 'string', description: 'Order of transactions.' },
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
        },
      },
      method: 'get',
      pathTemplate: '/rpc/transaction/recent',
      executionParameters: [
        { name: 'page', in: 'query' },
        { name: 'count', in: 'query' },
        { name: 'order', in: 'query' },
        { name: 'verbose', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_transaction_recent_count',
    {
      name: 'rpc_transaction_recent_count',
      description: `Returns a list of recent on-chain transactions, specified by count.
Useful for retrieving lastest transactions or monitoring new, on-chain activity by block height.`,
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            default: 3,
            maximum: 100,
            minimum: 1,
            type: 'number',
            description: 'Number of transactions.',
          },
          order: {
            default: 'asc',
            type: 'string',
            description: 'Order transactions by descending (desc) or ascending (asc).',
          },
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
        },
        required: ['count'],
      },
      method: 'get',
      pathTemplate: '/rpc/transaction/recent/{count}',
      executionParameters: [
        { name: 'count', in: 'path' },
        { name: 'order', in: 'query' },
        { name: 'verbose', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_submit_transaction',
    {
      name: 'rpc_submit_transaction',
      description: `Pushes a signed raw transaction to the network.`,
      inputSchema: {
        type: 'object',
        properties: { requestBody: { type: 'string', description: 'Signed Tx Hex.' } },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/rpc/transaction/submit',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'rpc_transaction_info',
    {
      name: 'rpc_transaction_info',
      description: `This endpoint returns detailed information for a specific Bitcoin transaction, by its unique transaction hash.`,
      inputSchema: {
        type: 'object',
        properties: {
          tx_hash: { type: 'string', description: 'Transaction hash.' },
          verbose: { default: false, type: 'boolean', description: 'Verbose.' },
        },
        required: ['tx_hash'],
      },
      method: 'get',
      pathTemplate: '/rpc/transaction/{tx_hash}',
      executionParameters: [
        { name: 'tx_hash', in: 'path' },
        { name: 'verbose', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_Healthcheck',
    {
      name: 'event_manager_v1_EventManagerService_Healthcheck',
      description: `Healthcheck`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/eventmanager/healthcheck',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_ListManagers',
    {
      name: 'event_manager_v1_EventManagerService_ListManagers',
      description: `List all event managers

 Returns a list of all event managers associated with the API key. These represent configured webhook listeners for blockchain events.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/eventmanager/managers',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_CreateManager',
    {
      name: 'event_manager_v1_EventManagerService_CreateManager',
      description: `Create a new event manager

 Creates a new event manager that defines a webhook URL and related triggers.`,
      inputSchema: {
        type: 'object',
        properties: {
          requestBody: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'name' },
              chain: {
                title: 'chain',
                type: 'string',
                enum: ['CHAIN_UNSPECIFIED', 'CHAIN_BITCOIN'],
              },
              network: {
                title: 'network',
                type: 'string',
                enum: ['NETWORK_UNSPECIFIED', 'NETWORK_MAINNET', 'NETWORK_TESTNET'],
              },
              webhookUrl: { type: 'string', title: 'webhook_url' },
              triggers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    eventManagerId: { type: 'string', title: 'event_manager_id' },
                    triggerType: {
                      title: 'trigger_type',
                      type: 'string',
                      enum: [
                        'TRIGGER_TYPE_UNSPECIFIED',
                        'TRIGGER_TYPE_TRANSACTION',
                        'TRIGGER_TYPE_SENDER',
                        'TRIGGER_TYPE_RECEIVER',
                        'TRIGGER_TYPE_SENDER_OR_RECEIVER',
                      ],
                    },
                    trackedId: { type: 'string', title: 'tracked_id' },
                    filters: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: { type: 'string', title: 'key' },
                          operator: { type: 'string', title: 'operator' },
                          value: { type: 'string', title: 'value' },
                        },
                        title: 'Filter',
                        additionalProperties: false,
                      },
                      title: 'filters',
                    },
                  },
                  title: 'CreateTriggerRequest',
                  additionalProperties: false,
                },
                title: 'triggers',
              },
            },
            title: 'CreateManagerRequest',
            additionalProperties: false,
            description: 'The JSON request body.',
          },
        },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/eventmanager/managers',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_GetManager',
    {
      name: 'event_manager_v1_EventManagerService_GetManager',
      description: `Fetch a specific event manager

 Retrieves the configuration of a specific manager identified by its unique \`id\`.`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', title: 'id' } },
        required: ['id'],
      },
      method: 'get',
      pathTemplate: '/eventmanager/managers/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_UpdateManager',
    {
      name: 'event_manager_v1_EventManagerService_UpdateManager',
      description: `Update an existing event manager

 Updates an event manager’s metadata, webhook, or attached triggers identified by its unique \`id\`.`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', title: 'id' },
          requestBody: {
            type: 'object',
            properties: {
              eventManager: {
                type: 'object',
                properties: {
                  id: { type: 'string', title: 'id' },
                  name: { type: 'string', title: 'name' },
                  chain: {
                    title: 'chain',
                    type: 'string',
                    enum: ['CHAIN_UNSPECIFIED', 'CHAIN_BITCOIN'],
                  },
                  network: {
                    title: 'network',
                    type: 'string',
                    enum: ['NETWORK_UNSPECIFIED', 'NETWORK_MAINNET', 'NETWORK_TESTNET'],
                  },
                  webhookUrl: { type: 'string', title: 'webhook_url' },
                  status: { type: 'string', title: 'status' },
                  triggers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', title: 'id' },
                        eventManagerId: { type: 'string', title: 'event_manager_id' },
                        triggerType: {
                          title: 'trigger_type',
                          type: 'string',
                          enum: [
                            'TRIGGER_TYPE_UNSPECIFIED',
                            'TRIGGER_TYPE_TRANSACTION',
                            'TRIGGER_TYPE_SENDER',
                            'TRIGGER_TYPE_RECEIVER',
                            'TRIGGER_TYPE_SENDER_OR_RECEIVER',
                          ],
                        },
                        trackedId: { type: 'string', title: 'tracked_id' },
                        filters: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              key: { type: 'string', title: 'key' },
                              operator: { type: 'string', title: 'operator' },
                              value: { type: 'string', title: 'value' },
                            },
                            title: 'Filter',
                            additionalProperties: false,
                          },
                          title: 'filters',
                        },
                      },
                      title: 'Trigger',
                      additionalProperties: false,
                    },
                    title: 'triggers',
                  },
                },
                title: 'Manager',
                additionalProperties: false,
              },
            },
            title: 'UpdateManagerRequest',
            additionalProperties: false,
            description: 'The JSON request body.',
          },
        },
        required: ['id', 'requestBody'],
      },
      method: 'put',
      pathTemplate: '/eventmanager/managers/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_DeleteManager',
    {
      name: 'event_manager_v1_EventManagerService_DeleteManager',
      description: `Delete an event manager

 Removes the manager and all associated triggers identified by its unique \`id\`.`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', title: 'id' } },
        required: ['id'],
      },
      method: 'delete',
      pathTemplate: '/eventmanager/managers/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_ListTriggers',
    {
      name: 'event_manager_v1_EventManagerService_ListTriggers',
      description: `List all triggers

 Returns all individual triggers associated with your event managers.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/eventmanager/triggers',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_CreateTrigger',
    {
      name: 'event_manager_v1_EventManagerService_CreateTrigger',
      description: `Create a new trigger

 Adds a trigger to a manager to listen for specific blockchain activity.`,
      inputSchema: {
        type: 'object',
        properties: {
          requestBody: {
            type: 'object',
            properties: {
              eventManagerId: { type: 'string', title: 'event_manager_id' },
              triggerType: {
                title: 'trigger_type',
                type: 'string',
                enum: [
                  'TRIGGER_TYPE_UNSPECIFIED',
                  'TRIGGER_TYPE_TRANSACTION',
                  'TRIGGER_TYPE_SENDER',
                  'TRIGGER_TYPE_RECEIVER',
                  'TRIGGER_TYPE_SENDER_OR_RECEIVER',
                ],
              },
              trackedId: { type: 'string', title: 'tracked_id' },
              filters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', title: 'key' },
                    operator: { type: 'string', title: 'operator' },
                    value: { type: 'string', title: 'value' },
                  },
                  title: 'Filter',
                  additionalProperties: false,
                },
                title: 'filters',
              },
            },
            title: 'CreateTriggerRequest',
            additionalProperties: false,
            description: 'The JSON request body.',
          },
        },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/eventmanager/triggers',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_GetTrigger',
    {
      name: 'event_manager_v1_EventManagerService_GetTrigger',
      description: `Fetch trigger details

 Returns metadata and configuration for a specific trigger identified by its unique \`id\`.`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', title: 'id' } },
        required: ['id'],
      },
      method: 'get',
      pathTemplate: '/eventmanager/triggers/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_UpdateTrigger',
    {
      name: 'event_manager_v1_EventManagerService_UpdateTrigger',
      description: `Update a trigger

 Allows modification of a trigger's properties identified by its unique \`id\`.`,
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', title: 'id' },
          requestBody: {
            type: 'object',
            properties: {
              trigger: {
                type: 'object',
                properties: {
                  id: { type: 'string', title: 'id' },
                  eventManagerId: { type: 'string', title: 'event_manager_id' },
                  triggerType: {
                    title: 'trigger_type',
                    type: 'string',
                    enum: [
                      'TRIGGER_TYPE_UNSPECIFIED',
                      'TRIGGER_TYPE_TRANSACTION',
                      'TRIGGER_TYPE_SENDER',
                      'TRIGGER_TYPE_RECEIVER',
                      'TRIGGER_TYPE_SENDER_OR_RECEIVER',
                    ],
                  },
                  trackedId: { type: 'string', title: 'tracked_id' },
                  filters: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string', title: 'key' },
                        operator: { type: 'string', title: 'operator' },
                        value: { type: 'string', title: 'value' },
                      },
                      title: 'Filter',
                      additionalProperties: false,
                    },
                    title: 'filters',
                  },
                },
                title: 'Trigger',
                additionalProperties: false,
              },
            },
            title: 'UpdateTriggerRequest',
            additionalProperties: false,
            description: 'The JSON request body.',
          },
        },
        required: ['id', 'requestBody'],
      },
      method: 'put',
      pathTemplate: '/eventmanager/triggers/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_DeleteTrigger',
    {
      name: 'event_manager_v1_EventManagerService_DeleteTrigger',
      description: `Remove a trigger

 Deletes a specific trigger identified by its unique \`id\`, leaving the event manager intact.`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', title: 'id' } },
        required: ['id'],
      },
      method: 'delete',
      pathTemplate: '/eventmanager/triggers/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_GetEventLog',
    {
      name: 'event_manager_v1_EventManagerService_GetEventLog',
      description: `Fetch a single event log by ID

 Returns the payload, status, and response of a specific event log identified by its unique \`id\`.`,
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', title: 'id' } },
        required: ['id'],
      },
      method: 'get',
      pathTemplate: '/eventmanager/logs/{id}',
      executionParameters: [{ name: 'id', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_ListEventLogs',
    {
      name: 'event_manager_v1_EventManagerService_ListEventLogs',
      description: `Fetch all event logs

 Returns a list of event logs that have been generated from event manager triggers. Each log captures a payload, response status, and other metadata.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/eventmanager/logs',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_GetPicklistOptions',
    {
      name: 'event_manager_v1_EventManagerService_GetPicklistOptions',
      description: `Fetch picklist options by name

 Returns a list of picklist options identified by its unique \`name\`.`,
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', title: 'name' } },
        required: ['name'],
      },
      method: 'get',
      pathTemplate: '/eventmanager/picklist_options/{name}',
      executionParameters: [{ name: 'name', in: 'path' }],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'event_manager_v1_EventManagerService_ListDailyComputeCredits',
    {
      name: 'event_manager_v1_EventManagerService_ListDailyComputeCredits',
      description: `Fetch daily compute credits
 
 Fetches the compute credits available (calculation for previous day).`,
      inputSchema: {
        type: 'object',
        properties: {
          requestBody: {
            type: 'object',
            properties: {
              ids: { type: 'array', items: { type: 'string' }, title: 'ids' },
              date: {
                title: 'date',
                type: 'string',
                examples: ['1s', '1.000340012s'],
                format: 'date-time',
                description:
                  'A Timestamp represents a point in time independent of any time zone or local\n calendar, encoded as a count of seconds and fractions of seconds at\n nanosecond resolution. The count is relative to an epoch at UTC midnight on\n January 1, 1970, in the proleptic Gregorian calendar which extends the\n Gregorian calendar backwards to year one.\n\n All minutes are 60 seconds long. Leap seconds are "smeared" so that no leap\n second table is needed for interpretation, using a [24-hour linear\n smear](https://developers.google.com/time/smear).\n\n The range is from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59.999999999Z. By\n restricting to that range, we ensure that we can convert to and from [RFC\n 3339](https://www.ietf.org/rfc/rfc3339.txt) date strings.\n\n # Examples\n\n Example 1: Compute Timestamp from POSIX `time()`.\n\n     Timestamp timestamp;\n     timestamp.set_seconds(time(NULL));\n     timestamp.set_nanos(0);\n\n Example 2: Compute Timestamp from POSIX `gettimeofday()`.\n\n     struct timeval tv;\n     gettimeofday(&tv, NULL);\n\n     Timestamp timestamp;\n     timestamp.set_seconds(tv.tv_sec);\n     timestamp.set_nanos(tv.tv_usec * 1000);\n\n Example 3: Compute Timestamp from Win32 `GetSystemTimeAsFileTime()`.\n\n     FILETIME ft;\n     GetSystemTimeAsFileTime(&ft);\n     UINT64 ticks = (((UINT64)ft.dwHighDateTime) << 32) | ft.dwLowDateTime;\n\n     // A Windows tick is 100 nanoseconds. Windows epoch 1601-01-01T00:00:00Z\n     // is 11644473600 seconds before Unix epoch 1970-01-01T00:00:00Z.\n     Timestamp timestamp;\n     timestamp.set_seconds((INT64) ((ticks / 10000000) - 11644473600LL));\n     timestamp.set_nanos((INT32) ((ticks % 10000000) * 100));\n\n Example 4: Compute Timestamp from Java `System.currentTimeMillis()`.\n\n     long millis = System.currentTimeMillis();\n\n     Timestamp timestamp = Timestamp.newBuilder().setSeconds(millis / 1000)\n         .setNanos((int) ((millis % 1000) * 1000000)).build();\n\n Example 5: Compute Timestamp from Java `Instant.now()`.\n\n     Instant now = Instant.now();\n\n     Timestamp timestamp =\n         Timestamp.newBuilder().setSeconds(now.getEpochSecond())\n             .setNanos(now.getNano()).build();\n\n Example 6: Compute Timestamp from current time in Python.\n\n     timestamp = Timestamp()\n     timestamp.GetCurrentTime()\n\n # JSON Mapping\n\n In JSON format, the Timestamp type is encoded as a string in the\n [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) format. That is, the\n format is "{year}-{month}-{day}T{hour}:{min}:{sec}[.{frac_sec}]Z"\n where {year} is always expressed using four digits while {month}, {day},\n {hour}, {min}, and {sec} are zero-padded to two digits each. The fractional\n seconds, which can go up to 9 digits (i.e. up to 1 nanosecond resolution),\n are optional. The "Z" suffix indicates the timezone ("UTC"); the timezone\n is required. A proto3 JSON serializer should always use UTC (as indicated by\n "Z") when printing the Timestamp type and a proto3 JSON parser should be\n able to accept both UTC and other timezones (as indicated by an offset).\n\n For example, "2017-01-15T01:30:15.01Z" encodes 15.01 seconds past\n 01:30 UTC on January 15, 2017.\n\n In JavaScript, one can convert a Date object to this format using the\n standard\n [toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)\n method. In Python, a standard `datetime.datetime` object can be converted\n to this format using\n [`strftime`](https://docs.python.org/2/library/time.html#time.strftime) with\n the time format spec \'%Y-%m-%dT%H:%M:%S.%fZ\'. Likewise, in Java, one can use\n the Joda Time\'s [`ISODateTimeFormat.dateTime()`](\n http://joda-time.sourceforge.net/apidocs/org/joda/time/format/ISODateTimeFormat.html#dateTime()\n ) to obtain a formatter capable of generating timestamps in this format.',
              },
            },
            title: 'ListDailyComputeCreditsRequest',
            additionalProperties: false,
            description: 'The JSON request body.',
          },
        },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/_internal/daily_credits',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mkt-btc-prices-by-timestamps',
    {
      name: 'mkt-btc-prices-by-timestamps',
      description: `Returns BTC-USD prices for the provided list of UTC timestamps. Timestamps are matched against minute-aligned entries in the database.`,
      inputSchema: {
        type: 'object',
        properties: {
          requestBody: {
            properties: {
              timestamps: {
                items: { type: 'number' },
                maxItems: 100,
                minItems: 1,
                type: 'array',
                uniqueItems: false,
              },
            },
            required: ['timestamps'],
            type: 'object',
            description: 'Array of UTC timestamps',
          },
        },
        required: ['requestBody'],
      },
      method: 'post',
      pathTemplate: '/markets/btc/prices/batch',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mkt-btc-price-by-timestamp',
    {
      name: 'mkt-btc-price-by-timestamp',
      description: `Returns BTC-USD price for the provided UTC timestamp.`,
      inputSchema: {
        type: 'object',
        properties: {
          timestamp: { type: 'number', description: 'Unix timestamp in seconds' },
          requestBody: { type: 'object', description: 'The JSON request body.' },
        },
        required: ['timestamp'],
      },
      method: 'get',
      pathTemplate: '/markets/btc/prices/{timestamp}',
      executionParameters: [{ name: 'timestamp', in: 'path' }],
      requestBodyContentType: 'application/json',
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mkt-dexs',
    {
      name: 'mkt-dexs',
      description: `Retrieves a list of all decentralized exchanges (DEXs) currently indexed and supported by the API. This serves as the discovery endpoint for clients to programmatically identify valid DEX identifiers used in other endpoints like trades or OHLC queries.`,
      inputSchema: { type: 'object', properties: {} },
      method: 'get',
      pathTemplate: '/markets/dexs',
      executionParameters: [],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mkt-dex-ohlc',
    {
      name: 'mkt-dex-ohlc',
      description: `Returns candlestick-formatted market data (Open, High, Low, Close, Volume) for a specific DEX and Rune pair, segmented by time intervals. This is ideal for price charting, trend analysis, and historical performance. Data is sourced from both confirmed blocks and optionally from the mempool, depending on configuration.`,
      inputSchema: {
        type: 'object',
        properties: {
          dex: { default: 'magiceden', type: 'string', description: 'Name of the DEX' },
          symbol: {
            default: 'BTC-840000:28',
            type: 'string',
            description: 'Symbol of the Rune asset trading pair (BTC-Rune ID)',
          },
          mempool: {
            default: 'excluded',
            enum: ['included', 'excluded', 'only'],
            type: 'string',
            description: 'Mempool mode',
          },
          resolution: {
            default: '1h',
            enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
            type: 'string',
            description: 'Time resolution (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)',
          },
          from: { default: '1735689600', type: 'string', description: 'Start timestamp in Unix' },
          to: { default: '1742428800', type: 'string', description: 'End timestamp in Unix' },
          limit: {
            default: 5000,
            maximum: 50000,
            minimum: 1,
            type: 'number',
            description: 'Limit number of Runes returned (min: 1, max: 50000)',
          },
          sort: {
            default: 'desc',
            enum: ['asc', 'desc'],
            type: 'string',
            description: 'Sort by descending (desc) or ascending (asc)',
          },
          carry: {
            default: false,
            type: 'boolean',
            description:
              'Fill candles with no trades with synthetic data (OHLC filled with previous closing price, volume=0)',
          },
        },
        required: ['dex', 'symbol', 'resolution'],
      },
      method: 'get',
      pathTemplate: '/markets/dexs/ohlc/{dex}/{symbol}',
      executionParameters: [
        { name: 'dex', in: 'path' },
        { name: 'symbol', in: 'path' },
        { name: 'mempool', in: 'query' },
        { name: 'resolution', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'limit', in: 'query' },
        { name: 'sort', in: 'query' },
        { name: 'carry', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mkt-dex-trades',
    {
      name: 'mkt-dex-trades',
      description: `Provides a time-series list of individual trades for a specified Rune pair on a given DEX, including granular data such as trade price (in satoshis), volume, block height, and buy/sell direction. Especially useful for high-frequency strategies or price feed services.`,
      inputSchema: {
        type: 'object',
        properties: {
          dex: { default: 'magiceden', type: 'string', description: 'Name of the DEX' },
          symbol: {
            default: 'BTC-840000:28',
            type: 'string',
            description: 'Symbol of the Rune asset trading pair (BTC-Rune ID)',
          },
          mempool: {
            default: 'excluded',
            enum: ['included', 'excluded', 'only'],
            type: 'string',
            description: 'Mempool mode',
          },
          from: { default: '1735689600', type: 'string', description: 'Start timestamp in Unix' },
          to: { default: '1742428800', type: 'string', description: 'End timestamp in Unix' },
          limit: {
            default: 5000,
            maximum: 50000,
            minimum: 1,
            type: 'number',
            description: 'Limit number of Runes returned (min: 1, max: 50000)',
          },
          sort: {
            default: 'desc',
            enum: ['asc', 'desc'],
            type: 'string',
            description: 'Sort by descending (desc) or ascending (asc)',
          },
        },
        required: ['dex', 'symbol'],
      },
      method: 'get',
      pathTemplate: '/markets/dexs/trades/{dex}/{symbol}',
      executionParameters: [
        { name: 'dex', in: 'path' },
        { name: 'symbol', in: 'path' },
        { name: 'mempool', in: 'query' },
        { name: 'from', in: 'query' },
        { name: 'to', in: 'query' },
        { name: 'limit', in: 'query' },
        { name: 'sort', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
  [
    'mkt-dex',
    {
      name: 'mkt-dex',
      description: `Returns metadata for Rune assets registered and etched into the Bitcoin blockchain. This includes human-readable name, symbol, divisibility (decimals), and genesis transaction. Filtering by \`rune_id\` narrows the query to a specific asset.`,
      inputSchema: {
        type: 'object',
        properties: {
          rune_id: {
            default: '840000:28',
            maxLength: 16,
            type: 'string',
            description: 'Bitcoin Rune ID',
          },
          limit: {
            default: 5000,
            maximum: 50000,
            minimum: 1,
            type: 'number',
            description: 'Limit number of Runes returned (min: 1, max: 50000)',
          },
          sort: {
            default: 'desc',
            enum: ['asc', 'desc'],
            type: 'string',
            description: 'Sort by descending (desc) or ascending (asc)',
          },
        },
      },
      method: 'get',
      pathTemplate: '/markets/runes',
      executionParameters: [
        { name: 'rune_id', in: 'query' },
        { name: 'limit', in: 'query' },
        { name: 'sort', in: 'query' },
      ],
      requestBodyContentType: undefined,
      securityRequirements: [{ 'api-key': [] }],
    },
  ],
]);

/**
 * Security schemes from the OpenAPI spec
 */
const securitySchemes = {
  'api-key': {
    type: 'apiKey',
    in: 'header',
    name: 'api-key',
    description: 'Project API Key',
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map((def) => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
  }));
  return { tools: toolsForClient };
});

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest): Promise<CallToolResult> => {
    const { name: toolName, arguments: toolArgs } = request.params;
    const toolDefinition = toolDefinitionMap.get(toolName);
    if (!toolDefinition) {
      console.error(`Error: Unknown tool requested: ${toolName}`);
      return { content: [{ type: 'text', text: `Error: Unknown tool requested: ${toolName}` }] };
    }

    return await executeApiTool(
      toolName,
      toolDefinition,
      toolArgs ?? {},
      securitySchemes,
      mcpHandler.getBearerAuth()
    );
  }
);

/**
 * Type definition for cached OAuth tokens
 */
interface TokenCacheEntry {
  token: string;
  expiresAt: number;
}

/**
 * Declare global __oauthTokenCache property for TypeScript
 */
declare global {
  var __oauthTokenCache: Record<string, TokenCacheEntry> | undefined;
}

/**
 * Acquires an OAuth2 token using client credentials flow
 *
 * @param schemeName Name of the security scheme
 * @param scheme OAuth2 security scheme
 * @returns Acquired token or null if unable to acquire
 */
async function acquireOAuth2Token(
  schemeName: string,
  scheme: any
): Promise<string | null | undefined> {
  try {
    // Check if we have the necessary credentials
    const clientId = process.env[`OAUTH_CLIENT_ID_SCHEMENAME`];
    const clientSecret = process.env[`OAUTH_CLIENT_SECRET_SCHEMENAME`];
    const scopes = process.env[`OAUTH_SCOPES_SCHEMENAME`];

    if (!clientId || !clientSecret) {
      console.error(`Missing client credentials for OAuth2 scheme '${schemeName}'`);
      return null;
    }

    // Initialize token cache if needed
    if (typeof global.__oauthTokenCache === 'undefined') {
      global.__oauthTokenCache = {};
    }

    // Check if we have a cached token
    const cacheKey = `${schemeName}_${clientId}`;
    const cachedToken = global.__oauthTokenCache[cacheKey];
    const now = Date.now();

    if (cachedToken && cachedToken.expiresAt > now) {
      console.error(
        `Using cached OAuth2 token for '${schemeName}' (expires in ${Math.floor(
          (cachedToken.expiresAt - now) / 1000
        )} seconds)`
      );
      return cachedToken.token;
    }

    // Determine token URL based on flow type
    let tokenUrl = '';
    if (scheme.flows?.clientCredentials?.tokenUrl) {
      tokenUrl = scheme.flows.clientCredentials.tokenUrl;
      console.error(`Using client credentials flow for '${schemeName}'`);
    } else if (scheme.flows?.password?.tokenUrl) {
      tokenUrl = scheme.flows.password.tokenUrl;
      console.error(`Using password flow for '${schemeName}'`);
    } else {
      console.error(`No supported OAuth2 flow found for '${schemeName}'`);
      return null;
    }

    // Prepare the token request
    let formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');

    // Add scopes if specified
    if (scopes) {
      formData.append('scope', scopes);
    }

    console.error(`Requesting OAuth2 token from ${tokenUrl}`);

    // Make the token request
    const response = await axios({
      method: 'POST',
      url: tokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      data: formData.toString(),
    });

    // Process the response
    if (response.data?.access_token) {
      const token = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600; // Default to 1 hour

      // Cache the token
      global.__oauthTokenCache[cacheKey] = {
        token,
        expiresAt: now + expiresIn * 1000 - 60000, // Expire 1 minute early
      };

      console.error(
        `Successfully acquired OAuth2 token for '${schemeName}' (expires in ${expiresIn} seconds)`
      );
      return token;
    } else {
      console.error(
        `Failed to acquire OAuth2 token for '${schemeName}': No access_token in response`
      );
      return null;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error acquiring OAuth2 token for '${schemeName}':`, errorMessage);
    return null;
  }
}

/**
 * Executes an API tool with the provided arguments
 *
 * @param toolName Name of the tool to execute
 * @param definition Tool definition
 * @param toolArgs Arguments provided by the user
 * @param allSecuritySchemes Security schemes from the OpenAPI spec
 * @returns Call tool result
 */
async function executeApiTool(
  toolName: string,
  definition: McpToolDefinition,
  toolArgs: JsonObject,
  allSecuritySchemes: Record<string, any>,
  bearerAuth?: string
): Promise<CallToolResult> {
  try {
    // Validate arguments against the input schema
    let validatedArgs: JsonObject;
    try {
      const zodSchema = getZodSchemaFromJsonSchema(definition.inputSchema, toolName);
      const argsToParse = typeof toolArgs === 'object' && toolArgs !== null ? toolArgs : {};
      validatedArgs = zodSchema.parse(argsToParse);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const validationErrorMessage = `Invalid arguments for tool '${toolName}': ${error.errors
          .map((e) => `${e.path.join('.')} (${e.code}): ${e.message}`)
          .join(', ')}`;
        return { content: [{ type: 'text', text: validationErrorMessage }] };
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            { type: 'text', text: `Internal error during validation setup: ${errorMessage}` },
          ],
        };
      }
    }

    // Prepare URL, query parameters, headers, and request body
    let urlPath = definition.pathTemplate;
    const queryParams: Record<string, any> = {};
    const headers: Record<string, string> = { Accept: 'application/json' };
    let requestBodyData: any = undefined;

    // Apply parameters to the URL path, query, or headers
    definition.executionParameters.forEach((param) => {
      const value = validatedArgs[param.name];
      if (typeof value !== 'undefined' && value !== null) {
        if (param.in === 'path') {
          urlPath = urlPath.replace(`{${param.name}}`, encodeURIComponent(String(value)));
        } else if (param.in === 'query') {
          queryParams[param.name] = value;
        } else if (param.in === 'header') {
          headers[param.name.toLowerCase()] = String(value);
        }
      }
    });

    // Ensure all path parameters are resolved
    if (urlPath.includes('{')) {
      throw new Error(`Failed to resolve path parameters: ${urlPath}`);
    }

    // Construct the full URL
    const requestUrl = API_BASE_URL ? `${API_BASE_URL}${urlPath}` : urlPath;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
      requestBodyData = validatedArgs['requestBody'];
      headers['content-type'] = definition.requestBodyContentType;
    }

    /* MAESTRO OVERRIDE */
    if (bearerAuth) {
      headers['api-key'] = bearerAuth;
    }
    /* MAESTRO OVERRIDE */

    // // Apply security requirements if available
    // // Security requirements use OR between array items and AND within each object
    // const appliedSecurity = definition.securityRequirements?.find((req) => {
    //   // Try each security requirement (combined with OR)
    //   return Object.entries(req).every(([schemeName, scopesArray]) => {
    //     const scheme = allSecuritySchemes[schemeName];
    //     if (!scheme) return false;

    //     // API Key security (header, query, cookie)
    //     if (scheme.type === 'apiKey') {
    //       return !!process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
    //     }

    //     // HTTP security (basic, bearer)
    //     if (scheme.type === 'http') {
    //       if (scheme.scheme?.toLowerCase() === 'bearer') {
    //         return !!process.env[
    //           `BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    //         ];
    //       } else if (scheme.scheme?.toLowerCase() === 'basic') {
    //         return (
    //           !!process.env[
    //             `BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    //           ] &&
    //           !!process.env[
    //             `BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    //           ]
    //         );
    //       }
    //     }

    //     // OAuth2 security
    //     if (scheme.type === 'oauth2') {
    //       // Check for pre-existing token
    //       if (
    //         process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`]
    //       ) {
    //         return true;
    //       }

    //       // Check for client credentials for auto-acquisition
    //       if (
    //         process.env[
    //           `OAUTH_CLIENT_ID_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    //         ] &&
    //         process.env[
    //           `OAUTH_CLIENT_SECRET_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    //         ]
    //       ) {
    //         // Verify we have a supported flow
    //         if (scheme.flows?.clientCredentials || scheme.flows?.password) {
    //           return true;
    //         }
    //       }

    //       return false;
    //     }

    //     // OpenID Connect
    //     if (scheme.type === 'openIdConnect') {
    //       return !!process.env[
    //         `OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
    //       ];
    //     }

    //     return false;
    //   });
    // });

    // // If we found matching security scheme(s), apply them
    // if (appliedSecurity) {
    //     // Apply each security scheme from this requirement (combined with AND)
    //     for (const [schemeName, scopesArray] of Object.entries(appliedSecurity)) {
    //         const scheme = allSecuritySchemes[schemeName];

    //         // API Key security
    //         if (scheme?.type === 'apiKey') {
    //             const apiKey = process.env[`API_KEY_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
    //             if (apiKey) {
    //                 if (scheme.in === 'header') {
    //                     headers[scheme.name.toLowerCase()] = apiKey;
    //                     console.error(`Applied API key '${schemeName}' in header '${scheme.name}'`);
    //                 }
    //                 else if (scheme.in === 'query') {
    //                     queryParams[scheme.name] = apiKey;
    //                     console.error(`Applied API key '${schemeName}' in query parameter '${scheme.name}'`);
    //                 }
    //                 else if (scheme.in === 'cookie') {
    //                     // Add the cookie, preserving other cookies if they exist
    //                     headers['cookie'] = `${scheme.name}=${apiKey}${headers['cookie'] ? `; ${headers['cookie']}` : ''}`;
    //                     console.error(`Applied API key '${schemeName}' in cookie '${scheme.name}'`);
    //                 }
    //             }
    //         }
    //         // HTTP security (Bearer or Basic)
    //         else if (scheme?.type === 'http') {
    //             if (scheme.scheme?.toLowerCase() === 'bearer') {
    //                 const token = process.env[`BEARER_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
    //                 if (token) {
    //                     headers['authorization'] = `Bearer ${token}`;
    //                     console.error(`Applied Bearer token for '${schemeName}'`);
    //                 }
    //             }
    //             else if (scheme.scheme?.toLowerCase() === 'basic') {
    //                 const username = process.env[`BASIC_USERNAME_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
    //                 const password = process.env[`BASIC_PASSWORD_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
    //                 if (username && password) {
    //                     headers['authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    //                     console.error(`Applied Basic authentication for '${schemeName}'`);
    //                 }
    //             }
    //         }
    //         // OAuth2 security
    //         else if (scheme?.type === 'oauth2') {
    //             // First try to use a pre-provided token
    //             let token = process.env[`OAUTH_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];

    //             // If no token but we have client credentials, try to acquire a token
    //             if (!token && (scheme.flows?.clientCredentials || scheme.flows?.password)) {
    //                 console.error(`Attempting to acquire OAuth token for '${schemeName}'`);
    //                 token = (await acquireOAuth2Token(schemeName, scheme)) ?? '';
    //             }

    //             // Apply token if available
    //             if (token) {
    //                 headers['authorization'] = `Bearer ${token}`;
    //                 console.error(`Applied OAuth2 token for '${schemeName}'`);

    //                 // List the scopes that were requested, if any
    //                 const scopes = scopesArray as string[];
    //                 if (scopes && scopes.length > 0) {
    //                     console.error(`Requested scopes: ${scopes.join(', ')}`);
    //                 }
    //             }
    //         }
    //         // OpenID Connect
    //         else if (scheme?.type === 'openIdConnect') {
    //             const token = process.env[`OPENID_TOKEN_${schemeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
    //             if (token) {
    //                 headers['authorization'] = `Bearer ${token}`;
    //                 console.error(`Applied OpenID Connect token for '${schemeName}'`);

    //                 // List the scopes that were requested, if any
    //                 const scopes = scopesArray as string[];
    //                 if (scopes && scopes.length > 0) {
    //                     console.error(`Requested scopes: ${scopes.join(', ')}`);
    //                 }
    //             }
    //         }
    //     }
    // }
    // // Log warning if security is required but not available
    // else if (definition.securityRequirements?.length > 0) {
    //     // First generate a more readable representation of the security requirements
    //     const securityRequirementsString = definition.securityRequirements
    //         .map(req => {
    //             const parts = Object.entries(req)
    //                 .map(([name, scopesArray]) => {
    //                     const scopes = scopesArray as string[];
    //                     if (scopes.length === 0) return name;
    //                     return `${name} (scopes: ${scopes.join(', ')})`;
    //                 })
    //                 .join(' AND ');
    //             return `[${parts}]`;
    //         })
    //         .join(' OR ');

    //     console.warn(`Tool '${toolName}' requires security: ${securityRequirementsString}, but no suitable credentials found.`);
    // }

    /* MAESTRO OVERRIDE */

    // Prepare the axios request configuration
    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(),
      url: requestUrl,
      params: queryParams,
      headers: headers,
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(`Executing tool "${toolName}": ${config.method} ${config.url}`);

    // Execute the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    const contentType = response.headers['content-type']?.toLowerCase() || '';

    // Handle JSON responses
    if (
      contentType.includes('application/json') &&
      typeof response.data === 'object' &&
      response.data !== null
    ) {
      try {
        responseText = JSON.stringify(response.data, null, 2);
      } catch (e) {
        responseText = '[Stringify Error]';
      }
    }
    // Handle string responses
    else if (typeof response.data === 'string') {
      responseText = response.data;
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) {
      responseText = String(response.data);
    }
    // Handle empty responses
    else {
      responseText = `(Status: ${response.status} - No body content)`;
    }

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text: `API Response (Status: ${response.status}):\n${responseText}`,
        },
      ],
    };
  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;

    // Format Axios errors specially
    if (axios.isAxiosError(error)) {
      errorMessage = formatApiError(error);
    }
    // Handle standard errors
    else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Handle unexpected error types
    else {
      errorMessage = 'Unexpected error: ' + String(error);
    }

    // Log error to stderr
    console.error(`Error during execution of tool '${toolName}':`, errorMessage);

    // Return error message to client
    return { content: [{ type: 'text', text: errorMessage }] };
  }
}

/**
 * Main function to start the server
 */
async function main() {
  // Set up StreamableHTTP transport
  try {
    await setupStreamableHttpServer(server, 3000);
  } catch (error) {
    console.error('Error setting up StreamableHTTP server:', error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
  console.error('Shutting down MCP server...');
  process.exit(0);
}

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error('Fatal error in main execution:', error);
  process.exit(1);
});

/**
 * Formats API errors for better readability
 *
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
  let message = 'API request failed.';
  if (error.response) {
    message = `API Error: Status ${error.response.status} (${
      error.response.statusText || 'Status text not available'
    }). `;
    const responseData = error.response.data;
    const MAX_LEN = 200;
    if (typeof responseData === 'string') {
      message += `Response: ${responseData.substring(0, MAX_LEN)}${
        responseData.length > MAX_LEN ? '...' : ''
      }`;
    } else if (responseData) {
      try {
        const jsonString = JSON.stringify(responseData);
        message += `Response: ${jsonString.substring(0, MAX_LEN)}${
          jsonString.length > MAX_LEN ? '...' : ''
        }`;
      } catch {
        message += 'Response: [Could not serialize data]';
      }
    } else {
      message += 'No response body received.';
    }
  } else if (error.request) {
    message = 'API Network Error: No response received from server.';
    if (error.code) message += ` (Code: ${error.code})`;
  } else {
    message += `API Request Setup Error: ${error.message}`;
  }
  return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 *
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
  if (typeof jsonSchema !== 'object' || jsonSchema === null) {
    return z.object({}).passthrough();
  }
  try {
    const zodSchemaString = jsonSchemaToZod(jsonSchema);
    const zodSchema = eval(zodSchemaString);
    if (typeof zodSchema?.parse !== 'function') {
      throw new Error('Eval did not produce a valid Zod schema.');
    }
    return zodSchema as z.ZodTypeAny;
  } catch (err: any) {
    console.error(`Failed to generate/evaluate Zod schema for '${toolName}':`, err);
    return z.object({}).passthrough();
  }
}
