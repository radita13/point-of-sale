import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface SupabaseAuthResult {
  sub: string; // Supabase user UUID
  email?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: SupabaseAuthResult;
    }
  }
}

/**
 * Verifikasi token JWT dari Supabase Auth.
 * Best Practice:
 * 1. Jika token menggunakan HS256 (misal token dev lokal dari _mint.mjs), verifikasi secara lokal dengan SUPABASE_JWT_SECRET.
 * 2. Jika token menggunakan ES256 / RS256 (token resmi pengguna dari Supabase Auth Cloud), verifikasi via Supabase Auth API (/auth/v1/user).
 */
export async function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;

  // Inspect token header tanpa verifikasi signature untuk melihat algoritma ('alg')
  const decodedHeader = jwt.decode(token, { complete: true });
  const alg = decodedHeader?.header?.alg;

  // 1. Coba verifikasi HS256 secara lokal (untuk dev/mint token)
  if (alg === "HS256" && secret) {
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: ["HS256"],
      }) as JwtPayload;
      if (decoded.sub) {
        req.auth = {
          sub: decoded.sub,
          email: typeof decoded.email === "string" ? decoded.email : null,
        };
        return next();
      }
    } catch (err) {
      const expired = err instanceof jwt.TokenExpiredError;
      if (expired || !supabaseUrl) {
        console.warn(`[auth] token HS256 ditolak: ${err instanceof Error ? err.message : String(err)}`);
        return res.status(401).json({
          error: expired
            ? "Token telah kedaluwarsa, silakan login ulang"
            : "Invalid or expired token",
        });
      }
    }
  }

  // 2. Verifikasi via Supabase Auth Endpoint (Mendukung ES256, RS256, & Token Supabase Auth resmi)
  if (supabaseUrl) {
    try {
      const rawAnonKey = process.env.SUPABASE_ANON_KEY || "";
      const anonKey = rawAnonKey.trim().replace(/^["']|["']$/g, "");

      const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`);
      if (anonKey) {
        url.searchParams.set("apikey", anonKey);
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (anonKey) {
        headers["apikey"] = anonKey;
      }

      const response = await fetch(url.toString(), { headers });

      if (response.ok) {
        const userData = (await response.json()) as { id: string; email?: string };
        if (userData?.id) {
          req.auth = {
            sub: userData.id,
            email: userData.email ?? null,
          };
          return next();
        }
      } else {
        const errText = await response.text().catch(() => "");
        console.warn(`[auth] Supabase Auth API menolak token (${response.status}): ${errText}`);
      }
    } catch (fetchErr) {
      console.error("[auth] Gagal menghubungi Supabase Auth API:", fetchErr);
    }
  }

  return res.status(401).json({ error: "Invalid or expired token" });
}
