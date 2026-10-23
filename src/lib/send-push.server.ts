/**
 * Server-only: delivers a push notification to every registered device of a
 * user through Firebase Cloud Messaging (via the Lovable connector gateway).
 */
import { adminClient } from "@/lib/supabase-server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export async function sendPushToUser(payload: PushPayload): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connKey) {
    console.error("Push not configured: missing LOVABLE_API_KEY or FIREBASE_MESSAGING_API_KEY");
    return;
  }
  const admin = adminClient();

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("push_enabled")
    .eq("user_id", payload.user_id)
    .maybeSingle();
  if (prefs && prefs.push_enabled === false) return;

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token")
    .eq("user_id", payload.user_id);
  if (!tokens?.length) return;

  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
  const link = payload.url.startsWith("http") ? payload.url : `https://taskmates.app${payload.url}`;

  await Promise.allSettled(
    tokens.map(async ({ token }: { token: string }) => {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: { url: link },
            webpush: {
              headers: { Urgency: "high", TTL: "86400" },
              notification: {
                icon: "https://taskmates.app/pwa-192x192.png",
                badge: "https://taskmates.app/pwa-192x192.png",
                tag: payload.tag,
              },
              fcm_options: { link },
            },
            android: { priority: "high" },
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 404 || (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT|not a valid FCM/i.test(text))) {
          await admin.from("push_tokens").delete().eq("token", token);
        } else {
          console.error(`FCM send failed [${res.status}]: ${text}`);
        }
      }
    }),
  );
}
