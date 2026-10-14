/**
 * Server-only builder for public portfolios. Uses the admin client but only
 * returns public-safe fields and skips items tied to hidden communities.
 */
import { adminClient } from "@/lib/supabase-server";

export interface PortfolioPerson { id: string; name: string; avatar: string | null; username: string | null }
export interface PortfolioProof { url: string; type: string; caption: string | null }
export interface PortfolioItem {
  id: string;
  kind: "task" | "product" | "poll";
  title: string;
  description: string | null;
  image: string | null;
  date: string;
  subtype: string | null;
  label: string | null;
  proofs: PortfolioProof[];
  creator: PortfolioPerson | null;
  people: PortfolioPerson[];
}
export interface PublicPortfolio {
  found: boolean;
  id?: string;
  slug?: string;
  title?: string;
  summary?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  owner?: PortfolioPerson | null;
  tag?: { id: string; name: string; category: string; logo: string | null; emoji: string | null; cover: string | null } | null;
  items?: PortfolioItem[];
  testimonials?: { rating: number; comment: string; author: PortfolioPerson | null; date: string }[];
  metrics?: { tasks: number; products: number; polls: number; people: number; proofs: number };
  cover?: string | null;
  views?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function plain(html?: string | null, max = 4000): string | null {
  if (!html) return null;
  const t = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  return t ? (t.length > max ? t.slice(0, max - 1) + "…" : t) : null;
}

export async function buildPublicPortfolio(slug: string, countView = false): Promise<PublicPortfolio> {
  const db = adminClient();
  const { data: p } = await db.from("portfolios").select("*").eq("slug", slug).maybeSingle();
  if (!p) return { found: false };
  if (countView) await db.from("portfolios").update({ view_count: (p.view_count ?? 0) + 1 }).eq("id", p.id);

  const start = p.period_start ? `${p.period_start}T00:00:00Z` : "1970-01-01T00:00:00Z";
  const end = p.period_end ? `${p.period_end}T23:59:59Z` : "2999-12-31T00:00:00Z";
  const owner = p.owner_id as string;

  // Hidden communities -> exclude
  const { data: hiddenRows } = await db.from("community_settings").select("tag_id").eq("is_hidden", true);
  const hidden = new Set((hiddenRows ?? []).map((r: Row) => r.tag_id));

  async function tagMap(join: string, fk: string, ids: string[]) {
    const m = new Map<string, string[]>();
    if (!ids.length) return m;
    const { data } = await db.from(join).select(`${fk}, tag_id`).in(fk, ids);
    (data ?? []).forEach((r: Row) => m.set(r[fk], [...(m.get(r[fk]) ?? []), r.tag_id]));
    return m;
  }
  const allowed = (tags: string[]) =>
    !tags.some((t) => hidden.has(t)) && (!p.tag_id || tags.includes(p.tag_id));

  const items: PortfolioItem[] = [];
  const userIds = new Set<string>([owner]);
  const pendingPeople: { item: PortfolioItem; creator: string; people: string[] }[] = [];

  // Tasks
  if (p.include_tasks) {
    let ids: string[] | null = null;
    if (p.scope === "mine") {
      const { data: collab } = await db.from("task_collaborators").select("task_id").eq("user_id", owner).eq("approval_status", "approved");
      const { data: own } = await db.from("tasks").select("id").eq("created_by", owner);
      ids = [...new Set([...(collab ?? []), ...(own ?? [])].map((r: Row) => r.task_id ?? r.id))];
    }
    let q = db.from("tasks").select("id, title, description, image_url, updated_at, task_type, task_subtype, created_by, completion_proof_url, completion_proof_type")
      .eq("status", "completed").gte("updated_at", start).lte("updated_at", end).order("updated_at", { ascending: false }).limit(200);
    if (ids) q = q.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const { data: tasks } = await q;
    let list = (tasks ?? []) as Row[];
    if (p.task_subtypes?.length) list = list.filter((t) => p.task_subtypes.includes(t.task_subtype));
    const tm = await tagMap("task_tags", "task_id", list.map((t) => t.id));
    list = list.filter((t) => allowed(tm.get(t.id) ?? []));
    const tIds = list.map((t) => t.id);
    const [{ data: proofs }, { data: collabs }] = await Promise.all([
      tIds.length ? db.from("task_completion_proofs").select("task_id, proof_url, proof_type, caption").in("task_id", tIds) : Promise.resolve({ data: [] as Row[] }),
      tIds.length ? db.from("task_collaborators").select("task_id, user_id").in("task_id", tIds).eq("approval_status", "approved") : Promise.resolve({ data: [] as Row[] }),
    ]);
    for (const t of list) {
      const pr: PortfolioProof[] = (proofs ?? []).filter((x: Row) => x.task_id === t.id).map((x: Row) => ({ url: x.proof_url, type: x.proof_type, caption: x.caption }));
      if (!pr.length && t.completion_proof_url) pr.push({ url: t.completion_proof_url, type: t.completion_proof_type ?? "image", caption: null });
      const people = (collabs ?? []).filter((c: Row) => c.task_id === t.id).map((c: Row) => c.user_id);
      const item: PortfolioItem = { id: t.id, kind: "task", title: t.title, description: plain(t.description), image: t.image_url, date: t.updated_at, subtype: t.task_subtype, label: t.task_type, proofs: pr, creator: null, people: [] };
      items.push(item);
      [t.created_by, ...people].forEach((u) => userIds.add(u));
      pendingPeople.push({ item, creator: t.created_by, people });
    }
  }

  // Products
  if (p.include_products) {
    let q = db.from("products").select("id, title, description, image_url, created_at, product_type, status, created_by")
      .gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }).limit(200);
    if (p.scope === "mine") {
      const { data: part } = await db.from("product_participants").select("product_id").eq("user_id", owner);
      const ids = [...new Set((part ?? []).map((r: Row) => r.product_id))];
      q = q.or(`created_by.eq.${owner}${ids.length ? `,id.in.(${ids.join(",")})` : ""}`);
    }
    const { data: prods } = await q;
    let list = (prods ?? []) as Row[];
    const tm = await tagMap("product_tags", "product_id", list.map((x) => x.id));
    list = list.filter((x) => allowed(tm.get(x.id) ?? []));
    const pIds = list.map((x) => x.id);
    const { data: parts } = pIds.length ? await db.from("product_participants").select("product_id, user_id, delivery_proof_url, delivery_proof_type").in("product_id", pIds) : { data: [] as Row[] };
    for (const x of list) {
      const ps = (parts ?? []).filter((r: Row) => r.product_id === x.id);
      const item: PortfolioItem = { id: x.id, kind: "product", title: x.title, description: plain(x.description), image: x.image_url, date: x.created_at, subtype: x.product_type, label: x.status, proofs: ps.filter((r: Row) => r.delivery_proof_url).map((r: Row) => ({ url: r.delivery_proof_url, type: r.delivery_proof_type ?? "image", caption: null })), creator: null, people: [] };
      items.push(item);
      const people = ps.map((r: Row) => r.user_id);
      [x.created_by, ...people].forEach((u) => userIds.add(u));
      pendingPeople.push({ item, creator: x.created_by, people });
    }
  }

  // Polls (opinions / forums)
  if (p.include_polls) {
    let q = db.from("polls").select("id, title, description, image_url, created_at, opinions_only, status, created_by")
      .gte("created_at", start).lte("created_at", end).order("created_at", { ascending: false }).limit(200);
    if (p.scope === "mine") {
      const { data: votes } = await db.from("poll_votes").select("poll_id").eq("user_id", owner);
      const ids = [...new Set((votes ?? []).map((r: Row) => r.poll_id))];
      q = q.or(`created_by.eq.${owner}${ids.length ? `,id.in.(${ids.join(",")})` : ""}`);
    }
    const { data: polls } = await q;
    let list = (polls ?? []) as Row[];
    const tm = await tagMap("poll_tags", "poll_id", list.map((x) => x.id));
    list = list.filter((x) => allowed(tm.get(x.id) ?? []));
    for (const x of list) {
      const item: PortfolioItem = { id: x.id, kind: "poll", title: x.title, description: plain(x.description), image: x.image_url, date: x.created_at, subtype: x.opinions_only ? "forum" : "poll", label: x.status, proofs: [], creator: null, people: [] };
      items.push(item);
      userIds.add(x.created_by);
      pendingPeople.push({ item, creator: x.created_by, people: [] });
    }
  }

  // Testimonials: ratings with comments received by owner
  const { data: ratings } = await db.from("task_ratings").select("rating, comment, rater_user_id, created_at")
    .eq("rated_user_id", owner).gte("rating", 4).not("comment", "is", null).gte("created_at", start).lte("created_at", end)
    .order("created_at", { ascending: false }).limit(12);
  (ratings ?? []).forEach((r: Row) => userIds.add(r.rater_user_id));

  const { data: profs } = await db.from("profiles").select("id, full_name, avatar_url, username").in("id", [...userIds]);
  const pm = new Map<string, PortfolioPerson>();
  (profs ?? []).forEach((r: Row) => pm.set(r.id, { id: r.id, name: r.full_name || r.username || "Membro", avatar: r.avatar_url, username: r.username }));
  for (const pp of pendingPeople) {
    pp.item.creator = pm.get(pp.creator) ?? null;
    pp.item.people = [...new Set(pp.people)].filter((u) => u !== pp.creator).map((u) => pm.get(u)).filter(Boolean) as PortfolioPerson[];
  }
  items.sort((a, b) => b.date.localeCompare(a.date));

  let tag: PublicPortfolio["tag"] = null;
  if (p.tag_id) {
    const [{ data: t }, { data: cs }] = await Promise.all([
      db.from("tags").select("id, name, category").eq("id", p.tag_id).maybeSingle(),
      db.from("community_settings").select("logo_url, logo_emoji, header_image_url").eq("tag_id", p.tag_id).maybeSingle(),
    ]);
    if (t) tag = { id: t.id, name: t.name, category: t.category, logo: cs?.logo_url ?? null, emoji: cs?.logo_emoji ?? null, cover: cs?.header_image_url ?? null };
  }

  const people = new Set<string>();
  items.forEach((i) => { if (i.creator) people.add(i.creator.id); i.people.forEach((x) => people.add(x.id)); });
  const imageProof = items.flatMap((i) => i.proofs).find((x) => x.type?.startsWith("image") && /^https?:/.test(x.url));
  const cover = imageProof?.url ?? items.find((i) => i.image && /^https?:/.test(i.image))?.image ?? tag?.cover ?? null;

  return {
    found: true, id: p.id, slug: p.slug, title: p.title, summary: p.summary,
    periodStart: p.period_start, periodEnd: p.period_end, owner: pm.get(owner) ?? null, tag, items,
    testimonials: (ratings ?? []).map((r: Row) => ({ rating: r.rating, comment: r.comment, author: pm.get(r.rater_user_id) ?? null, date: r.created_at })),
    metrics: {
      tasks: items.filter((i) => i.kind === "task").length,
      products: items.filter((i) => i.kind === "product").length,
      polls: items.filter((i) => i.kind === "poll").length,
      people: people.size,
      proofs: items.reduce((n, i) => n + i.proofs.length, 0),
    },
    cover, views: p.view_count ?? 0,
  };
}
