/**
 * Ported from supabase/functions/send-notification-email (edge function).
 * Server-only core — called by create-notification's server function.
 * The old edge function was gated to service-role callers only, so it is
 * intentionally NOT exposed as a client-callable server function.
 */
import { adminClient } from "@/lib/supabase-server";

export interface NotificationEmailPayload {
  user_id: string;
  notification_type: string;
  message: string;
  task_id?: string | null;
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const getEmailSubject = (type: string): string => {
  switch (type) {
    case "new_follower":
      return "Novo seguidor no TaskMates";
    case "collaboration":
    case "collaboration_request":
      return "Nova solicitação de colaboração";
    case "comment":
      return "Novo comentário em sua tarefa";
    case "task_completed":
      return "Tarefa concluída";
    case "new_task":
      return "Nova tarefa de alguém que você segue";
    case "new_rating":
      return "Você recebeu uma nova avaliação";
    case "new_message":
      return "Nova mensagem no TaskMates";
    default:
      return "Nova notificação - TaskMates";
  }
};

const getEmailTemplate = (type: string, message: string): string => {
  const iconColor =
    type === "new_follower" ? "#3b82f6" :
    type === "collaboration" ? "#8b5cf6" :
    type === "task_completed" ? "#10b981" :
    type === "new_rating" ? "#eab308" :
    type === "new_message" ? "#6366f1" : "#f97316";

  const safeMessage = escapeHtml(message);

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
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TaskMates</h1>
        </div>
        <div style="padding: 32px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            ${safeMessage}
          </p>
          <a href="https://taskmates.app/dashboard"
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

/**
 * Sends the notification email if the target user's preferences allow it.
 * Best-effort: returns a status object, never throws for skips.
 */
export async function sendNotificationEmailCore(
  payload: NotificationEmailPayload,
): Promise<{ success?: boolean; skipped?: boolean; reason?: string }> {
  const user_id = String(payload.user_id ?? "");
  const notification_type = String(payload.notification_type ?? "");
  const message = String(payload.message ?? "");

  if (!user_id || !notification_type || !message) {
    return { skipped: true, reason: "missing_fields" };
  }
  if (message.length > 2000 || notification_type.length > 64) {
    return { skipped: true, reason: "invalid_lengths" };
  }

  const supabaseClient = adminClient();

  const { data: preferences, error: prefError } = await supabaseClient
    .from("notification_preferences")
    .select("email_enabled, email_address, email_types")
    .eq("user_id", user_id)
    .single();

  if (prefError && prefError.code !== "PGRST116") {
    console.error("Error fetching preferences:", prefError);
    throw prefError;
  }

  const emailEnabled = preferences ? preferences.email_enabled : true;
  if (!emailEnabled) {
    return { skipped: true, reason: "email_disabled" };
  }

  const emailTypes = (preferences as { email_types?: Record<string, boolean> } | null)?.email_types ?? {};
  if (Object.prototype.hasOwnProperty.call(emailTypes, notification_type) && emailTypes[notification_type] === false) {
    return { skipped: true, reason: "type_disabled" };
  }

  let userEmail = (preferences as { email_address?: string } | null)?.email_address;
  if (!userEmail) {
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(user_id);
    if (authError || !authUser?.user?.email) {
      return { skipped: true, reason: "no_email" };
    }
    userEmail = authUser.user.email;
  }

  const resendKey = process.env['RESEND_API_KEY'];
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured");
    return { skipped: true, reason: "no_api_key" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "TaskMates <noreply@taskmates.top>",
      to: [userEmail],
      subject: getEmailSubject(notification_type),
      html: getEmailTemplate(notification_type, message),
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text().catch(() => ""));
    return { skipped: true, reason: "send_failed" };
  }

  return { success: true };
}
