# 鋒塗利資產管理 官方網站

以 [Astro](https://astro.build) 7（SSR，Node adapter）打造的企業形象網站，並附有使用 [Quill](https://quilljs.com/) 2 富文本編輯器的文章管理後台。

## 功能

**前台**

- 首頁、關於我們、服務項目、投資觀點（文章列表／分類／分頁／內文）、聯絡我們
- 響應式設計（手機 / 平板 / 桌機）、SEO meta、Open Graph
- 金融業風險揭露聲明（頁尾與每篇文章底部）

**後台 `/admin`**

- 密碼登入（HMAC 簽章 Cookie，12 小時有效）
- 文章新增／編輯／刪除、草稿與發布、排程發布時間、分類、網址代稱、摘要、封面圖
- Quill 編輯器：標題、粗斜體、顏色、清單、對齊、引言、程式碼、連結、圖片、YouTube／Vimeo 影片
- 圖片可點選上傳、拖放或直接貼上，會自動上傳到伺服器（不存成 base64）
- `Ctrl/Cmd + S` 快速儲存，離開頁面前提醒未儲存的變更
- 聯絡表單訊息收件匣（已讀／未讀、刪除）

## 快速開始

```bash
npm install
cp .env.example .env   # 修改 ADMIN_PASSWORD 與 SESSION_SECRET
npm run dev            # http://localhost:4321 ，後台 http://localhost:4321/admin
```

## 部署到 Vercel

專案在 Vercel 上建置時會自動改用 `@astrojs/vercel`，資料改存到 **Vercel Blob**（私有）。

1. 在 Vercel 專案的 **Storage** 分頁建立 Blob Store，存取權限選 **Private**，並連結到此專案，Vercel 會自動加入 `BLOB_READ_WRITE_TOKEN`
2. 在 **Settings → Environment Variables** 加入 `ADMIN_PASSWORD` 與 `SESSION_SECRET`
3. 重新部署（Deployments → Redeploy）

第一次啟動時 Blob 裡還沒有資料，網站會顯示 `src/data/seed-posts.json` 的初始文章；在後台第一次儲存後，文章就會寫入 Blob。

> 圖片大小上限為 4MB（Vercel Functions 的請求上限為 4.5MB）。

## 部署到自己的主機

```bash
npm run build
npm start              # 會自動讀取 .env；可用 HOST / PORT 環境變數指定位址與埠號
```

需要 Node.js 22 以上。建議以 pm2 或 systemd 常駐，並在前面放 Nginx / Caddy 處理 HTTPS。資料會以 JSON 檔存放在 `DATA_DIR`，請將此目錄納入備份。

## 環境變數

| 環境變數 | 說明 |
| --- | --- |
| `ADMIN_PASSWORD` | 後台登入密碼 |
| `SESSION_SECRET` | 簽署登入 Cookie 的隨機字串（`openssl rand -hex 32`） |
| `BLOB_READ_WRITE_TOKEN` | 設定後改用 Vercel Blob 儲存資料（Vercel 連結 Blob Store 時會自動加入） |
| `DATA_DIR` | 未使用 Blob 時的本機資料目錄，預設 `./data` |
| `SITE_URL` | 網站正式網址，用於 canonical 與 og:image（Vercel 上預設使用正式網域） |

## 客製化

- 公司名稱、電話、信箱、地址、導覽列、文章分類：`src/config.ts`
- 服務項目內容：`src/lib/services.ts`
- 色彩與字體：`src/styles/global.css` 最上方的 CSS 變數
- 首頁／關於我們文案：`src/pages/index.astro`、`src/pages/about.astro`

目前的聯絡資訊與網站文案都是範例，上線前請替換成實際資料，並請法遵確認內容。

## 專案結構

```
src/
├── config.ts                 網站資訊設定
├── middleware.ts             後台登入保護
├── lib/
│   ├── db.ts                 資料層（文章、訊息）
│   ├── storage.ts            儲存層：Vercel Blob 或本機檔案
│   ├── auth.ts               登入驗證與 Session
│   ├── sanitize.ts           過濾 Quill 輸出的 HTML
│   └── post-input.ts         文章欄位驗證
├── data/seed-posts.json      初始文章（尚無資料時使用）
├── components/admin/PostEditor.astro   Quill 編輯器
├── pages/
│   ├── index / about / services / contact.astro
│   ├── insights/             文章列表與內文
│   ├── admin/                後台頁面
│   ├── api/admin/            後台 API（文章、上傳、訊息）
│   └── uploads/[file].ts     提供上傳的圖片
data/                         本機模式的資料（不納入版控）
```

## 安全性說明

- 文章 HTML 儲存前會以 `sanitize-html` 白名單過濾，只保留 Quill 會產生的標籤與樣式，iframe 僅允許 YouTube／Vimeo
- 上傳只接受 JPG / PNG / WebP / GIF，單檔 4MB，檔名由伺服器隨機產生
- 表單與 API 受 Astro 內建 Origin 檢查（CSRF 防護）保護，Cookie 設為 HttpOnly、SameSite=Lax
- 聯絡表單有蜜罐欄位阻擋機器人
