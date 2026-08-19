/**
 * Server-only notification email sender.
 * Called by create-notification's server function.
 * Renders a TaskMates-branded email (logo + CapyVera + brand colors) in the
 * recipient's preferred language (profiles.preferred_language).
 */
import { adminClient } from "@/lib/supabase-server";

export interface NotificationEmailPayload {
  user_id: string;
  notification_type: string;
  message: string;
  task_id?: string | null;
}

type Lang = "pt" | "en";

const LOGO_URL = "https://taskmates.app/email-logo-taskmates.png";
const CAPY_URL = "https://taskmates.app/email-capyvera.png";
const APP_URL = "https://taskmates.app/dashboard";

const BRAND = {
  green: "#1a9d6c",
  ink: "#102e26",
  body: "#527568",
  muted: "#9ab5ab",
  border: "#d0e5dc",
  tint: "#f4faf7",
};

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COPY: Record<string, Record<Lang, { subject: string; heading: string }>> = {
  new_follower: {
    pt: { subject: "Novo seguidor no TaskMates", heading: "Você tem um novo seguidor 🌱" },
    en: { subject: "New follower on TaskMates", heading: "You have a new follower 🌱" },
  },
  collaboration: {
    pt: { subject: "Nova solicitação de colaboração", heading: "Nova colaboração 🤝" },
    en: { subject: "New collaboration request", heading: "New collaboration 🤝" },
  },
  collaboration_request: {
    pt: { subject: "Nova solicitação de colaboração", heading: "Nova solicitação de colaboração 🤝" },
    en: { subject: "New collaboration request", heading: "New collaboration request 🤝" },
  },
  collaboration_approved: {
    pt: { subject: "Solicitação aprovada", heading: "Sua solicitação foi aprovada ✅" },
    en: { subject: "Request approved", heading: "Your request was approved ✅" },
  },
  collaboration_rejected: {
    pt: { subject: "Solicitação recusada", heading: "Sua solicitação foi recusada" },
    en: { subject: "Request declined", heading: "Your request was declined" },
  },
  comment: {
    pt: { subject: "Novo comentário em sua tarefa", heading: "Novo comentário 💬" },
    en: { subject: "New comment on your task", heading: "New comment 💬" },
  },
  task_completed: {
    pt: { subject: "Tarefa concluída", heading: "Tarefa concluída 🎉" },
    en: { subject: "Task completed", heading: "Task completed 🎉" },
  },
  completion_pending: {
    pt: { subject: "Conclusão aguardando confirmação", heading: "Conclusão pendente ⏳" },
    en: { subject: "Completion awaiting confirmation", heading: "Completion pending ⏳" },
  },
  new_task: {
    pt: { subject: "Nova tarefa de alguém que você segue", heading: "Nova atividade na sua rede ✨" },
    en: { subject: "New task from someone you follow", heading: "New activity in your network ✨" },
  },
  new_rating: {
    pt: { subject: "Você recebeu uma nova avaliação", heading: "Nova avaliação ⭐" },
    en: { subject: "You received a new rating", heading: "New rating ⭐" },
  },
  rate_request: {
    pt: { subject: "Avalie sua experiência", heading: "Que tal avaliar? ⭐" },
    en: { subject: "Rate your experience", heading: "How about a rating? ⭐" },
  },
  new_message: {
    pt: { subject: "Nova mensagem no TaskMates", heading: "Nova mensagem 💌" },
    en: { subject: "New message on TaskMates", heading: "New message 💌" },
  },
  help_request: {
    pt: { subject: "Pedido de ajuda no TaskMates", heading: "Alguém precisa de ajuda 🙋" },
    en: { subject: "Help request on TaskMates", heading: "Someone needs help 🙋" },
  },
};

const FALLBACK: Record<Lang, { subject: string; heading: string }> = {
  pt: { subject: "Nova notificação - TaskMates", heading: "Você tem uma novidade 🌿" },
  en: { subject: "New notification - TaskMates", heading: "You have an update 🌿" },
};

const UI: Record<Lang, { cta: string; footer: string; signoff: string }> = {
  pt: {
    cta: "Ver no aplicativo",
    footer: "Você recebeu este e-mail porque tem as notificações por e-mail ativadas.",
    signoff: "Com carinho, CapyVera e a equipe TaskMates 🌱",
  },
  en: {
    cta: "Open the app",
    footer: "You received this email because email notifications are enabled on your account.",
    signoff: "With care, CapyVera and the TaskMates team 🌱",
  },
};

const normalizeLang = (value?: string | null): Lang =>
  String(value ?? "").toLowerCase().startsWith("pt") ? "pt" : "en";

const getEmailTemplate = (type: string, message: string, lang: Lang): string => {
  const copy = COPY[type]?.[lang] ?? FALLBACK[lang];
  const ui = UI[lang];
  const safeMessage = escapeHtml(message);

  return `<!DOCTYPE html>
<html lang="${lang === "pt" ? "pt-BR" : "en"}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:24px 12px;background-color:#ffffff;font-family:'Nunito','Space Grotesk',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border:1px solid ${BRAND.border};border-radius:24px;overflow:hidden;">
      <div style="background-color:${BRAND.tint};padding:28px 28px 20px;text-align:center;">
        <img src="${LOGO_URL}" alt="TaskMates" width="150" style="display:block;margin:0 auto 12px;">
        <img src="${CAPY_URL}" alt="CapyVera" width="96" style="display:block;margin:0 auto;">
      </div>
      <div style="padding:28px;">
        <h1 style="font-family:'Space Grotesk','Nunito',Arial,sans-serif;font-size:22px;font-weight:bold;color:${BRAND.ink};margin:0 0 18px;line-height:1.25;">
          ${escapeHtml(copy.heading)}
        </h1>
        <p style="font-size:15px;color:${BRAND.body};line-height:1.6;margin:0 0 24px;background-color:${BRAND.tint};border-radius:16px;padding:16px 18px;">
          ${safeMessage}
        </p>
        <a href="${APP_URL}" style="display:inline-block;background-color:${BRAND.green};color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:16px;font-weight:bold;font-size:15px;">
          ${escapeHtml(ui.cta)}
        </a>
        <hr style="border:none;border-top:1px solid ${BRAND.border};margin:28px 0 16px;">
        <p style="color:${BRAND.muted};font-size:12px;margin:0 0 6px;line-height:1.5;">${escapeHtml(ui.footer)}</p>
        <p style="color:${BRAND.muted};font-size:12px;margin:0;line-height:1.5;">${escapeHtml(ui.signoff)}</p>
      </div>
    </div>
  </body>
</html>`;
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

  // Recipient language preference
  let lang: Lang = "en";
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("preferred_language")
    .eq("id", user_id)
    .maybeSingle();
  lang = normalizeLang((profile as { preferred_language?: string } | null)?.preferred_language);

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

  const subject = (COPY[notification_type]?.[lang] ?? FALLBACK[lang]).subject;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "TaskMates <noreply@taskmates.top>",
      to: [userEmail],
      subject,
      html: getEmailTemplate(notification_type, message, lang),
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text().catch(() => ""));
    return { skipped: true, reason: "send_failed" };
  }

  return { success: true };
}
