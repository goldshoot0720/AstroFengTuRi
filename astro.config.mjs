// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

// 在 Vercel 上建置時（會自動帶 VERCEL=1）使用 Vercel adapter，其餘環境使用 Node 獨立伺服器
const onVercel = Boolean(process.env.VERCEL);
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default defineConfig({
  site: process.env.SITE_URL || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:4321'),
  output: 'server',
  adapter: onVercel ? vercel() : node({ mode: 'standalone' }),
  security: { checkOrigin: true },
  vite: {
    ssr: {
      // sanitize-html 是 CommonJS，但它依賴的 htmlparser2 只有 ES Module；
      // Vercel 的執行環境不支援 require() ES Module，因此建置時直接打包進伺服器程式碼
      noExternal: ['sanitize-html', 'htmlparser2', 'domhandler', 'domutils', 'dom-serializer', 'domelementtype', 'entities'],
    },
  },
});
