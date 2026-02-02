/**
 * StreamableHTTP server setup for HTTP-based MCP communication using Hono
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { v4 as uuid } from 'uuid';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InitializeRequestSchema, JSONRPCError } from '@modelcontextprotocol/sdk/types.js';
import { toReqRes, toFetchResponse } from 'fetch-to-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * AsyncLocalStorage for tracking session context across async operations
 * This ensures tool calls get the correct session's bearer auth even in concurrent scenarios
 */
const sessionContext = new AsyncLocalStorage<string>();

/**
 * Get the current session ID from async context
 */
export function getCurrentSessionId(): string | undefined {
  return sessionContext.getStore();
}

// Import server configuration constants
import { SERVER_NAME, SERVER_VERSION } from './index.js';

// Constants
const SESSION_ID_HEADER_NAME = 'mcp-session-id';
const JSON_RPC = '2.0';

/**
 * Session timeout configuration (default: 30 minutes)
 */
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || '1800000', 10);
const SESSION_CLEANUP_INTERVAL_MS = 60000; // Check every minute

/**
 * Logging configuration
 */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDebugMode = LOG_LEVEL === 'debug';

function debugLog(...args: any[]) {
  if (isDebugMode) {
    console.error(...args);
  }
}

/**
 * Pre-compute static file directory path
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.join(__dirname, '..', '..', 'public');

/**
 * Content type mapping for static files
 */
const CONTENT_TYPE_MAP: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Session data including transport and auth
 */
interface SessionData {
  transport: StreamableHTTPServerTransport;
  bearerAuth: string;
  lastActivity: number;
}

/**
 * StreamableHTTP MCP Server handler
 */
class MCPStreamableHttpServer {
  server: Server;
  // Store active sessions with their data (per-session auth)
  sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.server = server;
    // Start session cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Start periodic cleanup of stale sessions
   */
  private startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, SESSION_CLEANUP_INTERVAL_MS);
    // Prevent the timer from keeping the process alive
    this.cleanupInterval.unref();
  }

  /**
   * Clean up sessions that have been inactive for too long
   */
  private cleanupStaleSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, data] of this.sessions) {
      if (now - data.lastActivity > SESSION_TIMEOUT_MS) {
        debugLog(`Cleaning up stale session: ${sessionId}`);
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.error(`Cleaned up ${cleanedCount} stale session(s). Active sessions: ${this.sessions.size}`);
    }
  }

  /**
   * Handle GET requests (typically used for static files)
   */
  async handleGetRequest(c: any) {
    debugLog('GET request received - StreamableHTTP transport only supports POST');
    return c.text('Method Not Allowed', 405, {
      Allow: 'POST',
    });
  }

  /**
   * Handle POST requests (all MCP communication)
   */
  async handlePostRequest(c: any) {
    const sessionId = c.req.header(SESSION_ID_HEADER_NAME);
    debugLog(
      `POST request received ${sessionId ? 'with session ID: ' + sessionId : 'without session ID'}`
    );

    try {
      const body = await c.req.json();

      // Convert Fetch Request to Node.js req/res
      const { req, res } = toReqRes(c.req.raw);

      // Reuse existing session if we have a session ID
      if (sessionId && this.sessions.has(sessionId)) {
        const sessionData = this.sessions.get(sessionId)!;
        const transport = sessionData.transport;

        // Update bearer auth for this session (per-session, not global)
        const authHeader = c.req.header('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          sessionData.bearerAuth = authHeader.slice(7);
        }

        // Update last activity time
        sessionData.lastActivity = Date.now();

        // Use AsyncLocalStorage to maintain session context across async operations
        // This ensures getBearerAuth returns the correct auth even in concurrent scenarios
        return sessionContext.run(sessionId, async () => {
          // Handle the request with the transport
          await transport.handleRequest(req, res, body);

          // Cleanup when the response ends
          res.on('close', () => {
            debugLog(`Request closed for session ${sessionId}`);
          });

          // Convert Node.js response back to Fetch Response
          return toFetchResponse(res);
        });
      }

      // Create new transport for initialize requests
      if (!sessionId && this.isInitializeRequest(body)) {
        debugLog('Creating new StreamableHTTP transport for initialize request');

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => uuid(),
        });

        // Add error handler for debug purposes
        transport.onerror = (err) => {
          console.error('StreamableHTTP transport error:', err);
        };

        // Connect the transport to the MCP server
        await this.server.connect(transport);

        // Handle the request with the transport
        await transport.handleRequest(req, res, body);

        // Store the session if we have a session ID
        const newSessionId = transport.sessionId;
        if (newSessionId) {
          console.error(`New session established: ${newSessionId}`);

          // Extract initial bearer auth
          let bearerAuth = '';
          const authHeader = c.req.header('authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            bearerAuth = authHeader.slice(7);
          }

          // Store session data with per-session auth
          this.sessions.set(newSessionId, {
            transport,
            bearerAuth,
            lastActivity: Date.now(),
          });

          // Set up clean-up for when the transport is closed
          transport.onclose = () => {
            console.error(`Session closed: ${newSessionId}`);
            this.sessions.delete(newSessionId);
          };
        }

        // Cleanup when the response ends
        res.on('close', () => {
          debugLog(`Request closed for new session`);
        });

        // Convert Node.js response back to Fetch Response
        return toFetchResponse(res);
      }

      // Invalid request (no session ID and not initialize)
      return c.json(this.createErrorResponse('Bad Request: invalid session ID or method.'), 400);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      return c.json(this.createErrorResponse('Internal server error.'), 500);
    }
  }

  /**
   * Create a JSON-RPC error response
   */
  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: JSON_RPC,
      error: {
        code: -32000,
        message: message,
      },
      id: uuid(),
    };
  }

  /**
   * Check if the request is an initialize request
   */
  private isInitializeRequest(body: any): boolean {
    const isInitial = (data: any) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };

    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }

    return isInitial(body);
  }

  /**
   * Get Bearer Authorization token for the current session
   * Uses AsyncLocalStorage to get the correct session context in concurrent scenarios
   */
  public getBearerAuth(): string {
    // Get session ID from AsyncLocalStorage context (works across async boundaries)
    const currentSession = sessionContext.getStore();
    if (currentSession) {
      const sessionData = this.sessions.get(currentSession);
      return sessionData?.bearerAuth || '';
    }
    return '';
  }

  /**
   * Get session statistics for monitoring
   */
  public getSessionStats(): { activeCount: number; oldestSession: number | null } {
    let oldest: number | null = null;
    for (const data of this.sessions.values()) {
      if (oldest === null || data.lastActivity < oldest) {
        oldest = data.lastActivity;
      }
    }
    return {
      activeCount: this.sessions.size,
      oldestSession: oldest,
    };
  }
}

