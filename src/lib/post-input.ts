// 驗證後台送出的文章資料
import { CATEGORIES } from '../config';
import type { PostInput } from './db';
import { sanitizeContent, plainText } from './sanitize';
import { fromLocalInput } from './format';

export function parsePostInput(body: any): { data?: PostInput; error?: string } {
  const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

  const title = str(body?.title, 200);
  if (!title) return { error: '請輸入文章標題' };

  const slug = str(body?.slug, 100).toLowerCase();
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: '網址代稱只能使用小寫英文、數字與連字號（-）' };
  }

  const category = str(body?.category, 50);
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: '請選擇文章分類' };

  const cover = str(body?.cover, 500);
  if (cover && !/^(\/uploads\/|https?:\/\/)/.test(cover)) return { error: '封面圖片網址格式不正確' };

  const content = sanitizeContent(typeof body?.content === 'string' ? body.content : '');
  const excerpt = str(body?.excerpt, 300) || plainText(content).slice(0, 120);

  return {
    data: {
      title,
      slug,
      category,
      cover,
      excerpt,
      content,
      author: str(body?.author, 50) || '鋒塗利研究團隊',
      delta: body?.delta ?? null,
      status: body?.status === 'published' ? 'published' : 'draft',
      publishedAt: fromLocalInput(str(body?.publishedAt, 30)),
    },
  };
}
