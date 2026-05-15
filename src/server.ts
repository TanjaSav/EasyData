import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import appRoutes from "./routes/app.routes.js";

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

// Basic API info endpoint
app.get("/", (req, res) => {
  res.json({
    name: "EasyData",
    status: "running",
    version: "0.1.0",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

// Main EasyData API routes
app.use("/apps", appRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EasyData running on port ${PORT}`);
});