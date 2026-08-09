import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const APP_ORIGIN = 'https://taskmates.app';
const DEFAULT_IMAGE = `${APP_ORIGIN}/og-default.jpg`;

const TABLES: Record<string, { table: string; join: string; fk: string; hasImage: boolean }> = {
  task: { table: 'tasks', join: 'task_tags', fk: 'task_id', hasImage: true },
  product: { table: 'products', join: 'product_tags', fk: 'product_id', hasImage: true },
  poll: { table: 'polls', join: 'poll_tags', fk: 'poll_id', hasImage: true },
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clean = (s: string | null | undefined, max = 180) => {
  const text = (s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

function html(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}" />
<link rel="canonical" href="${esc(opts.url)}" />
<meta property="og:site_name" content="TaskMates" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(opts.title)}" />
<meta property="og:description" content="${esc(opts.description)}" />
<meta property="og:url" content="${esc(opts.url)}" />
<meta property="og:image" content="${esc(opts.image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(opts.title)}" />
<meta name="twitter:description" content="${esc(opts.description)}" />
<meta name="twitter:image" content="${esc(opts.image)}" />
<meta http-equiv="refresh" content="0; url=${esc(opts.url)}" />
</head>
<body>
<p><a href="${esc(opts.url)}">${esc(opts.title)}</a></p>
<script>window.location.replace(${JSON.stringify(opts.url)});</script>
</body>
</html>`;
}

const absolute = (url: string | null | undefined) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${APP_ORIGIN}${url}`;
  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // supports /share-preview/:type/:id and ?type=&id=
  const type = (url.searchParams.get('type') || parts[parts.length - 2] || '').toLowerCase();
  const id = url.searchParams.get('id') || parts[parts.length - 1] || '';

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const validType = type === 'tag' || !!TABLES[type];

  const fallback = (target = APP_ORIGIN) =>
    new Response(
      html({
        title: 'TaskMates',
        description: 'Rede colaborativa regenerativa de tarefas, recursos e comunidades.',
        image: DEFAULT_IMAGE,
        url: target,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } },
    );

  if (!validType || !isUuid) return fallback();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (type === 'tag') {
      const target = `${APP_ORIGIN}/tags/${id}`;
      const [{ data: tag }, { data: settings }] = await Promise.all([
        supabase.from('tags').select('id, name, category').eq('id', id).maybeSingle(),
        supabase.from('community_settings').select('is_hidden, description, logo_url, header_image_url').eq('tag_id', id).maybeSingle(),
      ]);
      if (!tag || settings?.is_hidden) return fallback(target);
      const image = absolute(settings?.header_image_url) || absolute(settings?.logo_url) || DEFAULT_IMAGE;
      return new Response(
        html({
          title: `${tag.name} · TaskMates`,
          description: clean(settings?.description) || `Participe da comunidade ${tag.name} no TaskMates.`,
          image,
          url: target,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } },
      );
    }

    const cfg = TABLES[type];
    const target = `${APP_ORIGIN}/share/${type}/${id}`;
    const cols = cfg.hasImage ? 'id, title, description, image_url' : 'id, title, description';
    const { data: item } = await supabase.from(cfg.table).select(cols).eq('id', id).maybeSingle();
    if (!item) return fallback(target);

    // Privacy: hidden when every linked community tag belongs to a hidden community
    const { data: links } = await supabase.from(cfg.join).select('tag_id').eq(cfg.fk, id);
    const tagIds = (links || []).map((l: any) => l.tag_id);
    if (tagIds.length) {
      const { data: communityTags } = await supabase
        .from('tags')
        .select('id')
        .in('id', tagIds)
        .eq('category', 'communities');
      const communityIds = (communityTags || []).map((t: any) => t.id);
      if (communityIds.length) {
        const { data: hidden } = await supabase
          .from('community_settings')
          .select('tag_id')
          .in('tag_id', communityIds)
          .eq('is_hidden', true);
        const hiddenIds = new Set((hidden || []).map((h: any) => h.tag_id));
        const allHidden = communityIds.every((cid: string) => hiddenIds.has(cid));
        if (allHidden) return fallback(target);
      }
    }

    const label = type === 'task' ? 'Tarefa' : type === 'product' ? 'Recurso' : 'Opinião';
    return new Response(
      html({
        title: `${clean((item as any).title, 70) || label} · TaskMates`,
        description: clean((item as any).description) || `${label} compartilhada no TaskMates.`,
        image: absolute((item as any).image_url) || DEFAULT_IMAGE,
        url: target,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } },
    );
  } catch (_e) {
    return fallback();
  }
});
