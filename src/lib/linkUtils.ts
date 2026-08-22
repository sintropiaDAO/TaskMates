// Shared helpers to find external links inside item descriptions (rich HTML or plain text).

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

/** Strips HTML tags but keeps href targets so links inside rich text are found. */
export function extractUrls(content?: string | null, limit = Infinity): string[] {
  if (!content) return [];
  const found: string[] = [];
  const push = (raw: string) => {
    const url = raw.replace(/[.,;:!?)]+$/, '');
    if (!/^https?:\/\//i.test(url)) return;
    if (!found.includes(url)) found.push(url);
  };

  // hrefs first (rich text links)
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(content))) push(m[1]);

  // then bare urls in the visible text
  const text = content.replace(/<[^>]+>/g, ' ');
  const bare = text.match(URL_RE) || [];
  bare.forEach(push);

  return found.slice(0, limit);
}

export function extractFirstUrl(content?: string | null): string | null {
  return extractUrls(content, 1)[0] ?? null;
}

export function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