/* MAESTRO OVERRIDE */
// Create MCP handler as a global variable
let mcpHandler: MCPStreamableHttpServer;
/* MAESTRO OVERRIDE */

/**
 * Sets up a web server for the MCP server using StreamableHTTP transport
 *
 * @param server The MCP Server instance
 * @param port The port to listen on (default: 3000)
 * @returns The Hono app instance
 */
export async function setupStreamableHttpServer(server: Server, port = 3000) {
  // Create Hono app
  const app = new Hono();

  // Enable CORS
  app.use('*', cors());

  // Initialize global MCP handler
  mcpHandler = new MCPStreamableHttpServer(server);

  // Add a health check endpoint with session stats
  app.get('/health', (c) => {
    const stats = mcpHandler.getSessionStats();
    return c.json({
      status: 'OK',
      server: SERVER_NAME,
      version: SERVER_VERSION,
      sessions: stats.activeCount,
    });
  });

  // Main MCP endpoint supporting both GET and POST
  app.get('/mcp', (c) => mcpHandler.handleGetRequest(c));
  app.post('/mcp', (c) => mcpHandler.handlePostRequest(c));

  // Static files for the web client (using async operations)
  app.get('/*', async (c) => {
    const filePath = c.req.path === '/' ? '/index.html' : c.req.path;

    try {
      const fullPath = path.join(publicPath, filePath);

      // Simple security check to prevent directory traversal
      if (!fullPath.startsWith(publicPath)) {
        return c.text('Forbidden', 403);
      }

      try {
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          const content = await fs.readFile(fullPath);

          // Get content type based on file extension
          const ext = path.extname(fullPath).toLowerCase();
          const contentType = CONTENT_TYPE_MAP[ext] || 'text/plain';

          return new Response(content, {
            headers: { 'Content-Type': contentType },
          });
        }
      } catch (err) {
        // File not found or other error
        return c.text('Not Found', 404);
      }
    } catch (err) {
      console.error('Error serving static file:', err);
      return c.text('Internal Server Error', 500);
    }

    return c.text('Not Found', 404);
  });

  // Start the server
  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.error(`MCP StreamableHTTP Server running at http://localhost:${info.port}`);
      console.error(`- MCP Endpoint: http://localhost:${info.port}/mcp`);
      console.error(`- Health Check: http://localhost:${info.port}/health`);
    }
  );

  return app;
}

/* MAESTRO OVERRIDE */
// Export mcpHandler for external use
export { mcpHandler };
/* MAESTRO OVERRIDE */
