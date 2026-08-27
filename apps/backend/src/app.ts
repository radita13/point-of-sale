import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import productsRouter from "./routes/products.routes";
import inventoryRouter from "./routes/inventory.routes";
import transactionsRouter from "./routes/transactions.routes";
import storesRouter from "./routes/stores.routes";

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

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "API Point Of Sale is running.",
    data: null,
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

app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: "error", message: "Route not found." });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res
    .status(500)
    .json({ status: "error", message: err.message || "Internal server error" });
});

export default app;
