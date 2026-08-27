import type { Request, Response, NextFunction } from "express";
import type { SupabaseAuthResult } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: SupabaseAuthResult;
      validated?: unknown;
    }
  }
}

export interface ValidatedRequest<T = unknown> extends Request {
  validated: T;
}

export type TypedAsyncHandler<T = unknown> = (
  req: ValidatedRequest<T>,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;
