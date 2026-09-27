import type { APIRoute } from 'astro';
import { savePost, SlugTakenError } from '../../../../lib/db';
import { parsePostInput } from '../../../../lib/post-input';

export const POST: APIRoute = async ({ request }) => {
  const { data, error } = parsePostInput(await request.json().catch(() => null));
  if (!data) return Response.json({ error }, { status: 400 });
  try {
    return Response.json(await savePost(data), { status: 201 });
  } catch (err) {
    if (err instanceof SlugTakenError) return Response.json({ error: err.message }, { status: 409 });
    throw err;
  }
};
