/**
 * Server-only link preview (unfurl) engine.
 * Fetches an external URL, extracts its Open Graph / Twitter card metadata
 * and caches the result in public.link_previews.
 */
import { adminClient } from "@/lib/supabase-server";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  status: string;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_BYTES = 400_000;

const BLOCKED_HOST_RE =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|metadata\.)/i;

export function isPublicHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (BLOCKED_HOST_RE.test(u.hostname)) return null;
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    if (!tag) continue;
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decodeEntities(content).slice(0, 500);
  }
  return null;
}

function absolutize(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url: URL): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; TaskMatesBot/1.0; +https://taskmates.app)",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en,pt;q=0.8",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (!type.includes("html") && !type.includes("xml")) return null;
    const text = await res.text();
    return text.slice(0, MAX_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Reads the cache, refetching when missing or stale. Never throws. */
export async function resolveLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  const url = isPublicHttpUrl(rawUrl);
  if (!url) return null;
  const key = url.toString();
  const admin = adminClient();

  const { data: cached } = await admin
    .from("link_previews")
    .select("url, title, description, image_url, site_name, status, fetched_at")
    .eq("url", key)
    .maybeSingle();

  if (cached) {
    const fresh = Date.now() - new Date(cached.fetched_at as string).getTime() < CACHE_TTL_MS;
    if (fresh) {
      const { fetched_at: _drop, ...preview } = cached as Record<string, unknown>;
      return preview as unknown as LinkPreview;
    }
  }

  const html = await fetchHtml(url);
  let preview: LinkPreview;

  if (!html) {
    preview = {
      url: key,
      title: cached?.title ?? url.hostname.replace(/^www\./, ""),
      description: cached?.description ?? null,
      image_url: cached?.image_url ?? null,
      site_name: cached?.site_name ?? url.hostname.replace(/^www\./, ""),
      status: "error",
    };
  } else {
    const title =
      metaContent(html, ["og:title", "twitter:title"]) ??
      decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").slice(0, 300) ??
      null;
    preview = {
      url: key,
      title: title || url.hostname.replace(/^www\./, ""),
      description: metaContent(html, ["og:description", "twitter:description", "description"]),
      image_url: absolutize(
        metaContent(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]),
        url,
      ),
      site_name: metaContent(html, ["og:site_name"]) ?? url.hostname.replace(/^www\./, ""),
      status: "ok",
    };
  }

  await admin
    .from("link_previews")
    .upsert({ ...preview, fetched_at: new Date().toISOString() }, { onConflict: "url" });

  return preview;
}
