import type { RequestHandler } from 'express';
import { ZodSchema } from 'zod';

/**
 * Middleware validasi request body/query/params terhadap ZodSchema.
 * Wajib untuk membatasi request dari FE (sesuai shared schemas).
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validasi gagal',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    (req as any).validated = result.data;
    return next();
  };
}

/** Wrap async handler agar error diteruskan ke error middleware. */
export function asyncHandler(
  fn: (req: any, res: any, next: any) => Promise<void>,
): RequestHandler {
  return (req: any, res: any, next: any) => {
    fn(req, res, next).catch(next);
  };
}