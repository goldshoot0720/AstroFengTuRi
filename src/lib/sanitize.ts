// 過濾 Quill 輸出的 HTML，只保留編輯器會產生的標籤與樣式
import sanitizeHtml from 'sanitize-html';

const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i];

export function sanitizeContent(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
      'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'span', 'img', 'hr', 'iframe',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      iframe: ['src', 'frameborder', 'allowfullscreen'],
      '*': ['class', 'style'],
    },
    allowedClasses: { '*': [/^ql-[\w-]+$/] },
    allowedStyles: {
      '*': { color: COLOR, 'background-color': COLOR, 'text-align': [/^(left|right|center|justify)$/] },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'] },
    // 影片僅允許常見平台
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: /^https?:/.test(attribs.href ?? '')
          ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
          : attribs,
      }),
    },
  });
}

export function plainText(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}
