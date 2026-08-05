import type { Request, Response } from 'express';
import app from '../src/app.js';

export default function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Handler Error]:', err);
    res.status(500).json({ error: 'Serverless Handler Execution Error', detail: String(err) });
  }
}
