const TAIPEI_OFFSET = 8 * 3600_000;

export function formatDate(iso: string) {
  return new Date(new Date(iso).getTime() + TAIPEI_OFFSET).toISOString().slice(0, 10).replaceAll('-', '.');
}

/** 以台灣時間輸出 datetime-local 欄位用的字串 */
export function toLocalInput(iso: string) {
  return new Date(new Date(iso).getTime() + TAIPEI_OFFSET).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  if (!value) return '';
  const d = new Date(`${value}:00+08:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
}
