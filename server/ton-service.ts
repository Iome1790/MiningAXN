import { TonClient, WalletContractV4, Address, toNano, JettonMaster, internal, beginCell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

const TREASURY_ADDRESS = 'UQDeroBz4zvOntJ4xuMdiwFtNddMhJ4cGxghF9B7fYz50q8b';
const AXN_JETTON_MASTER = 'EQCj3Cpl5aEEdt7fhZmHrhCYA99YjMZxvkp8UmtmHT4Gfm7b';
export const CLAIM_FEE_TON = '0.03';
export const CLAIM_FEE_NANO = '30000000'; // 0.03 TON in nanotons
const AXN_DECIMALS = 9; // Standard TON jetton decimals

function getClient() {
  return new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
}

async function getTreasuryWallet() {
  const mnemonic = (process.env.TREASURY_MNEMONIC || '').trim().split(/\s+/);
  if (mnemonic.length < 12) throw new Error('TREASURY_MNEMONIC not configured');
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
  return { wallet, keyPair };
}

// Normalize TON address to bounceable=false for comparison
function normalizeAddress(addr: string): string {
  try { return Address.parse(addr).toString({ bounceable: false }); } catch { return addr; }
}

// Check TON blockchain for incoming 0.03 TON from a specific wallet address after a given time
export async function checkPaymentReceived(
  userWalletAddress: string,
  claimCreatedAt: Date
): Promise<{ found: boolean; txHash?: string }> {
  try {
    const treasuryAddr = Address.parse(TREASURY_ADDRESS);
    // Use TONCenter REST API — no auth required for basic reads
    const url = `https://toncenter.com/api/v2/getTransactions?address=${treasuryAddr.toString()}&limit=30&archival=false`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { found: false };
    const data = await resp.json();
    if (!data.ok || !Array.isArray(data.result)) return { found: false };

    const normalizedUser = normalizeAddress(userWalletAddress);
    const claimTs = Math.floor(claimCreatedAt.getTime() / 1000);

    for (const tx of data.result) {
      if (!tx.in_msg || !tx.in_msg.source) continue;
      const txTs: number = tx.utime || 0;
      if (txTs < claimTs - 60) continue; // ignore txs before claim was created (with 60s buffer)

      const sender = normalizeAddress(tx.in_msg.source);
      if (sender !== normalizedUser) continue;

      // Check value is ~0.03 TON (allow 0.005 TON variance for gas)
      const value = parseInt(tx.in_msg.value || '0');
      const expected = 30_000_000;
      const tolerance = 5_000_000;
      if (Math.abs(value - expected) > tolerance) continue;

      const txHash = tx.transaction_id?.hash || tx.hash || `tx_${tx.utime}`;
      return { found: true, txHash };
    }
    return { found: false };
  } catch (e) {
    console.error('[TON] checkPaymentReceived error:', e);
    return { found: false };
  }
}

// Send AXN jettons from treasury wallet to destination address
export async function sendAXNJetton(
  toAddress: string,
  axnAmount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const client = getClient();
    const { wallet, keyPair } = await getTreasuryWallet();
    const contract = client.open(wallet);

    // Get treasury's AXN jetton wallet address
    const jettonMaster = client.open(JettonMaster.create(Address.parse(AXN_JETTON_MASTER)));
    const treasuryAddr = Address.parse(TREASURY_ADDRESS);
    const jettonWalletAddr = await jettonMaster.getWalletAddress(treasuryAddr);

    // Build jetton transfer body: op=0xf8a7ea5
    const jettonAmount = BigInt(axnAmount) * BigInt(10 ** AXN_DECIMALS);
    const destinationAddr = Address.parse(toAddress);

    const transferBody = beginCell()
      .storeUint(0xf8a7ea5, 32)   // op: jetton transfer
      .storeUint(0, 64)           // query_id
      .storeCoins(jettonAmount)   // jetton amount to send
      .storeAddress(destinationAddr)  // destination
      .storeAddress(treasuryAddr)     // response_destination (excess TON back to treasury)
      .storeBit(false)            // no custom payload
      .storeCoins(toNano('0.01')) // forward_ton_amount (for jetton notification)
      .storeBit(false)            // no forward_payload
      .endCell();

    const seqno = await contract.getSeqno();

    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: jettonWalletAddr,
          value: toNano('0.06'), // TON for gas + forward
          body: transferBody,
        }),
      ],
    });

    return { success: true, txHash: `seqno_${seqno}_${Date.now()}` };
  } catch (e: any) {
    console.error('[TON] sendAXNJetton error:', e);
    return { success: false, error: e?.message || 'Unknown error' };
  }
}

export { TREASURY_ADDRESS, AXN_JETTON_MASTER };
