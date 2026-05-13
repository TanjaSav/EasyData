import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import appRoutes from "./routes/app.routes";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    name: "EasyData",
    status: "running",
    version: "0.1.0",
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

app.use("/apps", appRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`EasyData running on port ${PORT}`);
});