// 後台登入：以環境變數 ADMIN_PASSWORD 驗證，登入後發給 HMAC 簽章的 Cookie
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'ftl_admin';
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.SESSION_SECRET || import.meta.env.SESSION_SECRET;
  if (!s && import.meta.env.PROD) throw new Error('SESSION_SECRET 未設定');
  return s || 'dev-only-insecure-secret';
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD || import.meta.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // 先各自雜湊再比較，避免長度差異洩漏資訊
  return safeEqual(sign(input), sign(expected));
}

export function createSession(cookies: AstroCookies) {
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  cookies.set(SESSION_COOKIE, `${expires}.${sign(String(expires))}`, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: SESSION_HOURS * 3600,
  });
}

export function destroySession(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function isValidSession(cookies: AstroCookies) {
  const raw = cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return false;
  const [expires, sig] = raw.split('.');
  if (!expires || !sig || !safeEqual(sig, sign(expires))) return false;
  return Number(expires) > Date.now();
}
