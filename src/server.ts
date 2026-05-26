import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import appRoutes from "./routes/app.routes.js";
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
app.use(express.json());

// Static file serving
app.use("/uploads", express.static("uploads"));
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

// MCP Streamable HTTP endpoint
app.post("/mcp", async (req, res) => {
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
});

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
app.use("/ai", aiRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EasyData running on port ${PORT}`);
});
