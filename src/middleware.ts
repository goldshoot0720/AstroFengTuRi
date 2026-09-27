import { defineMiddleware } from 'astro:middleware';
import { isValidSession } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  context.locals.isAdmin = isValidSession(context.cookies);

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin');

  if (isAdminApi && !context.locals.isAdmin) {
    return Response.json({ error: '未登入或登入已逾時' }, { status: 401 });
  }
  if (isAdminPage && !context.locals.isAdmin) {
    return context.redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  const response = await next();
  if (pathname.startsWith('/admin') || isAdminApi) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  return response;
});
