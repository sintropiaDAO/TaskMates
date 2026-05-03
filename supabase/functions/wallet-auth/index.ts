// Server-side wallet authentication.
// Two actions:
//   { action: "nonce", address }   -> stores a single-use message+nonce, returns the message to sign
//   { action: "verify", address, signature } -> verifies signature server-side, provisions user, returns a magic link
//
// The client never derives credentials from the signature. The server owns the
// nonce lifecycle and uses Supabase admin APIs to create/sign-in the user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyMessage, getAddress } from "https://esm.sh/ethers@6.13.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeAddress(addr: unknown): string | null {
  if (typeof addr !== "string") return null;
  try {
    return getAddress(addr).toLowerCase();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const address = normalizeAddress(body?.address);
    if (!address) return json({ error: "Invalid wallet address" }, 400);

    if (action === "nonce") {
      const nonce = crypto.randomUUID();
      const message = `TaskMates Login\n\nAddress: ${address}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}`;
      const { error } = await admin
        .from("wallet_auth_nonces")
        .upsert({
          wallet_address: address,
          nonce,
          message,
          expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        });
      if (error) {
        console.error("nonce upsert error", error);
        return json({ error: "Failed to issue nonce" }, 500);
      }
      return json({ message });
    }

    if (action === "verify") {
      const signature = body?.signature;
      if (typeof signature !== "string" || signature.length < 10) {
        return json({ error: "Missing signature" }, 400);
      }

      const { data: nonceRow, error: nonceErr } = await admin
        .from("wallet_auth_nonces")
        .select("*")
        .eq("wallet_address", address)
        .maybeSingle();

      if (nonceErr || !nonceRow) return json({ error: "No active nonce" }, 400);
      if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
        await admin.from("wallet_auth_nonces").delete().eq("wallet_address", address);
        return json({ error: "Nonce expired" }, 400);
      }

      // Server-side signature verification
      let recovered: string;
      try {
        recovered = verifyMessage(nonceRow.message, signature).toLowerCase();
      } catch {
        return json({ error: "Invalid signature" }, 401);
      }
      if (recovered !== address) return json({ error: "Signature mismatch" }, 401);

      // Single-use: delete nonce immediately on success
      await admin.from("wallet_auth_nonces").delete().eq("wallet_address", address);

      const email = `${address}@wallet.taskmates.app`;

      // Ensure user exists
      const { data: existingList } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        // @ts-ignore filter not strongly typed
      });
      let userId: string | null = null;
      // listUsers doesn't filter by email reliably across versions; do a targeted check
      const { data: byEmail } = await admin
        .from("profiles")
        .select("id")
        .eq("wallet_address", address)
        .maybeSingle();
      if (byEmail?.id) userId = byEmail.id;

      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            wallet_address: address,
            full_name: `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
          },
        });
        if (createErr && !/already/i.test(createErr.message)) {
          console.error("createUser error", createErr);
          return json({ error: "Failed to provision user" }, 500);
        }
        userId = created?.user?.id ?? null;
        if (userId) {
          await admin.from("profiles").update({ wallet_address: address }).eq("id", userId);
        }
      }

      // Generate a magic link the client can exchange for a session
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkErr || !linkData) {
        console.error("generateLink error", linkErr);
        return json({ error: "Failed to issue session" }, 500);
      }

      // Extract the OTP token hash so the client can verify without leaving the app
      const props = linkData.properties as { hashed_token?: string; email_otp?: string };
      return json({
        email,
        token_hash: props.hashed_token,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("wallet-auth error", e);
    return json({ error: "Internal error" }, 500);
  }
});
