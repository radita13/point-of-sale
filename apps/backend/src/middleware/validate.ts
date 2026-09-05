import type { RequestHandler, Request, Response, NextFunction } from "express";
import { type ZodType, type ZodTypeDef } from "zod";
import type { ValidatedRequest, TypedAsyncHandler } from "../types/http";

export function validate<TOutput, TInput = unknown>(
  schema: ZodType<TOutput, ZodTypeDef, TInput>,
  source: "body" | "query" | "params" = "body",
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    (req as ValidatedRequest<TOutput>).validated = result.data;
    next();
  };
}

export function asyncHandler<T = unknown>(
  fn: TypedAsyncHandler<T>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as ValidatedRequest<T>, res, next).catch(next);
  };
}
