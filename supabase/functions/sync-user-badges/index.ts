// Edge function: sync user badges
// Caller (authenticated user) sends computed badges; server validates JWT and writes via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IncomingBadge {
  category: string;
  entity_id: string | null;
  entity_name: string | null;
  metric_value: number;
  level: number;
}

const VALID_CATEGORIES = new Set([
  'taskmates','habits','communities','leadership','collaboration',
  'positive_impact','sociability','reliability','consistency','proactivity'
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const incoming: IncomingBadge[] = Array.isArray(body?.badges) ? body.badges : [];
    if (incoming.length > 200) return json({ error: "Too many badges" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Fetch existing badges
    const { data: existing } = await admin
      .from("user_badges")
      .select("*")
      .eq("user_id", uid);

    let writes = 0;
    for (const b of incoming) {
      if (!VALID_CATEGORIES.has(b.category)) continue;
      const level = Number(b.level);
      const metric = Number(b.metric_value);
      if (!Number.isFinite(level) || level < 1 || level > 12) continue;
      if (!Number.isFinite(metric) || metric < 0 || metric > 100_000_000) continue;

      const prior = existing?.find(
        (x: any) => x.category === b.category && x.entity_id === (b.entity_id ?? null)
      );

      if (!prior) {
        await admin.from("user_badges").insert({
          user_id: uid,
          category: b.category,
          level,
          entity_id: b.entity_id,
          entity_name: b.entity_name,
          metric_value: metric,
          earned_at: new Date().toISOString(),
          notified: false,
        });
        writes++;
      } else if (level > prior.level || metric > prior.metric_value) {
        const leveledUp = level > prior.level;
        await admin.from("user_badges").update({
          level,
          metric_value: metric,
          entity_name: b.entity_name,
          earned_at: leveledUp ? new Date().toISOString() : prior.earned_at,
          notified: leveledUp ? false : prior.notified,
        }).eq("id", prior.id);
        writes++;
      }
    }

    // Optional: mark notified
    const notifyIds: string[] = Array.isArray(body?.markNotified) ? body.markNotified.slice(0, 100) : [];
    if (notifyIds.length) {
      await admin.from("user_badges").update({ notified: true })
        .in("id", notifyIds).eq("user_id", uid);
    }

    return json({ ok: true, writes });
  } catch (e) {
    console.error("sync-user-badges error", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
