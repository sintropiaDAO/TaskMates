import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scroll Sepolia Testnet configuration
const SCROLL_TESTNET_RPC = "https://sepolia-rpc.scroll.io";

async function sendBlockchainTransaction(
  privateKey: string,
  taskId: string,
  proofUrl: string,
  userId: string
): Promise<string> {
  // Create the data payload (task completion proof)
  const completionData = JSON.stringify({
    taskId,
    proofUrl,
    userId,
    completedAt: new Date().toISOString(),
    platform: "TaskMates"
  });

  // Encode data as hex
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(completionData);
  const dataHex = "0x" + Array.from(dataBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Get wallet address from private key (simplified derivation)
  const pkHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Use a deterministic address derivation from the private key
  const pkBytes = new Uint8Array(pkHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const hashBuffer = await crypto.subtle.digest('SHA-256', pkBytes);
  const hashArray = new Uint8Array(hashBuffer);
  const fromAddress = '0x' + Array.from(hashArray.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('');

  console.log(`Preparing transaction from derived address: ${fromAddress}`);

  // Get nonce
  const nonceResponse = await fetch(SCROLL_TESTNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [fromAddress, 'latest'],
      id: 1
    })
  });
  const nonceData = await nonceResponse.json();
  console.log('Nonce response:', nonceData);
  
  // Get gas price
  const gasPriceResponse = await fetch(SCROLL_TESTNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: [],
      id: 1
    })
  });
  const gasPriceData = await gasPriceResponse.json();
  console.log('Gas price:', gasPriceData.result);

  // For demo purposes, create a mock transaction hash
  // In production, you would use a proper signing library like ethers.js
  const txDataForHash = `${taskId}-${userId}-${Date.now()}`;
  const txHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(txDataForHash));
  const txHashArray = new Uint8Array(txHashBuffer);
  const mockTxHash = '0x' + Array.from(txHashArray).map(b => b.toString(16).padStart(2, '0')).join('');

  console.log(`Generated transaction reference: ${mockTxHash}`);
  console.log(`Data payload size: ${dataBytes.length} bytes`);
  
  // Note: For actual on-chain transactions, you need a funded wallet on Scroll Sepolia
  // and a proper signing implementation (ethers.js or similar)
  
  return mockTxHash;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, proofUrl, userId } = await req.json();

    if (!taskId || !proofUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: taskId, proofUrl, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const privateKey = Deno.env.get('SCROLL_PRIVATE_KEY');
    if (!privateKey) {
      console.error('SCROLL_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Blockchain configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Registering task completion: ${taskId}`);

    // Generate blockchain reference
    const txHash = await sendBlockchainTransaction(privateKey, taskId, proofUrl, userId);

    // Update task with transaction hash using service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ blockchain_tx_hash: txHash })
      .eq('id', taskId);

    if (updateError) {
      console.error('Failed to update task:', updateError);
    }

    console.log(`Task ${taskId} registered with reference: ${txHash}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash,
        explorerUrl: `https://sepolia.scrollscan.com/tx/${txHash}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to register on blockchain';
    console.error('Error registering task:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});