/**
 * Ported from supabase/functions/roll-lucky-star (edge function).
 * Server-side Lucky Star roll after task completion — idempotent per task+user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminClient, requireUserId, UUID_RE } from "@/lib/supabase-server";

// Probability constants
const P_OTHER = 0.02286; // ~1 - 0.5^(1/30)
const P_GOOD = 0.04572; // P_OTHER * 2
const GOOD_THRESHOLD = 4; // need >= 4 out of 5 recent ratings to be 5 stars
const RECENT_WINDOW_DAYS = 30;
const MIN_RECENT_RATINGS = 5;

const InputSchema = z.object({
  taskId: z.string().regex(UUID_RE),
});

export const rollLuckyStar = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { userId } = await requireUserId();
    const { taskId } = data;

    const supabase = adminClient();

    // Verify task exists, is completed, and caller actually participated
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("id, created_by, status")
      .eq("id", taskId)
      .maybeSingle();

    if (taskErr || !task) throw new Error("Task not found");
    const taskRow = task as { id: string; created_by: string; status: string };
    if (taskRow.status !== "completed") throw new Error("Task not completed");

    let participated = taskRow.created_by === userId;
    if (!participated) {
      const { data: collab } = await supabase
        .from("task_collaborators")
        .select("id")
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .eq("approval_status", "approved")
        .maybeSingle();
      participated = !!collab;
    }

    if (!participated) throw new Error("Not a participant of this task");

    // Check idempotency - already rolled for this task?
    const rollEventId = `LUCKY_STAR_ROLL_${taskId}_${userId}`;
    const { data: existing } = await supabase
      .from("coin_ledger")
      .select("id")
      .eq("event_id", rollEventId)
      .maybeSingle();

    if (existing) {
      return { won: false, already_rolled: true };
    }

    // Determine if user has "good" rating profile
    const cutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [taskRatingsRes, productRatingsRes] = await Promise.all([
      supabase
        .from("task_ratings")
        .select("rating, created_at")
        .eq("rated_user_id", userId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("product_ratings")
        .select("rating, created_at")
        .eq("rated_user_id", userId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    type RatingRow = { rating: number; created_at: string };
    const allRatings = ([
      ...((taskRatingsRes.data as RatingRow[] | null) || []),
      ...((productRatingsRes.data as RatingRow[] | null) || []),
    ])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    let isGood = false;
    if (allRatings.length >= MIN_RECENT_RATINGS) {
      const fiveStarCount = allRatings.filter((r) => r.rating === 5).length;
      isGood = fiveStarCount >= GOOD_THRESHOLD;
    }

    const probability = isGood ? P_GOOD : P_OTHER;

    // Server-side random roll
    const rollArray = new Uint32Array(1);
    crypto.getRandomValues(rollArray);
    const rollValue = rollArray[0] / (0xffffffff + 1); // [0, 1)
    const won = rollValue < probability;

    const meta = {
      task_id: taskId,
      is_good: isGood,
      probability,
      roll_value: rollValue,
      ratings_count: allRatings.length,
      five_star_count: allRatings.filter((r) => r.rating === 5).length,
    };

    if (won) {
      await supabase.from("coin_ledger").insert({
        event_id: rollEventId,
        event_type: "LUCKY_STAR",
        currency_key: "LUCKY_STARS",
        subject_user_id: userId,
        amount: 1,
        meta,
      });
    } else {
      await supabase.from("coin_ledger").insert({
        event_id: rollEventId,
        event_type: "LUCKY_STAR_MISS",
        currency_key: "LUCKY_STARS",
        subject_user_id: userId,
        amount: 0,
        meta,
      });
    }

    return { won, meta };
  });
