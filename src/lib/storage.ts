// 儲存層：已連結 Vercel Blob 時（BLOB_READ_WRITE_TOKEN 或 OIDC 的 BLOB_STORE_ID）使用私有 Blob，否則使用本機 DATA_DIR
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from '@vercel/blob';

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export class ConflictError extends Error {}

export interface Doc<T> {
  data: T;
  /** Blob 的 ETag，寫回時用來確認期間沒有被別人改過 */
  etag?: string;
}

/** 目前的儲存方式，以及是否能寫入（Vercel 上未連結 Blob 時無法寫入） */
export function storageStatus() {
  return { mode: useBlob() ? 'blob' : 'local', writable: useBlob() || !process.env.VERCEL } as const;
}

function assertWritable() {
  if (!storageStatus().writable) {
    throw new Error('Vercel 上無法寫入檔案，請在 Vercel 專案連結 Blob Storage 並重新部署');
  }
}

/* ---------- JSON 文件 ---------- */

/**
 * 讀取 JSON 文件。withEtag 為 true 時一併取得 Blob 的 ETag（準備寫回時才需要）。
 * 注意：下載回應標頭裡的 etag 會因 CDN / 壓縮而與儲存端不同，不能拿來做條件寫入，
 * 必須另外用 head() 取得正式的 ETag。
 */
export async function readDoc<T>(name: string, { withEtag = false } = {}): Promise<Doc<T> | null> {
  if (useBlob()) {
    let etag: string | undefined;
    if (withEtag) {
      // 先取 ETag 再讀內容：若兩者之間被改寫，寫回時 ETag 不符會觸發重試，不會蓋掉別人的變更
      try {
        etag = (await head(name)).etag;
      } catch (err) {
        if (err instanceof BlobNotFoundError) return null;
        throw err;
      }
    }
    const res = await get(name, { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return { data: JSON.parse(await new Response(res.stream).text()) as T, etag };
  }
  try {
    return { data: JSON.parse(await fs.readFile(path.join(DATA_DIR, name), 'utf8')) as T };
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}

/** etag 為 null 代表預期文件尚不存在 */
export async function writeDoc(name: string, data: unknown, etag?: string | null) {
  assertWritable();
  const body = JSON.stringify(data, null, 2);
  if (useBlob()) {
    try {
      await put(name, body, {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: etag != null,
        ...(etag ? { ifMatch: etag } : {}),
        cacheControlMaxAge: 60,
      });
    } catch (err) {
      // ETag 不符，或文件在讀取後被其他請求建立
      if (err instanceof BlobPreconditionFailedError || (etag == null && /already exists/i.test(String(err)))) {
        throw new ConflictError(name);
      }
      throw err;
    }
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, name);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, body, 'utf8');
  await fs.rename(tmp, target);
}

/* ---------- 上傳檔案 ---------- */

export async function saveFile(name: string, data: Buffer, contentType: string) {
  assertWritable();
  if (useBlob()) {
    await put(`uploads/${name}`, data, { access: 'private', contentType, addRandomSuffix: false });
    return;
  }
  const dir = path.join(DATA_DIR, 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
}

export async function readFile(name: string): Promise<BodyInit | null> {
  if (useBlob()) {
    const res = await get(`uploads/${name}`, { access: 'private' });
    return res?.statusCode === 200 ? res.stream : null;
  }
  try {
    return new Uint8Array(await fs.readFile(path.join(DATA_DIR, 'uploads', name)));
  } catch {
    return null;
  }
}
