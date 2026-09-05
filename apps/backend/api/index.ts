import type { IncomingMessage, ServerResponse } from "http";
// @ts-expect-error - dist/app.js is generated during build
import app from "../dist/app.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as any, res as any);
}
