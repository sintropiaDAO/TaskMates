/**
 * Ported from supabase/functions/delete-user (edge function).
 * Admin-only: deletes a user and all related data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminClient, requireUserId, UUID_RE } from "@/lib/supabase-server";

const InputSchema = z.object({
  userId: z.string().regex(UUID_RE),
});

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { userId: requesterId } = await requireUserId();
    const supabaseAdmin = adminClient();

    // Verify requester is admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      throw new Error("Only admins can delete users");
    }

    const { userId } = data;

    if (userId === requesterId) {
      throw new Error("You cannot delete your own account");
    }

    console.log(`Starting deletion process for user: ${userId}`);

    // Clear foreign key references before deleting the user
    const { error: tagsError } = await supabaseAdmin
      .from("tags")
      .update({ created_by: null })
      .eq("created_by", userId);
    if (tagsError) console.error("Error clearing tags created_by:", tagsError);

    const { error: userTagsError } = await supabaseAdmin
      .from("user_tags")
      .delete()
      .eq("user_id", userId);
    if (userTagsError) console.error("Error deleting user_tags:", userTagsError);

    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (rolesError) console.error("Error deleting user_roles:", rolesError);

    await supabaseAdmin.from("follows").delete().eq("follower_id", userId);
    await supabaseAdmin.from("follows").delete().eq("following_id", userId);
    await supabaseAdmin.from("notifications").delete().eq("user_id", userId);
    await supabaseAdmin.from("notification_preferences").delete().eq("user_id", userId);
    await supabaseAdmin.from("task_comments").delete().eq("user_id", userId);
    await supabaseAdmin.from("task_votes").delete().eq("user_id", userId);
    await supabaseAdmin.from("task_likes").delete().eq("user_id", userId);
    await supabaseAdmin.from("task_feedback").delete().eq("user_id", userId);
    await supabaseAdmin.from("task_ratings").delete().eq("rater_user_id", userId);
    await supabaseAdmin.from("task_ratings").delete().eq("rated_user_id", userId);
    await supabaseAdmin.from("task_collaborators").delete().eq("user_id", userId);
    await supabaseAdmin.from("testimonials").delete().eq("author_user_id", userId);
    await supabaseAdmin.from("testimonials").delete().eq("profile_user_id", userId);

    const { data: userTasks } = await supabaseAdmin
      .from("tasks")
      .select("id")
      .eq("created_by", userId);

    if (userTasks && userTasks.length > 0) {
      const taskIds = userTasks.map((t: { id: string }) => t.id);
      await supabaseAdmin.from("task_tags").delete().in("task_id", taskIds);
      await supabaseAdmin.from("task_collaborators").delete().in("task_id", taskIds);
      await supabaseAdmin.from("task_comments").delete().in("task_id", taskIds);
      await supabaseAdmin.from("task_votes").delete().in("task_id", taskIds);
      await supabaseAdmin.from("task_likes").delete().in("task_id", taskIds);
      await supabaseAdmin.from("task_feedback").delete().in("task_id", taskIds);
      await supabaseAdmin.from("task_ratings").delete().in("task_id", taskIds);
    }

    await supabaseAdmin.from("tasks").delete().eq("created_by", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    console.log(`Finished cleaning up related data for user: ${userId}`);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting user from auth:", deleteError);
      throw new Error(deleteError.message);
    }

    console.log(`Successfully deleted user: ${userId}`);
    return { success: true };
  });
