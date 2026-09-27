// 編輯器圖片上傳：存到 DATA_DIR/uploads，透過 /uploads/[file] 提供
import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { UPLOAD_DIR } from '../../../lib/db';

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ error: '沒有收到檔案' }, { status: 400 });

  const ext = EXT[file.type];
  if (!ext) return Response.json({ error: '僅支援 JPG、PNG、WebP、GIF 圖片' }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: '圖片大小不可超過 5MB' }, { status: 413 });

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/uploads/${name}` }, { status: 201 });
};
