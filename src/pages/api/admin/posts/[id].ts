import type { APIRoute } from 'astro';
import { deletePost, getPostById, savePost, SlugTakenError } from '../../../../lib/db';
import { parsePostInput } from '../../../../lib/post-input';

export const PUT: APIRoute = async ({ params, request }) => {
  if (!(await getPostById(params.id!))) return Response.json({ error: '找不到文章' }, { status: 404 });
  const { data, error } = parsePostInput(await request.json().catch(() => null));
  if (!data) return Response.json({ error }, { status: 400 });
  try {
    return Response.json(await savePost(data, params.id));
  } catch (err) {
    if (err instanceof SlugTakenError) return Response.json({ error: err.message }, { status: 409 });
    throw err;
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  await deletePost(params.id!);
  return new Response(null, { status: 204 });
};
