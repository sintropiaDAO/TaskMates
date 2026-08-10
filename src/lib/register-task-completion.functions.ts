/**
 * Ported from supabase/functions/register-task-completion (edge function).
 * Registers a task-completion proof reference for the Scroll Sepolia testnet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminClient, requireUserId, UUID_RE } from "@/lib/supabase-server";

const SCROLL_TESTNET_RPC = "https://sepolia-rpc.scroll.io";

const InputSchema = z.object({
  taskId: z.string().regex(UUID_RE),
  proofUrl: z.string().min(1),
});

async function sendBlockchainTransaction(
  privateKey: string,
  taskId: string,
  proofUrl: string,
  userId: string,
): Promise<string> {
  const completionData = JSON.stringify({
    taskId,
    proofUrl,
    userId,
    completedAt: new Date().toISOString(),
    platform: "TaskMates",
  });

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(completionData);

  const pkHex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  const pkBytes = new Uint8Array(pkHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const hashBuffer = await crypto.subtle.digest("SHA-256", pkBytes);
  const hashArray = new Uint8Array(hashBuffer);
  const fromAddress = "0x" + Array.from(hashArray.slice(0, 20)).map((b) => b.toString(16).padStart(2, "0")).join("");

  console.log(`Preparing transaction from derived address: ${fromAddress}`);

  const nonceResponse = await fetch(SCROLL_TESTNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionCount",
      params: [fromAddress, "latest"],
      id: 1,
    }),
  });
  const nonceData = await nonceResponse.json();
  console.log("Nonce response:", nonceData);

  const gasPriceResponse = await fetch(SCROLL_TESTNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_gasPrice",
      params: [],
      id: 1,
    }),
  });
  const gasPriceData = await gasPriceResponse.json();
  console.log("Gas price:", gasPriceData.result);

  // For demo purposes, create a mock transaction hash
  const txDataForHash = `${taskId}-${userId}-${Date.now()}`;
  const txHashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(txDataForHash));
  const txHashArray = new Uint8Array(txHashBuffer);
  const mockTxHash = "0x" + Array.from(txHashArray).map((b) => b.toString(16).padStart(2, "0")).join("");

  console.log(`Generated transaction reference: ${mockTxHash}`);
  console.log(`Data payload size: ${dataBytes.length} bytes`);

  return mockTxHash;
}

export const registerTaskCompletion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { userId } = await requireUserId();
    const { taskId, proofUrl } = data;

    const supabase = adminClient();

    // Verify caller owns the task
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("id, created_by")
      .eq("id", taskId)
      .maybeSingle();
    if (taskErr || !task || (task as { created_by: string }).created_by !== userId) {
      throw new Error("Forbidden");
    }

    const privateKey = process.env['SCROLL_PRIVATE_KEY'];
    if (!privateKey) {
      console.error("SCROLL_PRIVATE_KEY not configured");
      throw new Error("Blockchain configuration missing");
    }

    const txHash = await sendBlockchainTransaction(privateKey, taskId, proofUrl, userId);

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ blockchain_tx_hash: txHash })
      .eq("id", taskId);

    if (updateError) {
      console.error("Failed to update task:", updateError);
    }

    console.log(`Task ${taskId} registered with reference: ${txHash}`);

    return {
      success: true,
      txHash,
      explorerUrl: `https://sepolia.scrollscan.com/tx/${txHash}`,
    };
  });
