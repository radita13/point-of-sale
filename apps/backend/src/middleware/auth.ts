import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response as ExpressResponse, NextFunction } from "express";

export interface SupabaseAuthResult {
  sub: string;
  email?: string | null;
}

export async function authGuard(
  req: Request,
  res: ExpressResponse,
  next: NextFunction,
): Promise<void | ExpressResponse> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization token" });
  }
  const token = header.slice("Bearer ".length).trim();
  const secret = process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;

  const decodedHeader = jwt.decode(token, { complete: true });
  const alg = decodedHeader?.header?.alg;

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
        console.warn(
          `[auth] HS256 token rejected: ${err instanceof Error ? err.message : String(err)}`,
        );
        return res.status(401).json({
          error: expired
            ? "Token has expired, please log in again"
            : "Invalid or expired token",
        });
      }
    }
  }

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

      const response: globalThis.Response = await fetch(url.toString(), { headers });

      if (response.ok) {
        const userData = (await response.json()) as {
          id: string;
          email?: string;
        };
        if (userData?.id) {
          req.auth = {
            sub: userData.id,
            email: userData.email ?? null,
          };
          return next();
        }
      } else {
        const errText = await response.text().catch(() => "");
        console.warn(
          `[auth] Supabase Auth API rejected token (${response.status}): ${errText}`,
        );
        if (response.status === 403 || response.status === 401) {
          return res.status(401).json({
            error: "Session has expired or been revoked, please log in again",
          });
        }
      }
    } catch (fetchErr) {
      console.error("[auth] Failed to connect to Supabase Auth API:", fetchErr);
    }
  }

  return res.status(401).json({ error: "Invalid or expired token" });
}
