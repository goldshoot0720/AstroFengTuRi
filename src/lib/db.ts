// 以 JSON 檔案作為輕量資料庫：文章存於 data/posts.json，聯絡表單存於 data/messages.json
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

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

// 同一個檔案的寫入依序執行，避免同時存檔互相覆蓋
const queues = new Map<string, Promise<unknown>>();

function serialize<T>(file: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(file) ?? Promise.resolve();
  const next = prev.then(task, task);
  queues.set(file, next.catch(() => {}));
  return next;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf8')) as T;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, file);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, target);
}

function update<T>(file: string, mutate: (items: T[]) => T[] | Promise<T[]>) {
  return serialize(file, async () => {
    const items = await readJson<T[]>(file, []);
    await writeJson(file, await mutate(items));
  });
}

/* ---------- 文章 ---------- */

const POSTS = 'posts.json';

const byDateDesc = (a: Post, b: Post) => b.publishedAt.localeCompare(a.publishedAt);

/** 已發布且發布時間已到（未來時間的文章視為排程中） */
export const isLive = (p: Post) => p.status === 'published' && p.publishedAt <= new Date().toISOString();

export async function listPosts(opts: { includeDrafts?: boolean; category?: string } = {}) {
  const posts = await readJson<Post[]>(POSTS, []);
  return posts
    .filter((p) => opts.includeDrafts || isLive(p))
    .filter((p) => !opts.category || p.category === opts.category)
    .sort(byDateDesc);
}

export async function getPostById(id: string) {
  return (await readJson<Post[]>(POSTS, [])).find((p) => p.id === id);
}

export async function getPublishedPostBySlug(slug: string) {
  const posts = await readJson<Post[]>(POSTS, []);
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
  const items = await readJson<Message[]>(MESSAGES, []);
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
