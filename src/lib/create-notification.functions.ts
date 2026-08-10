/**
 * Ported from supabase/functions/create-notification (edge function).
 * Creates a notification for a target user after validating that the
 * authenticated caller has a relationship with them, then triggers the
 * email delivery (best-effort) server-side.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, requireUserId, UUID_RE } from "@/lib/supabase-server";
import { sendNotificationEmailCore } from "@/lib/send-notification-email.server";

// Notification types that authenticated clients are allowed to trigger.
const CLIENT_ALLOWED_TYPES = new Set([
  "new_message",
  "new_follower",
  "collaboration_request",
  "collaboration_approved",
  "collaboration_rejected",
  "completion_pending",
  "rate_request",
  "task_completed",
  "help_request",
]);

const InputSchema = z.object({
  user_id: z.string().regex(UUID_RE),
  type: z.string().min(1).max(64),
  message: z.string().min(1).max(1000),
  task_id: z.string().regex(UUID_RE).nullish(),
});

async function callerHasRelationship(
  admin: SupabaseClient,
  callerId: string,
  targetId: string,
  taskId: string | null,
): Promise<boolean> {
  if (callerId === targetId) return true;

  // 1. Direct follow either direction
  const { data: follow } = await admin
    .from("follows")
    .select("id")
    .or(`and(follower_id.eq.${callerId},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${callerId})`)
    .limit(1)
    .maybeSingle();
  if (follow) return true;

  // 2. Share a conversation
  const { data: callerConvs } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", callerId);
  const callerConvIds = (callerConvs || []).map((r: { conversation_id: string }) => r.conversation_id);
  if (callerConvIds.length > 0) {
    const { data: shared } = await admin
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", targetId)
      .in("conversation_id", callerConvIds)
      .limit(1)
      .maybeSingle();
    if (shared) return true;
  }

  // 3. Related through a task (creator <-> collaborator)
  if (taskId && UUID_RE.test(taskId)) {
    const { data: task } = await admin
      .from("tasks")
      .select("created_by")
      .eq("id", taskId)
      .maybeSingle();
    if (task) {
      const owner = (task as { created_by: string }).created_by;
      const otherSide = callerId === owner ? targetId : targetId === owner ? callerId : null;
      if (otherSide) {
        const { data: collab } = await admin
          .from("task_collaborators")
          .select("id")
          .eq("task_id", taskId)
          .eq("user_id", otherSide)
          .limit(1)
          .maybeSingle();
        if (collab) return true;
      }
    }
  }

  return false;
}

export const createNotification = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { userId: callerId } = await requireUserId();
    const { user_id, type, message, task_id } = data;

    if (!CLIENT_ALLOWED_TYPES.has(type)) {
      throw new Error("Forbidden notification type");
    }

    const admin = adminClient();

    const allowed = await callerHasRelationship(admin, callerId, user_id, task_id ?? null);
    if (!allowed) {
      throw new Error("Forbidden: no relationship with target user");
    }

    const { data: notification, error } = await admin
      .from("notifications")
      .insert({
        user_id,
        type,
        message,
        task_id: task_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      throw new Error("Failed to create notification");
    }

    // Trigger email best-effort (do not block or fail the notification)
    try {
      await sendNotificationEmailCore({
        user_id,
        notification_type: type,
        message,
        task_id: task_id ?? null,
      });
    } catch (emailError) {
      console.error("Email trigger error:", emailError);
    }

    return { success: true, notification };
  });
