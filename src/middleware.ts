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

  let response: Response;
  try {
    response = await next();
  } catch (err) {
    if (!isAdminApi) throw err;
    // 後台 API 出錯時回傳實際原因，讓編輯器能顯示，並寫入伺服器記錄（Vercel Logs）
    console.error(`[admin-api] ${context.request.method} ${pathname}`, err);
    return Response.json({ error: `伺服器錯誤：${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
  if (pathname.startsWith('/admin') || isAdminApi) {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
  }
  return response;
});
