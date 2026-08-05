import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/app.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
