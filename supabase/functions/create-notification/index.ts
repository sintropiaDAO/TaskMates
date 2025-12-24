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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, type, message, task_id }: NotificationRequest = await req.json();

    console.log('Creating notification:', { user_id, type, message, task_id });

    if (!user_id || !type || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, type, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
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
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Notification created successfully:', data);

    // Trigger email notification in the background
    try {
      const emailUrl = `${supabaseUrl}/functions/v1/send-notification-email`;
      console.log('Triggering email notification to:', emailUrl);
      
      fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          user_id,
          notification_type: type,
          message,
          task_id
        })
      }).then(res => {
        console.log('Email notification response:', res.status);
      }).catch(err => {
        console.error('Error triggering email notification:', err);
      });
    } catch (emailError) {
      console.error('Error setting up email notification:', emailError);
      // Don't fail the main request if email fails
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