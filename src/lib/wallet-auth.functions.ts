/**
 * Ported from supabase/functions/wallet-auth (edge function).
 * Server-side wallet authentication (MetaMask / SIWE-style):
 *   walletAuth({ data: { action: "nonce", address } })  -> { message }
 *   walletAuth({ data: { action: "verify", address, signature } }) -> { email, token_hash }
 * The client never derives credentials from the signature; the server owns
 * the nonce lifecycle and uses Supabase admin APIs to provision the user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyMessage, getAddress } from "ethers";
import { adminClient } from "@/lib/supabase-server";

const InputSchema = z.object({
  action: z.enum(["nonce", "verify"]),
  address: z.string(),
  signature: z.string().optional(),
});

function normalizeAddress(addr: unknown): string | null {
  if (typeof addr !== "string") return null;
  try {
    return getAddress(addr).toLowerCase();
  } catch {
    return null;
  }
}

export const walletAuth = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const admin = adminClient();

    const address = normalizeAddress(data.address);
    if (!address) throw new Error("Invalid wallet address");

    if (data.action === "nonce") {
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
        throw new Error("Failed to issue nonce");
      }
      return { message };
    }

    // action === "verify"
    const signature = data.signature;
    if (typeof signature !== "string" || signature.length < 10) {
      throw new Error("Missing signature");
    }

    const { data: nonceRow, error: nonceErr } = await admin
      .from("wallet_auth_nonces")
      .select("*")
      .eq("wallet_address", address)
      .maybeSingle();

    if (nonceErr || !nonceRow) throw new Error("No active nonce");
    const row = nonceRow as { message: string; expires_at: string };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from("wallet_auth_nonces").delete().eq("wallet_address", address);
      throw new Error("Nonce expired");
    }

    // Server-side signature verification
    let recovered: string;
    try {
      recovered = verifyMessage(row.message, signature).toLowerCase();
    } catch {
      throw new Error("Invalid signature");
    }
    if (recovered !== address) throw new Error("Signature mismatch");

    // Single-use: delete nonce immediately on success
    await admin.from("wallet_auth_nonces").delete().eq("wallet_address", address);

    const email = `${address}@wallet.taskmates.app`;

    // Ensure user exists (targeted lookup via profiles.wallet_address)
    let userId: string | null = null;
    const { data: byEmail } = await admin
      .from("profiles")
      .select("id")
      .eq("wallet_address", address)
      .maybeSingle();
    if ((byEmail as { id: string } | null)?.id) userId = (byEmail as { id: string }).id;

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
        throw new Error("Failed to provision user");
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
      throw new Error("Failed to issue session");
    }

    const props = linkData.properties as { hashed_token?: string; email_otp?: string };
    return {
      email,
      token_hash: props.hashed_token,
    };
  });
