import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  type: string;
  message: string;
  task_id?: string;
}

// Notification types that authenticated clients are allowed to trigger.
// Anything not in this list must be created server-side (service role) only.
const CLIENT_ALLOWED_TYPES = new Set([
  'new_message',
  'new_follower',
  'collaboration_request',
  'collaboration_approved',
  'collaboration_rejected',
  'completion_pending',
  'rate_request',
  'task_completed',
  'help_request',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function callerHasRelationship(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  targetId: string,
  taskId: string | null
): Promise<boolean> {
  if (callerId === targetId) return true;

  // 1. Direct follow either direction
  const { data: follow } = await admin
    .from('follows')
    .select('id')
    .or(`and(follower_id.eq.${callerId},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${callerId})`)
    .limit(1)
    .maybeSingle();
  if (follow) return true;

  // 2. Share a conversation
  const { data: callerConvs } = await admin
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', callerId);
  const callerConvIds = (callerConvs || []).map((r: any) => r.conversation_id);
  if (callerConvIds.length > 0) {
    const { data: shared } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', targetId)
      .in('conversation_id', callerConvIds)
      .limit(1)
      .maybeSingle();
    if (shared) return true;
  }

  // 3. Related through a task (creator <-> collaborator)
  if (taskId && UUID_RE.test(taskId)) {
    const { data: task } = await admin
      .from('tasks')
      .select('created_by')
      .eq('id', taskId)
      .maybeSingle();
    if (task) {
      const owner = (task as any).created_by as string;
      const otherSide = callerId === owner ? targetId : (targetId === owner ? callerId : null);
      if (otherSide) {
        const { data: collab } = await admin
          .from('task_collaborators')
          .select('id')
          .eq('task_id', taskId)
          .eq('user_id', otherSide)
          .limit(1)
          .maybeSingle();
        if (collab) return true;
      }
    }
  }

  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Allow internal service-role callers to bypass relationship checks.
    let isServiceRole = token === supabaseServiceKey;
    let callerId: string | null = null;

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      callerId = claimsData.claims.sub as string;
    }

    const body = (await req.json()) as NotificationRequest;
    const { user_id, type, message, task_id } = body || ({} as NotificationRequest);

    if (!user_id || !type || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      typeof user_id !== 'string' || !UUID_RE.test(user_id) ||
      typeof type !== 'string' || type.length === 0 || type.length > 64 ||
      typeof message !== 'string' || message.length === 0 || message.length > 1000 ||
      (task_id !== undefined && task_id !== null && (typeof task_id !== 'string' || !UUID_RE.test(task_id)))
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    if (!isServiceRole && callerId) {
      // Restrict client-callable notification types
      if (!CLIENT_ALLOWED_TYPES.has(type)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden notification type' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Caller must have a relationship with the target user
      const allowed = await callerHasRelationship(admin, callerId, user_id, task_id ?? null);
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: no relationship with target user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_id,
        type,
        message,
        task_id: task_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger email in background using service role
    try {
      const emailUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
      fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ user_id, notification_type: type, message, task_id }),
      }).catch((err) => console.error('Email trigger error:', err));
    } catch (emailError) {
      console.error('Email setup error:', emailError);
    }

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
