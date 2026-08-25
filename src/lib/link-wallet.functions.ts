/**
 * Server-side wallet linking for already-authenticated users.
 * Requires a signature over a single-use, server-issued nonce before a wallet
 * address is persisted to profile_wallets, so users cannot claim addresses
 * they do not control.
 *
 *   linkWallet({ data: { action: "nonce", address } })            -> { message }
 *   linkWallet({ data: { action: "verify", address, signature } }) -> { linked: true }
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyMessage, getAddress } from "ethers";
import { adminClient, requireUserId } from "@/lib/supabase-server";

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

export const linkWallet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { userId } = await requireUserId();
    const admin = adminClient();

    const address = normalizeAddress(data.address);
    if (!address) throw new Error("Invalid wallet address");

    if (data.action === "nonce") {
      const nonce = crypto.randomUUID();
      const message = `TaskMates Link Wallet\n\nAddress: ${address}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}`;
      const { error } = await admin
        .from("wallet_auth_nonces")
        .upsert({
          wallet_address: address,
          nonce,
          message,
          expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        });
      if (error) {
        console.error("link nonce upsert error", error);
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

    let recovered: string;
    try {
      recovered = verifyMessage(row.message, signature).toLowerCase();
    } catch {
      throw new Error("Invalid signature");
    }
    if (recovered !== address) throw new Error("Signature mismatch");

    // Single-use: delete nonce immediately on success
    await admin.from("wallet_auth_nonces").delete().eq("wallet_address", address);

    // Reject if the wallet is already linked to a different account
    const { data: existing } = await admin
      .from("profile_wallets")
      .select("user_id")
      .eq("wallet_address", address)
      .maybeSingle();
    if (existing && (existing as { user_id: string }).user_id !== userId) {
      throw new Error("Wallet already linked to another account");
    }

    const { error: linkErr } = await admin
      .from("profile_wallets")
      .upsert({ user_id: userId, wallet_address: address });
    if (linkErr) {
      console.error("profile_wallets upsert error", linkErr);
      throw new Error("Failed to link wallet");
    }

    return { linked: true };
  });
