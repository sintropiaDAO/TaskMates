/**
 * Server-only builder for social share previews (Open Graph metadata)
 * of public TaskMates items and communities.
 * Private (hidden community) items never expose a preview.
 */
import { adminClient } from "@/lib/supabase-server";
import { resolveLinkPreview } from "@/lib/link-preview.server";
import { extractFirstUrl } from "@/lib/linkUtils";

export type ShareType = "task" | "poll" | "product";

export interface SharePreview {
  found: boolean;
  private: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
}

const TABLES: Record<ShareType, { table: string; join: string; fk: string }> = {
  task: { table: "tasks", join: "task_tags", fk: "task_id" },
  poll: { table: "polls", join: "poll_tags", fk: "poll_id" },
  product: { table: "products", join: "product_tags", fk: "product_id" },
};

const EMPTY: SharePreview = {
  found: false,
  private: false,
  title: null,
  description: null,
  image: null,
};

function plain(html?: string | null, max = 200): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** True when every community tag of the item belongs to a hidden community. */
async function isPrivateByTags(tagIds: string[]): Promise<boolean> {
  if (tagIds.length === 0) return false;
  const admin = adminClient();
  const { data: tags } = await admin
    .from("tags")
    .select("id, category")
    .in("id", tagIds);
  const communityIds = (tags ?? [])
    .filter((t) => (t as { category?: string | null }).category === "communities")
    .map((t) => (t as { id: string }).id);
  if (communityIds.length === 0) return false;

  const { data: settings } = await admin
    .from("community_settings")
    .select("tag_id, is_hidden")
    .in("tag_id", communityIds);
  const hidden = new Set(
    (settings ?? [])
      .filter((s) => (s as { is_hidden?: boolean }).is_hidden)
      .map((s) => (s as { tag_id: string }).tag_id),
  );
  return communityIds.every((id) => hidden.has(id));
}

export async function buildItemSharePreview(
  type: ShareType,
  id: string,
): Promise<SharePreview> {
  const cfg = TABLES[type];
  if (!cfg) return EMPTY;
  const admin = adminClient();

  const cols = "id, title, description, image_url";
  const { data: item } = await admin
    .from(cfg.table)
    .select(cols)
    .eq("id", id)
    .maybeSingle();
  if (!item) return EMPTY;

  const { data: links } = await admin
    .from(cfg.join)
    .select("tag_id")
    .eq(cfg.fk, id);
  const tagIds = (links ?? []).map((l) => (l as { tag_id: string }).tag_id);

  if (await isPrivateByTags(tagIds)) {
    return { ...EMPTY, found: true, private: true };
  }

  const row = item as { title?: string | null; description?: string | null; image_url?: string | null };
  let image = row.image_url ?? null;

  if (!image) {
    const firstUrl = extractFirstUrl(row.description);
    if (firstUrl) {
      const preview = await resolveLinkPreview(firstUrl);
      image = preview?.image_url ?? null;
    }
  }

  return {
    found: true,
    private: false,
    title: row.title ?? null,
    description: plain(row.description),
    image,
  };
}

export async function buildTagSharePreview(tagId: string): Promise<SharePreview> {
  const admin = adminClient();
  const { data: tag } = await admin
    .from("tags")
    .select("id, name, category")
    .eq("id", tagId)
    .maybeSingle();
  if (!tag) return EMPTY;

  const { data: settings } = await admin
    .from("community_settings")
    .select("is_hidden, description, header_image_url, logo_url")
    .eq("tag_id", tagId)
    .maybeSingle();

  if ((settings as { is_hidden?: boolean } | null)?.is_hidden) {
    return { ...EMPTY, found: true, private: true };
  }

  const s = settings as
    | { description?: string | null; header_image_url?: string | null; logo_url?: string | null }
    | null;

  return {
    found: true,
    private: false,
    title: (tag as { name: string }).name,
    description: plain(s?.description),
    image: s?.header_image_url ?? s?.logo_url ?? null,
  };
}
