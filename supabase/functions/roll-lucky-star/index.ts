import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Probability constants
const P_OTHER = 0.02286; // ~1 - 0.5^(1/30)
const P_GOOD = 0.04572;  // P_OTHER * 2
const GOOD_THRESHOLD = 4; // need >= 4 out of 5 recent ratings to be 5 stars
const RECENT_WINDOW_DAYS = 30;
const MIN_RECENT_RATINGS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { taskId } = await req.json();
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create user client to get auth
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check idempotency - already rolled for this task?
    const rollEventId = `LUCKY_STAR_ROLL_${taskId}_${user.id}`;
    const { data: existing } = await supabase
      .from('coin_ledger')
      .select('id')
      .eq('event_id', rollEventId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ won: false, already_rolled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Determine if user has "good" rating profile
    const cutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    
    // Get recent ratings received by this user (from task_ratings AND product_ratings)
    const [taskRatingsRes, productRatingsRes] = await Promise.all([
      supabase
        .from('task_ratings')
        .select('rating, created_at')
        .eq('rated_user_id', user.id)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('product_ratings')
        .select('rating, created_at')
        .eq('rated_user_id', user.id)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    // Merge and take last 5
    const allRatings = [
      ...(taskRatingsRes.data || []),
      ...(productRatingsRes.data || []),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    let isGood = false;
    if (allRatings.length >= MIN_RECENT_RATINGS) {
      const fiveStarCount = allRatings.filter(r => r.rating === 5).length;
      isGood = fiveStarCount >= GOOD_THRESHOLD;
    }

    const probability = isGood ? P_GOOD : P_OTHER;

    // Server-side random roll
    const rollArray = new Uint32Array(1);
    crypto.getRandomValues(rollArray);
    const rollValue = rollArray[0] / (0xFFFFFFFF + 1); // [0, 1)
    const won = rollValue < probability;

    const meta = {
      task_id: taskId,
      is_good: isGood,
      probability,
      roll_value: rollValue,
      ratings_count: allRatings.length,
      five_star_count: allRatings.filter(r => r.rating === 5).length,
    };

    if (won) {
      // Record lucky star earned
      await supabase.from('coin_ledger').insert({
        event_id: rollEventId,
        event_type: 'LUCKY_STAR',
        currency_key: 'LUCKY_STARS',
        subject_user_id: user.id,
        amount: 1,
        meta,
      });
    } else {
      // Record the roll attempt (amount=0) for audit but don't add balance
      await supabase.from('coin_ledger').insert({
        event_id: rollEventId,
        event_type: 'LUCKY_STAR_MISS',
        currency_key: 'LUCKY_STARS',
        subject_user_id: user.id,
        amount: 0,
        meta,
      });
    }

    return new Response(JSON.stringify({ won, meta }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Roll lucky star error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
