import { WalletContractV5R1, Address, toNano, internal, beginCell, external, storeMessage } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

const TREASURY_ADDRESS = 'UQDeroBz4zvOntJ4xuMdiwFtNddMhJ4cGxghF9B7fYz50q8b';
const AXN_JETTON_MASTER = 'EQCj3Cpl5aEEdt7fhZmHrhCYA99YjMZxvkp8UmtmHT4Gfm7b';
export const CLAIM_FEE_TON = '0.03';
export const CLAIM_FEE_NANO = '30000000';
const AXN_DECIMALS = 9;

// tonapi.io base — free, no rate limits for basic use
const TONAPI = 'https://tonapi.io/v2';

function tonapiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (process.env.TONAPI_KEY) h['Authorization'] = `Bearer ${process.env.TONAPI_KEY}`;
  return h;
}

async function getTreasuryWallet() {
  const mnemonic = (process.env.TREASURY_MNEMONIC || '').trim().split(/\s+/);
  if (mnemonic.length < 12) throw new Error('TREASURY_MNEMONIC not configured');
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV5R1.create({ publicKey: keyPair.publicKey, workchain: 0 });
  return { wallet, keyPair };
}

// Both bounceable & non-bounceable forms for address comparison
function getAllAddressForms(addr: string): string[] {
  try {
    const parsed = Address.parse(addr);
    return [
      parsed.toString({ bounceable: false }),
      parsed.toString({ bounceable: true }),
      parsed.toRawString(),
    ];
  } catch { return [addr]; }
}

