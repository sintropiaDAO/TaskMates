import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminClient, requireUserId } from "@/lib/supabase-server";

const TokenSchema = z.object({
  token: z.string().min(20).max(4096),
  user_agent: z.string().max(500).optional(),
});

/** Saves this device's push token for the signed-in user (moves it if another account used it). */
export const registerPushToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { userId } = await requireUserId();
    const admin = adminClient();
    const { error } = await admin
      .from("push_tokens")
      .upsert(
        { user_id: userId, token: data.token, user_agent: data.user_agent ?? null, updated_at: new Date().toISOString() },
        { onConflict: "token" },
      );
    if (error) throw new Error("Failed to save push token");
    return { success: true };
  });

export const unregisterPushToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenSchema.pick({ token: true }).parse(input))
  .handler(async ({ data }) => {
    const { userId } = await requireUserId();
    await adminClient().from("push_tokens").delete().eq("token", data.token).eq("user_id", userId);
    return { success: true };
  });
