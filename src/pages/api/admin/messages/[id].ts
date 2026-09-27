import type { APIRoute } from 'astro';
import { deleteMessage, setMessageRead } from '../../../../lib/db';

export const PATCH: APIRoute = async ({ params, request }) => {
  const body = await request.json().catch(() => ({}));
  await setMessageRead(params.id!, Boolean(body?.read));
  return new Response(null, { status: 204 });
};

export const DELETE: APIRoute = async ({ params }) => {
  await deleteMessage(params.id!);
  return new Response(null, { status: 204 });
};
