import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all polls with status 'active' and deadline in the past
    const now = new Date().toISOString();

    const { data: expiredPolls, error: fetchError } = await supabase
      .from("polls")
      .select("id, title, created_by")
      .eq("status", "active")
      .not("deadline", "is", null)
      .lt("deadline", now);

    if (fetchError) {
      console.error("Error fetching expired polls:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredPolls || expiredPolls.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired polls found", closedCount: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pollIds = expiredPolls.map((p) => p.id);

    // Update status to 'closed'
    const { error: updateError } = await supabase
      .from("polls")
      .update({ status: "closed", updated_at: now })
      .in("id", pollIds);

    if (updateError) {
      console.error("Error updating polls:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create notifications for poll owners
    for (const poll of expiredPolls) {
      await supabase.from("notifications").insert({
        user_id: poll.created_by,
        type: "poll_closed",
        message: `🗳️ Sua enquete "${poll.title}" foi encerrada automaticamente.`,
      });
    }

    console.log(`Closed ${pollIds.length} expired polls`);

    return new Response(
      JSON.stringify({ 
        message: "Expired polls closed successfully", 
        closedCount: pollIds.length,
        pollIds 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
