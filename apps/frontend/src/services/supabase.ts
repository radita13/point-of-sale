import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Buffer (detik) sebelum kedaluwarsa — paksa refresh lebih awal. */
const REFRESH_BUFFER_S = 60;

/**
 * Access token utk dikirim sebagai Bearer ke backend Express saat sync.
 *
 * HARUS selalu valid: Supabase access token hanya bertahan ±1 jam. Token
 * basi (tidak di-verified/direfresh oleh getSession) akan ditolak backend
 * dengan 401 "Invalid or expired token". Jadi di sini token kedaluwarsa
 * dijepult ke refreshSession() sebelum dikirim, bukan menyalin cache.
 */
export async function currentAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) return null;

  const exp = session.expires_at;
  const nowSec = Math.floor(Date.now() / 1000);
  const needsRefresh = !exp || exp - nowSec < REFRESH_BUFFER_S;

  if (!needsRefresh) return session.access_token;

  // Paksa ekschange refresh_token -> access_token baru. Gagal bila refresh
  // token ikut basi (sesi benar-benar rusak) → return null; caller akan
  // menganggap "belum login" lalu meminta login ulang.
  try {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed.session?.access_token ?? null;
  } catch {
    return null;
  }
}