// ── Payment detection ─────────────────────────────────────────────────────────
export async function checkPaymentReceived(
  userWalletAddress: string,
  claimCreatedAt: Date
): Promise<{ found: boolean; txHash?: string }> {
  const userForms = getAllAddressForms(userWalletAddress);
  const claimTs = Math.floor(claimCreatedAt.getTime() / 1000);

  // Strategy 1: TONCenter v2 (fast when API key present)
  try {
    const apiKey = process.env.TONCENTER_API_KEY;
    const keyParam = apiKey ? `&api_key=${apiKey}` : '';
    const treasuryAddr = Address.parse(TREASURY_ADDRESS);
    const url = `https://toncenter.com/api/v2/getTransactions?address=${treasuryAddr.toString()}&limit=100&archival=false${keyParam}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const tx of data.result) {
          if (!tx.in_msg?.source) continue;
          if ((tx.utime || 0) < claimTs - 120) continue;
          const senderForms = getAllAddressForms(tx.in_msg.source);
          if (!userForms.some(u => senderForms.includes(u))) continue;
          if (parseInt(tx.in_msg.value || '0') < 20_000_000) continue;
          const txHash = tx.transaction_id?.hash || tx.hash || `toncv2_${tx.utime}`;
          console.log(`[TON] ✅ Payment found via TONCenter! hash=${txHash}`);
          return { found: true, txHash };
        }
        console.log(`[TON] TONCenter: No matching payment`);
        return { found: false };
      }
    } else {
      console.warn(`[TON] TONCenter ${resp.status}, trying tonapi.io...`);
    }
  } catch (e) {
    console.warn(`[TON] TONCenter failed: ${e}, trying tonapi.io...`);
  }

  // Strategy 2: tonapi.io (reliable fallback)
  try {
    const treasuryRaw = Address.parse(TREASURY_ADDRESS).toRawString();
    const url = `${TONAPI}/blockchain/accounts/${treasuryRaw}/transactions?limit=100`;
    const resp = await fetch(url, { headers: tonapiHeaders(), signal: AbortSignal.timeout(12000) });
    if (!resp.ok) { console.warn(`[TON] tonapi.io ${resp.status}`); return { found: false }; }
    const data = await resp.json();
    for (const tx of (data.transactions || [])) {
      if ((tx.utime || 0) < claimTs - 120) continue;
      const inMsg = tx.in_msg;
      if (!inMsg?.source?.address) continue;
      const senderForms = getAllAddressForms(inMsg.source.address);
      if (!userForms.some(u => senderForms.includes(u))) continue;
      if (parseInt(inMsg.value || '0') < 20_000_000) continue;
      const txHash = tx.hash || `tonapi_${tx.utime}`;
      console.log(`[TON] ✅ Payment found via tonapi.io! hash=${txHash}`);
      return { found: true, txHash };
    }
    console.log(`[TON] tonapi.io: No matching payment`);
    return { found: false };
  } catch (e) {
    console.error(`[TON] tonapi.io failed: ${e}`);
    return { found: false };
  }
}

// ── AXN Jetton Send — uses tonapi.io for ALL network calls (no TONCenter) ────
export async function sendAXNJetton(
  toAddress: string,
  axnAmount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { wallet, keyPair } = await getTreasuryWallet();
    const treasuryAddr = Address.parse(TREASURY_ADDRESS);
    const treasuryRaw = treasuryAddr.toRawString();
    const jettonMasterRaw = Address.parse(AXN_JETTON_MASTER).toRawString();

    // Step 1: Get treasury's AXN jetton wallet address via tonapi.io
    const jwResp = await fetch(
      `${TONAPI}/accounts/${treasuryRaw}/jettons/${jettonMasterRaw}`,
      { headers: tonapiHeaders(), signal: AbortSignal.timeout(12000) }
    );
    if (!jwResp.ok) throw new Error(`tonapi jetton wallet lookup failed: ${jwResp.status}`);
    const jwData = await jwResp.json();
    const jettonWalletAddrStr = jwData.wallet_address?.address;
    if (!jettonWalletAddrStr) throw new Error('No jetton wallet address returned');
    const jettonWalletAddr = Address.parse(jettonWalletAddrStr);
    console.log(`[TON] Jetton wallet: ${jettonWalletAddrStr}`);

    // Step 2: Get seqno via tonapi.io (run get method)
    const seqnoResp = await fetch(
      `${TONAPI}/blockchain/accounts/${treasuryRaw}/methods/seqno`,
      { headers: tonapiHeaders(), signal: AbortSignal.timeout(12000) }
    );
    if (!seqnoResp.ok) throw new Error(`tonapi seqno failed: ${seqnoResp.status}`);
    const seqnoData = await seqnoResp.json();
    // seqno is in stack[0].num (hex string)
    const seqnoHex = seqnoData.stack?.[0]?.num ?? seqnoData.decoded?.seqno;
    if (seqnoHex === undefined) throw new Error('Could not read seqno from tonapi response');
    const seqno = typeof seqnoHex === 'number' ? seqnoHex : parseInt(String(seqnoHex), 16);
    console.log(`[TON] Seqno: ${seqno}`);

    // Step 3: Build jetton transfer body (offline, no network)
    const jettonAmount = BigInt(axnAmount) * BigInt(10 ** AXN_DECIMALS);
    const destinationAddr = Address.parse(toAddress);
    const transferBody = beginCell()
      .storeUint(0xf8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(jettonAmount)
      .storeAddress(destinationAddr)
      .storeAddress(treasuryAddr)
      .storeBit(false)
      .storeCoins(toNano('0.01'))
      .storeBit(false)
      .endCell();

    // Step 4: Sign the transfer locally (no network)
    const transfer = wallet.createTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: jettonWalletAddr,
          value: toNano('0.06'),
          body: transferBody,
        }),
      ],
    });
    // Wrap body in full external message before serializing to BOC
    const fullExternalMsg = beginCell()
      .store(storeMessage(external({ to: wallet.address, body: transfer })))
      .endCell();
    const boc = fullExternalMsg.toBoc().toString('base64');

    // Step 5: Broadcast via tonapi.io (no TONCenter!)
    const sendResp = await fetch(`${TONAPI}/blockchain/message`, {
      method: 'POST',
      headers: tonapiHeaders(),
      body: JSON.stringify({ boc }),
      signal: AbortSignal.timeout(20000),
    });
    if (!sendResp.ok) {
      const errText = await sendResp.text().catch(() => '');
      throw new Error(`tonapi broadcast failed: ${sendResp.status} ${errText}`);
    }
    const txHash = `tonapi_seqno_${seqno}_${Date.now()}`;
    console.log(`[TON] ✅ AXN sent via tonapi.io! seqno=${seqno} amount=${axnAmount}`);
    return { success: true, txHash };

  } catch (e: any) {
    console.error('[TON] sendAXNJetton error:', e?.message || e);
    return { success: false, error: e?.message || 'Unknown error' };
  }
}

export { TREASURY_ADDRESS, AXN_JETTON_MASTER };
