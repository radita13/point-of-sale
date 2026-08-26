import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import rateLimitModule from "express-rate-limit";
const rateLimit = (
  typeof rateLimitModule === "function"
    ? rateLimitModule
    : (rateLimitModule as any).default || rateLimitModule
) as any;
import productsRouter from "./routes/products.js";
import inventoryRouter from "./routes/inventory.js";
import transactionsRouter from "./routes/transactions.js";
import storesRouter from "./routes/stores.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin.replace(/\/$/, ""))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "20mb" }));

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const syncLimiter = rateLimit({
  windowMs: 60_000,
  limit: 1200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req: any, res: any) => {
  res.json({
    status: "ok",
    service: "point-of-sale-backend",
    time: new Date().toISOString(),
  });
});

app.use("/api/v1/products/sync", syncLimiter);
app.use("/api/v1/transactions/sync", syncLimiter);
app.use("/api/v1/inventory/adjustments", syncLimiter);

app.use("/api/v1/products", apiLimiter, productsRouter);
app.use("/api/v1/inventory", apiLimiter, inventoryRouter);
app.use("/api/v1/transactions", apiLimiter, transactionsRouter);
app.use("/api/v1/stores", apiLimiter, storesRouter);

app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Route tidak ditemukan" });
});
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
