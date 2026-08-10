/**
 * Ported from supabase/functions/sync-user-badges (edge function).
 * All metric computation happens server-side using the service role.
 * The client can only trigger a recompute and (optionally) mark a
 * notification as seen.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, requireUserId } from "@/lib/supabase-server";

type BadgeCategory =
  | "taskmates" | "habits" | "communities" | "leadership" | "collaboration"
  | "positive_impact" | "sociability" | "reliability" | "consistency" | "proactivity";

const LEVEL_THRESHOLDS = [10, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 500000, 1000000];

function getLevelForMetric(value: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (value >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 0;
}

interface ComputedBadge {
  category: BadgeCategory;
  entity_id: string | null;
  entity_name: string | null;
  metric_value: number;
  level: number;
}

const InputSchema = z.object({
  markNotified: z.array(z.string()).max(100).optional(),
  skipCompute: z.boolean().optional(),
});

export const syncUserBadges = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { userId: uid } = await requireUserId();
    const admin = adminClient();

    const notifyIds = data.markNotified ?? [];
    if (notifyIds.length) {
      await admin.from("user_badges").update({ notified: true })
        .in("id", notifyIds).eq("user_id", uid);
    }

    if (data.skipCompute === true) {
      return { ok: true, writes: 0 };
    }

    const computed = await computeBadgesForUser(admin, uid);

    const { data: existing } = await admin
      .from("user_badges")
      .select("*")
      .eq("user_id", uid);

    type BadgeRow = {
      id: string;
      category: string;
      entity_id: string | null;
      level: number;
      metric_value: number;
      earned_at: string;
      notified: boolean;
    };

    let writes = 0;
    for (const b of computed) {
      if (b.level < 1) continue;

      const prior = (existing as BadgeRow[] | null)?.find(
        (x) => x.category === b.category && x.entity_id === (b.entity_id ?? null),
      );

      if (!prior) {
        await admin.from("user_badges").insert({
          user_id: uid,
          category: b.category,
          level: b.level,
          entity_id: b.entity_id,
          entity_name: b.entity_name,
          metric_value: b.metric_value,
          earned_at: new Date().toISOString(),
          notified: false,
        });
        writes++;
      } else if (b.level > prior.level || b.metric_value > prior.metric_value) {
        const leveledUp = b.level > prior.level;
        await admin.from("user_badges").update({
          level: b.level,
          metric_value: b.metric_value,
          entity_name: b.entity_name,
          earned_at: leveledUp ? new Date().toISOString() : prior.earned_at,
          notified: leveledUp ? false : prior.notified,
        }).eq("id", prior.id);
        writes++;
      }
    }

    return { ok: true, writes };
  });

/* eslint-disable @typescript-eslint/no-explicit-any */
async function computeBadgesForUser(admin: SupabaseClient, uid: string): Promise<ComputedBadge[]> {
  const out: ComputedBadge[] = [];

  // ---- 1. TASKMATES (shared completed tasks per other user) ----
  const { data: myTasks } = await admin.from("tasks").select("id").eq("created_by", uid);
  const myTaskIds: string[] = (myTasks ?? []).map((t: any) => t.id);

  const { data: allApprovedCollabs } = await admin
    .from("task_collaborators")
    .select("task_id, user_id, status, approval_status")
    .eq("approval_status", "approved");

  const { data: completedTasks } = await admin
    .from("tasks")
    .select("id, created_by")
    .eq("status", "completed");

  const completedTaskIds = new Set<string>((completedTasks ?? []).map((t: any) => t.id));

  const myInvolvedTaskIds = new Set<string>([
    ...myTaskIds.filter((id) => completedTaskIds.has(id)),
    ...((allApprovedCollabs ?? [])
      .filter((c: any) => c.user_id === uid && completedTaskIds.has(c.task_id))
      .map((c: any) => c.task_id)),
  ]);

  const teammateCount: Record<string, number> = {};
  for (const taskId of myInvolvedTaskIds) {
    const task = (completedTasks ?? []).find((t: any) => t.id === taskId);
    const involvedPeople = new Set<string>();
    if (task?.created_by && task.created_by !== uid) involvedPeople.add(task.created_by);
    (allApprovedCollabs ?? [])
      .filter((c: any) => c.task_id === taskId && c.user_id !== uid)
      .forEach((c: any) => involvedPeople.add(c.user_id));
    for (const personId of involvedPeople) {
      teammateCount[personId] = (teammateCount[personId] || 0) + 1;
    }
  }

  // ---- 2 & 3. HABITS / COMMUNITIES (per-tag completed counts) ----
  const { data: allTaskTags } = await admin.from("task_tags").select("task_id, tag_id");
  const { data: allTags } = await admin.from("tags").select("id, name, category");

  const tagCompletedCount: Record<string, number> = {};
  for (const taskId of myInvolvedTaskIds) {
    const taskTagIds = (allTaskTags ?? [])
      .filter((tt: any) => tt.task_id === taskId)
      .map((tt: any) => tt.tag_id);
    for (const tagId of taskTagIds) {
      tagCompletedCount[tagId] = (tagCompletedCount[tagId] || 0) + 1;
    }
  }

  // ---- 4. LEADERSHIP (max unique participants on a task I created) ----
  let leadershipValue = 0;
  for (const taskId of myTaskIds) {
    const uniqueParticipants = new Set(
      (allApprovedCollabs ?? [])
        .filter((c: any) => c.task_id === taskId && c.user_id !== uid)
        .map((c: any) => c.user_id),
    );
    if (uniqueParticipants.size > leadershipValue) leadershipValue = uniqueParticipants.size;
  }

  // ---- 5. COLLABORATION ----
  const collabCompletedCount = (allApprovedCollabs ?? []).filter(
    (c: any) => c.user_id === uid && c.status === "collaborator" && completedTaskIds.has(c.task_id),
  ).length;

  // ---- 6. POSITIVE IMPACT (max likes on a completed task I created) ----
  const { data: myCompletedCreatedTasks } = await admin
    .from("tasks")
    .select("id, likes")
    .eq("created_by", uid)
    .eq("status", "completed");

  const positiveImpactMax = Math.max(0, ...((myCompletedCreatedTasks ?? []).map((t: any) => t.likes || 0)));
  const positiveImpactTaskId = (myCompletedCreatedTasks ?? []).find((t: any) => (t.likes || 0) === positiveImpactMax)?.id ?? null;
  let positiveImpactTagId: string | null = null;
  if (positiveImpactTaskId) {
    const tt = (allTaskTags ?? []).find((tt: any) => tt.task_id === positiveImpactTaskId);
    positiveImpactTagId = tt?.tag_id ?? null;
  }

  // ---- 7. SOCIABILITY ----
  const { count: followerCount } = await admin
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", uid);

  // ---- 8. RELIABILITY (consecutive max ratings received) ----
  const { data: myRatings } = await admin
    .from("task_ratings")
    .select("rating, created_at")
    .eq("rated_user_id", uid)
    .order("created_at", { ascending: true });

  let maxConsecutive = 0;
  let currentStreak = 0;
  for (const r of myRatings ?? []) {
    if ((r as any).rating >= 5) {
      currentStreak++;
      if (currentStreak > maxConsecutive) maxConsecutive = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  // ---- 9. CONSISTENCY (max streak on any repeated task I own) ----
  const { data: myRepeatTasks } = await admin
    .from("tasks")
    .select("id, streak_count")
    .eq("created_by", uid)
    .not("repeat_type", "is", null);

  const consistencyMax = Math.max(0, ...((myRepeatTasks ?? []).map((t: any) => t.streak_count || 0)));
  const consistencyTaskId = (myRepeatTasks ?? []).find((t: any) => (t.streak_count || 0) === consistencyMax)?.id ?? null;
  let consistencyTagId: string | null = null;
  if (consistencyTaskId) {
    const tt = (allTaskTags ?? []).find((tt: any) => tt.task_id === consistencyTaskId);
    consistencyTagId = tt?.tag_id ?? null;
  }

  // ---- 10. PROACTIVITY (offer tasks I created, completed, with approved requesters) ----
  const { data: myOfferTasks } = await admin
    .from("tasks")
    .select("id")
    .eq("created_by", uid)
    .eq("task_type", "offer")
    .eq("status", "completed");

  let proactivityCount = 0;
  if (myOfferTasks && myOfferTasks.length > 0) {
    const offerTaskIds = myOfferTasks.map((t: any) => t.id);
    const { data: offerCollabs } = await admin
      .from("task_collaborators")
      .select("task_id")
      .in("task_id", offerTaskIds)
      .eq("status", "requester")
      .eq("approval_status", "approved");
    if (offerCollabs) {
      proactivityCount = new Set(offerCollabs.map((c: any) => c.task_id)).size;
    }
  }

  // ---- Resolve entity names & assemble output ----
  const teammateIds = Object.keys(teammateCount).filter((id) => teammateCount[id] >= 10);
  let profileNames: Record<string, string> = {};
  if (teammateIds.length > 0) {
    const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", teammateIds);
    profileNames = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || p.id]));
  }
  for (const personId of teammateIds) {
    const count = teammateCount[personId];
    out.push({
      category: "taskmates",
      entity_id: personId,
      entity_name: profileNames[personId] ?? personId,
      metric_value: count,
      level: getLevelForMetric(count),
    });
  }

  for (const [tagId, count] of Object.entries(tagCompletedCount)) {
    if (count < 10) continue;
    const tag = (allTags ?? []).find((t: any) => t.id === tagId);
    if (!tag) continue;
    const cat: BadgeCategory = (tag as any).category === "skills" ? "habits" : "communities";
    out.push({
      category: cat,
      entity_id: tagId,
      entity_name: (tag as any).name,
      metric_value: count,
      level: getLevelForMetric(count),
    });
  }

  if (leadershipValue >= 10) {
    out.push({ category: "leadership", entity_id: null, entity_name: null, metric_value: leadershipValue, level: getLevelForMetric(leadershipValue) });
  }
  if (collabCompletedCount >= 10) {
    out.push({ category: "collaboration", entity_id: null, entity_name: null, metric_value: collabCompletedCount, level: getLevelForMetric(collabCompletedCount) });
  }
  if (positiveImpactMax >= 10) {
    const tagName = (allTags ?? []).find((t: any) => t.id === positiveImpactTagId)?.name ?? null;
    out.push({ category: "positive_impact", entity_id: positiveImpactTagId, entity_name: tagName, metric_value: positiveImpactMax, level: getLevelForMetric(positiveImpactMax) });
  }
  if ((followerCount || 0) >= 10) {
    out.push({ category: "sociability", entity_id: null, entity_name: null, metric_value: followerCount || 0, level: getLevelForMetric(followerCount || 0) });
  }
  if (maxConsecutive >= 10) {
    out.push({ category: "reliability", entity_id: null, entity_name: null, metric_value: maxConsecutive, level: getLevelForMetric(maxConsecutive) });
  }
  if (consistencyMax >= 10) {
    const tagName = (allTags ?? []).find((t: any) => t.id === consistencyTagId)?.name ?? null;
    out.push({ category: "consistency", entity_id: consistencyTagId, entity_name: tagName, metric_value: consistencyMax, level: getLevelForMetric(consistencyMax) });
  }
  if (proactivityCount >= 10) {
    out.push({ category: "proactivity", entity_id: null, entity_name: null, metric_value: proactivityCount, level: getLevelForMetric(proactivityCount) });
  }

  return out;
}
