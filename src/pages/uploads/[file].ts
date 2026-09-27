import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { UPLOAD_DIR } from '../../lib/db';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const GET: APIRoute = async ({ params }) => {
  const name = params.file ?? '';
  const match = /^[\w-]+\.(jpg|png|webp|gif)$/.exec(name);
  if (!match) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(data, {
      headers: {
        'Content-Type': TYPES[match[1]],
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
