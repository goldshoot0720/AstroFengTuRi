// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { readFileSync } from 'node:fs';

// 在 Vercel 上建置時（會自動帶 VERCEL=1）使用 Vercel adapter，其餘環境使用 Node 獨立伺服器
const onVercel = Boolean(process.env.VERCEL);
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** 列出套件本身與其所有相依套件的名稱 */
function withDependencies(name, seen = new Set()) {
  if (seen.has(name)) return seen;
  seen.add(name);
  const pkg = JSON.parse(readFileSync(new URL(`./node_modules/${name}/package.json`, import.meta.url), 'utf8'));
  for (const dep of Object.keys(pkg.dependencies ?? {})) withDependencies(dep, seen);
  return seen;
}

export default defineConfig({
  site: process.env.SITE_URL || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:4321'),
  output: 'server',
  adapter: onVercel ? vercel() : node({ mode: 'standalone' }),
  security: { checkOrigin: true },
  vite: {
    ssr: {
      // sanitize-html 是 CommonJS，執行時才以 require() 載入相依套件：
      // 其中 htmlparser2 只有 ES Module（Vercel 不支援 require），其他套件也不會被 Vercel 的檔案追蹤帶上。
      // 因此把 sanitize-html 與所有相依套件在建置時直接打包進伺服器程式碼。
      noExternal: [...withDependencies('sanitize-html')],
    },
  },
});
