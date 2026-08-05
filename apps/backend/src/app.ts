import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import rateLimitModule from "express-rate-limit";
const rateLimit = (typeof rateLimitModule === "function" ? rateLimitModule : (rateLimitModule as any).default || rateLimitModule) as any;
import productsRouter from "./routes/products.js";
import inventoryRouter from "./routes/inventory.js";
import transactionsRouter from "./routes/transactions.js";

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  "http://localhost:5173,http://127.0.0.1:5173,https://point-of-sale-fe.vercel.app/"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      )
        return cb(null, true);
      return cb(null, false);
    },
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

app.get("/health", (_req, res) => {
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

app.use((_req, res) => {
  res.status(404).json({ error: "Route tidak ditemukan" });
});
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
