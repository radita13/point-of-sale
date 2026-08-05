/**
 * Upload foto produk ke Supabase Storage (bucket publik) lewat REST API.
 * Memakai SUPABASE_SERVICE_ROLE_KEY dari .env backend (bukan anon key).
 * Bucket dibuat otomatis bila belum ada. Tanpa service role key, fungsi
 * akan menolak — caller harus menangani fallback (skip foto, sync tetap jalan).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'product-images';

export function storageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY!}`,
    ...extra,
  };
}

/** Pastikan bucket publik ada; dibuat otomatis dengan izin public read. */
async function ensureBucket(): Promise<void> {
  const list = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: authHeaders(),
  });
  if (!list.ok) {
    throw new Error(`Gagal mencantumkan bucket storage: HTTP ${list.status}`);
  }
  const buckets = (await list.json()) as Array<{ id: string; name: string }>;
  if (buckets.some((b) => b.id === BUCKET || b.name === BUCKET)) return;

  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!create.ok) {
    throw new Error(`Gagal membuat bucket storage: HTTP ${create.status}`);
  }
}

/**
 * Upload foto produk dari data URL (data:image/jpeg;base64,...).
 * Mengembalikan URL publik yang bisa dipakai kolom image di DB & FE.
 */
export async function uploadProductImage(dataUrl: string, productId: string): Promise<string> {
  if (!storageConfigured()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di backend');
  }
  const mime = dataUrl.match(/^data:([^;,]+)/)?.[1] ?? 'image/jpeg';
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Buffer.from(base64, 'base64');
  const path = `${productId}.${ext}`;

  await ensureBucket();

  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': mime, 'x-upsert': 'true' }),
    body: bytes,
  });
  if (!upload.ok) {
    throw new Error(`Upload foto gagal: HTTP ${upload.status}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
