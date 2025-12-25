import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  user_id: string;
  notification_type: string;
  message: string;
  task_id?: string;
}

const getEmailSubject = (type: string): string => {
  switch (type) {
    case 'new_follower':
      return 'Novo seguidor no SintropiaDAO';
    case 'collaboration':
    case 'collaboration_request':
      return 'Nova solicitação de colaboração';
    case 'comment':
      return 'Novo comentário em sua tarefa';
    case 'task_completed':
      return 'Tarefa concluída';
    case 'new_task':
      return 'Nova tarefa de alguém que você segue';
    case 'new_rating':
      return 'Você recebeu uma nova avaliação';
    default:
      return 'Nova notificação - SintropiaDAO';
  }
};

const getEmailTemplate = (type: string, message: string): string => {
  const iconColor = type === 'new_follower' ? '#3b82f6' : 
                    type === 'collaboration' ? '#8b5cf6' : 
                    type === 'task_completed' ? '#10b981' : 
                    type === 'new_rating' ? '#eab308' : '#f97316';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, ${iconColor}, ${iconColor}dd); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SintropiaDAO</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            ${message}
          </p>
          <a href="https://817f735e-5ea5-40e9-86fd-3a3b006e508f.lovableproject.com/dashboard" 
             style="display: inline-block; background-color: ${iconColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ver no aplicativo
          </a>
        </div>
        <div style="padding: 16px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
            Você recebeu este email porque tem as notificações por email ativadas.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, notification_type, message, task_id }: NotificationEmailRequest = await req.json();
    console.log("Processing notification email for user:", user_id);

    // Check user's notification preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from("notification_preferences")
      .select("email_enabled, email_address")
      .eq("user_id", user_id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    // If no preferences exist or email is disabled, skip
    if (!preferences?.email_enabled) {
      console.log("Email notifications disabled for user");
      return new Response(JSON.stringify({ skipped: true, reason: "email_disabled" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user's email from auth or preferences
    let userEmail = preferences?.email_address;
    
    if (!userEmail) {
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(user_id);
      if (authError || !authUser?.user?.email) {
        console.error("Could not get user email:", authError);
        return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      userEmail = authUser.user.email;
    }

    console.log("Sending email to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "SintropiaDAO <noreply@taskmates.top>",
      to: [userEmail],
      subject: getEmailSubject(notification_type),
      html: getEmailTemplate(notification_type, message),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
