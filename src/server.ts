import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import appRoutes, { legacyRowsRouter, mcpRateLimit } from "./routes/app.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { createEasyDataMcpServer } from "./mcp/server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Core middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled only for the Phase 1 browser fetch demo
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(
  express.json({
    verify: (req: any, res, buf, encoding) => {
      req.rawBody = buf.toString((encoding as BufferEncoding) || "utf8");
    },
  })
);

// Error handler for JSON parsing errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    console.error("JSON Parsing Error on path:", req.path);
    console.error("Raw Body was:", (req as any).rawBody);
    console.error("Error details:", err);
    return res.status(400).json({ error: "Invalid JSON", message: err.message });
  }
  next(err);
});


// Static file serving
// Uploaded files are served by signed app routes, not as public static assets.
app.use("/public", express.static("public"));
app.use(express.static("public"));

// Landing page
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

async function handleMcpRequest(req: express.Request, res: express.Response) {
  // Enforce Accept header for MCP streamable HTTP compatibility
  const accept = req.headers.accept || "";
  if (!accept.includes("application/json") || !accept.includes("text/event-stream")) {
    req.headers.accept = "application/json, text/event-stream";
  }

  // Streamable HTTP requests are stateless, so each request gets an isolated MCP server.
  const mcpServer = createEasyDataMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  } as any);

  try {
    await mcpServer.connect(transport as any);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  } finally {
    // Always close transports to avoid leaking per-request MCP resources.
    await transport.close();
    await mcpServer.close();
  }
}

// MCP Streamable HTTP endpoint. The extra POST aliases support hosted clients
// that probe root or framework-style paths before settling on an MCP endpoint.
app.post(
  ["/mcp", "/", "/api", "/app", "/_next", "/_next/server", "/api/route"],
  mcpRateLimit,
  handleMcpRequest
);

app.get("/mcp", (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Use POST for MCP Streamable HTTP.",
    },
    id: null,
  });
});

app.delete("/mcp", (req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
});

// Main EasyData API routes
app.use("/apps", appRoutes);
// Compatibility alias for generated clients that assume a versioned API prefix.
app.use("/api/v1/apps", appRoutes);
// Compatibility alias for generated clients that use /api/rows/:appId/:table.
app.use("/api/rows", legacyRowsRouter);
// Compatibility aliases for generated clients that build /api/{appId}/... or /api/apps/{appId}/... URLs.
app.use("/api/apps", appRoutes);
app.use("/api", appRoutes);
// Compatibility aliases for generated clients that omit /tables and address rows directly.
app.use("/api/apps", legacyRowsRouter);
app.use("/api", legacyRowsRouter);
app.use("/ai", aiRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EasyData running on port ${PORT}`);
});
