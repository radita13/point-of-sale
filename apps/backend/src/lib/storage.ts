const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "product-images";

export function storageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

function authHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY!}`,
    ...extra,
  };
}

async function ensureBucket(): Promise<void> {
  const list = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: authHeaders(),
  });
  if (!list.ok) {
    throw new Error(`Failed to list storage buckets: HTTP ${list.status}`);
  }
  const buckets = (await list.json()) as Array<{ id: string; name: string }>;
  if (buckets.some((b) => b.id === BUCKET || b.name === BUCKET)) return;

  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!create.ok) {
    throw new Error(`Failed to create storage bucket: HTTP ${create.status}`);
  }
}

export async function uploadProductImage(
  dataUrl: string,
  productId: string,
): Promise<string> {
  if (!storageConfigured()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the backend");
  }
  const mime = dataUrl.match(/^data:([^;,]+)/)?.[1] ?? "";
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(mime)) {
    throw new Error("Unsupported image format (only JPEG, PNG, and WebP are allowed)");
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = Buffer.from(base64, "base64");

  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("Image size exceeds the 5MB limit");
  }

  const ext =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${productId}.${ext}`;

  await ensureBucket();

  const upload = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "PUT",
      headers: authHeaders({ "Content-Type": mime, "x-upsert": "true" }),
      body: bytes,
    },
  );
  if (!upload.ok) {
    throw new Error(`Failed to upload image: HTTP ${upload.status}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
