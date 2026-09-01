import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const REFRESH_BUFFER_S = 60;

export async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) return null;

  const exp = session.expires_at;
  const nowSec = Math.floor(Date.now() / 1000);
  const needsRefresh = !exp || exp - nowSec < REFRESH_BUFFER_S;

  if (!needsRefresh) return session.access_token;

  try {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
  } catch {
    return null;
  }
}