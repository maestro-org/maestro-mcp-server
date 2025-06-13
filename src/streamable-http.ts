
/**
 * StreamableHTTP server setup for HTTP-based MCP communication using Hono
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { v4 as uuid } from 'uuid';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InitializeRequestSchema, JSONRPCError } from "@modelcontextprotocol/sdk/types.js";
import { toReqRes, toFetchResponse } from 'fetch-to-node';

// Import server configuration constants
import { SERVER_NAME, SERVER_VERSION } from './index.js';

// Constants
const SESSION_ID_HEADER_NAME = "mcp-session-id";
const JSON_RPC = "2.0";

/**
 * StreamableHTTP MCP Server handler
 */
class MCPStreamableHttpServer {
  server: Server;
  // Store active transports by session ID
  transports: {[sessionId: string]: StreamableHTTPServerTransport} = {};
  
  constructor(server: Server) {
    this.server = server;
  }
  
  /**
   * Handle GET requests (typically used for static files)
   */
  async handleGetRequest(c: any) {
    console.error("GET request received - StreamableHTTP transport only supports POST");
    return c.text('Method Not Allowed', 405, {
      'Allow': 'POST'
    });
  }
  
  /**
   * Handle POST requests (all MCP communication)
   */
  async handlePostRequest(c: any) {
    const sessionId = c.req.header(SESSION_ID_HEADER_NAME);
    console.error(`POST request received ${sessionId ? 'with session ID: ' + sessionId : 'without session ID'}`);
    
    try {
      const body = await c.req.json();
      
      // Convert Fetch Request to Node.js req/res
      const { req, res } = toReqRes(c.req.raw);
      
      // Reuse existing transport if we have a session ID
      if (sessionId && this.transports[sessionId]) {
        const transport = this.transports[sessionId];
        
        // Handle the request with the transport
        await transport.handleRequest(req, res, body);
        
        // Cleanup when the response ends
        res.on('close', () => {
          console.error(`Request closed for session ${sessionId}`);
        });
        
        // Convert Node.js response back to Fetch Response
        return toFetchResponse(res);
      }
      
      // Create new transport for initialize requests
      if (!sessionId && this.isInitializeRequest(body)) {
        console.error("Creating new StreamableHTTP transport for initialize request");
        
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
        
        // Store the transport if we have a session ID
        const newSessionId = transport.sessionId;
        if (newSessionId) {
          console.error(`New session established: ${newSessionId}`);
          this.transports[newSessionId] = transport;
          
          // Set up clean-up for when the transport is closed
          transport.onclose = () => {
            console.error(`Session closed: ${newSessionId}`);
            delete this.transports[newSessionId];
          };
        }
        
        // Cleanup when the response ends
        res.on('close', () => {
          console.error(`Request closed for new session`);
        });
        
        // Convert Node.js response back to Fetch Response
        return toFetchResponse(res);
      }
      
      // Invalid request (no session ID and not initialize)
      return c.json(
        this.createErrorResponse("Bad Request: invalid session ID or method."),
        400
      );
    } catch (error) {
      console.error('Error handling MCP request:', error);
      return c.json(
        this.createErrorResponse("Internal server error."),
        500
      );
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
      return body.some(request => isInitial(request));
    }
    
    return isInitial(body);
  }
}

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
  
  // Create MCP handler
  const mcpHandler = new MCPStreamableHttpServer(server);
  
  // Add a simple health check endpoint
  app.get('/health', (c) => {
    return c.json({ status: 'OK', server: SERVER_NAME, version: SERVER_VERSION });
  });
  
  // Main MCP endpoint supporting both GET and POST
  app.get("/mcp", (c) => mcpHandler.handleGetRequest(c));
  app.post("/mcp", (c) => mcpHandler.handlePostRequest(c));
  
  // Static files for the web client (if any)
  app.get('/*', async (c) => {
    const filePath = c.req.path === '/' ? '/index.html' : c.req.path;
    try {
      // Use Node.js fs to serve static files
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const publicPath = path.join(__dirname, '..', '..', 'public');
      const fullPath = path.join(publicPath, filePath);
      
      // Simple security check to prevent directory traversal
      if (!fullPath.startsWith(publicPath)) {
        return c.text('Forbidden', 403);
      }
      
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const content = fs.readFileSync(fullPath);
          
          // Set content type based on file extension
          const ext = path.extname(fullPath).toLowerCase();
          let contentType = 'text/plain';
          
          switch (ext) {
            case '.html': contentType = 'text/html'; break;
            case '.css': contentType = 'text/css'; break;
            case '.js': contentType = 'text/javascript'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpeg'; break;
            case '.svg': contentType = 'image/svg+xml'; break;
          }
          
          return new Response(content, {
            headers: { 'Content-Type': contentType }
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
  serve({
    fetch: app.fetch,
    port
  }, (info) => {
    console.error(`MCP StreamableHTTP Server running at http://localhost:${info.port}`);
    console.error(`- MCP Endpoint: http://localhost:${info.port}/mcp`);
    console.error(`- Health Check: http://localhost:${info.port}/health`);
  });
  
  return app;
}
