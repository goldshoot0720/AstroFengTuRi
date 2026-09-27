// 資料層：文章存於 posts.json，聯絡表單存於 messages.json（實際位置由 storage.ts 決定）
import { randomUUID } from 'node:crypto';
import { ConflictError, readDoc, writeDoc } from './storage';
import seedPosts from '../data/seed-posts.json';

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string;
  author: string;
  /** Quill 產生的語意化 HTML（已過濾），供前台顯示 */
  content: string;
  /** Quill Delta，供後台無損地重新載入編輯 */
  delta: unknown;
  status: PostStatus;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  body: string;
  createdAt: string;
  read: boolean;
}

// 尚無資料時使用的初始內容（例如剛部署到新的 Blob Storage）
const SEEDS: Record<string, unknown[]> = { 'posts.json': seedPosts };

async function readJson<T>(file: string): Promise<T[]> {
  const doc = await readDoc<T[]>(file);
  return doc?.data ?? ((SEEDS[file] ?? []) as T[]);
}

// 同一個執行個體內的寫入依序執行；跨執行個體則靠 ETag 偵測衝突後重試
const queues = new Map<string, Promise<unknown>>();

function serialize<T>(file: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(file) ?? Promise.resolve();
  const next = prev.then(task, task);
  queues.set(file, next.catch(() => {}));
  return next;
}

function update<T>(file: string, mutate: (items: T[]) => T[]) {
  return serialize(file, async () => {
    for (let attempt = 0; ; attempt++) {
      const doc = await readDoc<T[]>(file);
      const items = doc?.data ?? ((SEEDS[file] ?? []) as T[]);
      try {
        await writeDoc(file, mutate(items), doc ? (doc.etag ?? '') : null);
        return;
      } catch (err) {
        if (!(err instanceof ConflictError) || attempt >= 4) throw err;
      }
    }
  });
}

/* ---------- 文章 ---------- */

const POSTS = 'posts.json';

const byDateDesc = (a: Post, b: Post) => b.publishedAt.localeCompare(a.publishedAt);

/** 已發布且發布時間已到（未來時間的文章視為排程中） */
export const isLive = (p: Post) => p.status === 'published' && p.publishedAt <= new Date().toISOString();

export async function listPosts(opts: { includeDrafts?: boolean; category?: string } = {}) {
  const posts = await readJson<Post>(POSTS);
  return posts
    .filter((p) => opts.includeDrafts || isLive(p))
    .filter((p) => !opts.category || p.category === opts.category)
    .sort(byDateDesc);
}

export async function getPostById(id: string) {
  return (await readJson<Post>(POSTS)).find((p) => p.id === id);
}

export async function getPublishedPostBySlug(slug: string) {
  const posts = await readJson<Post>(POSTS);
  return posts.find((p) => p.slug === slug && isLive(p));
}

export type PostInput = Pick<
  Post,
  'title' | 'slug' | 'excerpt' | 'category' | 'cover' | 'author' | 'content' | 'delta' | 'status' | 'publishedAt'
>;

export class SlugTakenError extends Error {}

export async function savePost(input: PostInput, id?: string): Promise<Post> {
  let saved!: Post;
  await update<Post>(POSTS, (posts) => {
    const now = new Date().toISOString();
    const existing = id ? posts.find((p) => p.id === id) : undefined;
    if (id && !existing) throw new Error('找不到文章');

    const postId = existing?.id ?? randomUUID().slice(0, 8);
    const slug = input.slug || existing?.slug || postId;
    if (posts.some((p) => p.slug === slug && p.id !== postId)) {
      throw new SlugTakenError(`網址代稱「${slug}」已被其他文章使用`);
    }

    saved = {
      ...input,
      id: postId,
      slug,
      publishedAt: input.publishedAt || existing?.publishedAt || now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    return existing ? posts.map((p) => (p.id === postId ? saved : p)) : [...posts, saved];
  });
  return saved;
}

export async function deletePost(id: string) {
  await update<Post>(POSTS, (posts) => posts.filter((p) => p.id !== id));
}

/* ---------- 聯絡表單 ---------- */

const MESSAGES = 'messages.json';

export async function listMessages() {
  const items = await readJson<Message>(MESSAGES);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addMessage(input: Omit<Message, 'id' | 'createdAt' | 'read'>) {
  await update<Message>(MESSAGES, (items) => [
    ...items,
    { ...input, id: randomUUID().slice(0, 8), createdAt: new Date().toISOString(), read: false },
  ]);
}

export async function setMessageRead(id: string, read: boolean) {
  await update<Message>(MESSAGES, (items) => items.map((m) => (m.id === id ? { ...m, read } : m)));
}

export async function deleteMessage(id: string) {
  await update<Message>(MESSAGES, (items) => items.filter((m) => m.id !== id));
}
