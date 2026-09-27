import type { APIRoute } from 'astro';
import { readFile } from '../../lib/storage';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const GET: APIRoute = async ({ params }) => {
  const name = params.file ?? '';
  const match = /^[\w-]+\.(jpg|png|webp|gif)$/.exec(name);
  const body = match && (await readFile(name));
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(body, {
    headers: {
      'Content-Type': TYPES[match[1]],
      // 檔名不會重複，可讓瀏覽器與 CDN 長期快取
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
