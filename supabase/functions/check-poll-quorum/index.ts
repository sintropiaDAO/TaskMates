import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find active polls with quorum, deadline within 24h, and quorum not yet met
    const { data: polls, error: pollsError } = await supabase
      .from("polls")
      .select("id, title, deadline, min_quorum, created_by")
      .eq("status", "active")
      .not("min_quorum", "is", null)
      .not("deadline", "is", null)
      .gt("min_quorum", 0)
      .lte("deadline", in24h.toISOString())
      .gt("deadline", now.toISOString());

    if (pollsError || !polls || polls.length === 0) {
      return new Response(
        JSON.stringify({ message: "No polls need quorum notifications", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsSent = 0;

    for (const poll of polls) {
      // Count current votes
      const { count: voteCount } = await supabase
        .from("poll_votes")
        .select("*", { count: "exact", head: true })
        .eq("poll_id", poll.id);

      const currentVotes = voteCount || 0;

      // Skip if quorum is already met
      if (currentVotes >= poll.min_quorum) continue;

      // Get the poll's tags
      const { data: pollTags } = await supabase
        .from("poll_tags")
        .select("tag_id")
        .eq("poll_id", poll.id);

      if (!pollTags || pollTags.length === 0) continue;

      const tagIds = pollTags.map((pt: any) => pt.tag_id);

      // Find users who follow these tags (via user_tags)
      const { data: userTags } = await supabase
        .from("user_tags")
        .select("user_id")
        .in("tag_id", tagIds);

      if (!userTags || userTags.length === 0) continue;

      // Unique users, excluding poll creator and those who already voted
      const { data: existingVoters } = await supabase
        .from("poll_votes")
        .select("user_id")
        .eq("poll_id", poll.id);

      const voterIds = new Set((existingVoters || []).map((v: any) => v.user_id));
      const uniqueUserIds = [
        ...new Set(userTags.map((ut: any) => ut.user_id)),
      ].filter((uid) => uid !== poll.created_by && !voterIds.has(uid));

      if (uniqueUserIds.length === 0) continue;

      // Check if we already sent quorum notifications for this poll today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: existingNotifications } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("type", "poll_quorum")
        .eq("task_id", poll.id)
        .gte("created_at", todayStart.toISOString());

      if (existingNotifications && existingNotifications > 0) continue;

      // Send notifications to eligible users
      const remaining = poll.min_quorum - currentVotes;
      const notifications = uniqueUserIds.map((userId: string) => ({
        user_id: userId,
        task_id: poll.id,
        type: "poll_quorum",
        message: `📊 A enquete "${poll.title}" precisa de mais ${remaining} voto(s) para atingir o quórum mínimo. O prazo termina em breve!`,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (!insertError) {
        notificationsSent += notifications.length;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Quorum check completed",
        processed: polls.length,
        notificationsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
