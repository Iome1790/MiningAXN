import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const BG = '#0a0a0a';
const CARD = '#111111';
const BORDER = '#3a2800';
const AMBER = '#c67a00';
const AMBER_BRIGHT = '#f5a623';
const TEXT = '#e0e0e0';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const MONO = "'Courier New', Courier, monospace";

const cardStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderLeft: `2px solid ${AMBER}`,
  padding: '14px 14px',
  marginBottom: 10,
};

const sectionLabel = {
  fontFamily: MONO,
  fontSize: 11,
  color: AMBER,
  letterSpacing: '0.08em',
  margin: '0 0 8px',
};

const fieldStyle = {
  width: '100%', height: 40,
  background: '#1a1a1a',
  border: `1px solid ${BORDER}`,
  color: TEXT,
  fontFamily: MONO,
  fontSize: 12, padding: '0 10px', outline: 'none', boxSizing: 'border-box' as const,
};

const TON_PER_AXN = 0.00001;

type Tab = 'ton' | 'usd';

export default function Wallet() {
  const [tab, setTab] = useState<Tab>('ton');
  const [tonAddress, setTonAddress] = useState('');
  const [tonMemo, setTonMemo] = useState('');
  const [tonAmount, setTonAmount] = useState('');
  const [usdAddress, setUsdAddress] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [tonPrice, setTonPrice] = useState<number | null>(null);
  const [tonLoading, setTonLoading] = useState(true);

  const queryClient = useQueryClient();
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: wellData } = useQuery<any>({ queryKey: ['/api/referrals/well'], staleTime: 30000 });
  const { data: appSettings } = useQuery<any>({ queryKey: ['/api/app-settings'], staleTime: 30000 });

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const tonValue = axnBalance * TON_PER_AXN;
  const usdValue = tonPrice ? tonValue * tonPrice : null;
  const friendsCount = wellData?.totalFriends ?? 0;
  const minAxn = appSettings?.minTradeAmount ?? 300;
  const adsWatched = user?.ads_watched ?? 0;
  const MIN_FRIENDS = 3;
  const MIN_ADS = 10;
  const meetsRequirements = axnBalance >= minAxn && friendsCount >= MIN_FRIENDS && adsWatched >= MIN_ADS;

  useEffect(() => {
    setTonLoading(true);
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setTonPrice(d?.['the-open-network']?.usd ?? null))
      .catch(() => {})
      .finally(() => setTonLoading(false));
  }, []);

  const withdrawMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest('POST', '/api/withdrawals', payload);
      return res.json();
    },
    onSuccess: () => {
      showNotification('Withdrawal request submitted!', 'success');
      setTonAddress(''); setTonMemo(''); setTonAmount(''); setUsdAddress(''); setUsdAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (e: any) => {
      let msg = 'Withdrawal failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch { msg = e.message || msg; }
      showNotification(msg, 'error');
    },
  });

  const handleTonWithdraw = () => {
    if (!tonAddress.trim()) { showNotification('Enter TON wallet address', 'error'); return; }
    if (!tonAmount || parseInt(tonAmount) < minAxn) { showNotification(`Minimum ${minAxn.toLocaleString()} AXN`, 'error'); return; }
    withdrawMutation.mutate({ address: tonAddress.trim(), amount: tonAmount, method: 'TON', memo: tonMemo.trim() || undefined });
  };

  const handleUsdWithdraw = () => {
    if (!usdAddress.trim() || !usdAddress.startsWith('0x')) { showNotification('Enter valid BEP-20 address (0x...)', 'error'); return; }
    if (!usdAmount || parseInt(usdAmount) < minAxn) { showNotification(`Minimum ${minAxn.toLocaleString()} AXN`, 'error'); return; }
    withdrawMutation.mutate({ address: usdAddress.trim(), amount: usdAmount, method: 'USDT-BSC' });
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: MONO }}>

      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 14px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ color: TEXT_DIM, fontSize: 11, letterSpacing: '0.08em' }}>Wallet</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 64px' }}>

        {/* Balance Card */}
        <div style={{ ...cardStyle, borderLeft: `2px solid ${AMBER_BRIGHT}`, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 0 }}>
            <div style={{ padding: '2px 0 10px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ color: TEXT_DIM, fontSize: 10, marginBottom: 3 }}>Balance</div>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>{axnBalance.toLocaleString()}</div>
            </div>
            <div style={{ padding: '2px 0 10px', paddingLeft: 16, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ color: TEXT_DIM, fontSize: 10, marginBottom: 3 }}>TON Value</div>
              <div style={{ color: AMBER_BRIGHT, fontSize: 15, fontWeight: 700 }}>{tonValue.toFixed(4)}</div>
            </div>
            <div style={{ padding: '10px 0 0' }}>
              <div style={{ color: TEXT_DIM, fontSize: 10, marginBottom: 3 }}>USD Value</div>
              <div style={{ color: '#4ade80', fontSize: 15, fontWeight: 700 }}>
                {tonLoading ? '—' : usdValue !== null ? `$${usdValue.toFixed(4)}` : '—'}
              </div>
            </div>
            <div style={{ padding: '10px 0 0', paddingLeft: 16 }}>
              <div style={{ color: TEXT_DIM, fontSize: 10, marginBottom: 3 }}>TON Price</div>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>
                {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)}` : 'N/A'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, color: TEXT_DIM, fontSize: 10 }}>1,000 AXN = 0.01 TON · Live price</div>
        </div>

        {/* Requirements */}
        <p style={sectionLabel}>Withdrawal Requirements</p>
        <div style={{ ...cardStyle }}>
          {[
            { label: `Balance: ${axnBalance.toLocaleString()} AXN`, req: `Min ${minAxn.toLocaleString()} AXN`, met: axnBalance >= minAxn },
            { label: `Friends: ${friendsCount}/3`, req: 'Invite 3 Friends', met: friendsCount >= MIN_FRIENDS },
            { label: `Ad tasks: ${adsWatched}/${MIN_ADS}`, req: 'Complete 10 Ad Tasks', met: adsWatched >= MIN_ADS },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: i > 0 ? '8px 0 0' : '0',
              borderTop: i > 0 ? `1px solid ${BORDER}` : 'none',
              paddingTop: i > 0 ? 8 : 0,
            }}>
              <span style={{ color: r.met ? TEXT : TEXT_DIM, fontSize: 12 }}>{r.req}</span>
              <span style={{ color: r.met ? '#4ade80' : TEXT_DIM, fontSize: 12 }}>{r.label}</span>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 14 }}>
          {([{ id: 'ton', label: 'TON Withdrawal' }, { id: 'usd', label: 'USD Withdrawal' }] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 0', border: 'none', background: 'transparent',
              fontFamily: MONO, fontSize: 12, letterSpacing: '0.05em',
              color: tab === t.id ? AMBER_BRIGHT : TEXT_DIM,
              borderBottom: tab === t.id ? `2px solid ${AMBER_BRIGHT}` : '2px solid transparent',
              cursor: 'pointer', marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {tab === 'ton' && (
              <div>
                {/* TON live price strip */}
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: TEXT_DIM, fontSize: 12 }}>TON Network · Live Price</span>
                  <span style={{ color: AMBER_BRIGHT, fontSize: 14, fontWeight: 700 }}>
                    {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)}` : 'N/A'}
                  </span>
                </div>

                <div style={{ ...cardStyle }}>
                  <div style={{ color: TEXT_DIM, fontSize: 11, marginBottom: 6 }}>TON Wallet Address</div>
                  <input type="text" value={tonAddress} onChange={e => setTonAddress(e.target.value)}
                    placeholder="Enter your TON wallet address"
                    style={{ ...fieldStyle, marginBottom: 10, fontFamily: 'monospace' }} />
                  <div style={{ color: TEXT_DIM, fontSize: 11, marginBottom: 6 }}>Memo (optional)</div>
                  <input type="text" value={tonMemo} onChange={e => setTonMemo(e.target.value)}
                    placeholder="Memo / Tag (if required)"
                    style={{ ...fieldStyle, marginBottom: 10 }} />
                  <div style={{ color: TEXT_DIM, fontSize: 11, marginBottom: 6 }}>Amount (AXN)</div>
                  <input type="number" value={tonAmount} onChange={e => setTonAmount(e.target.value)}
                    placeholder={`Min ${minAxn.toLocaleString()} AXN`}
                    style={{ ...fieldStyle, marginBottom: 0 }} />
                </div>

                <button
                  onClick={handleTonWithdraw}
                  disabled={withdrawMutation.isPending || !meetsRequirements}
                  style={{
                    width: '100%', padding: '13px 0', border: `1px solid ${meetsRequirements ? AMBER_BRIGHT : BORDER}`,
                    background: meetsRequirements ? '#1c1100' : '#1a1a1a',
                    color: meetsRequirements ? AMBER_BRIGHT : TEXT_DIM,
                    fontFamily: MONO, fontSize: 14, cursor: meetsRequirements ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 0,
                  }}
                >
                  {withdrawMutation.isPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
                  {meetsRequirements ? '→ Withdraw TON ←' : 'Requirements Not Met'}
                </button>
              </div>
            )}

            {tab === 'usd' && (
              <div>
                {/* Warning */}
                <div style={{ ...cardStyle, borderLeft: `2px solid #ef4444`, background: '#120000', marginBottom: 10 }}>
                  <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>⚠ IMPORTANT WARNING</div>
                  <div style={{ color: TEXT_DIM, fontSize: 12, lineHeight: 1.6 }}>
                    Only send to a BEP-20 (BSC) USDT address starting with{' '}
                    <span style={{ color: AMBER_BRIGHT, fontFamily: 'monospace' }}>0x</span>.
                    Sending to wrong network will result in permanent loss of funds.
                  </div>
                  <div style={{ marginTop: 8, padding: '6px 10px', background: '#1a0000', border: '1px solid #ef444433' }}>
                    <span style={{ color: '#f87171', fontSize: 11 }}>Network: BSC (BEP-20)</span>
                  </div>
                </div>

                <div style={{ ...cardStyle }}>
                  <div style={{ color: TEXT_DIM, fontSize: 11, marginBottom: 6 }}>USDT Address (BEP-20)</div>
                  <input type="text" value={usdAddress} onChange={e => setUsdAddress(e.target.value)}
                    placeholder="0x... BSC address"
                    style={{ ...fieldStyle, marginBottom: 10, fontFamily: 'monospace' }} />
                  <div style={{ color: TEXT_DIM, fontSize: 11, marginBottom: 6 }}>Amount (AXN)</div>
                  <input type="number" value={usdAmount} onChange={e => setUsdAmount(e.target.value)}
                    placeholder={`Min ${minAxn.toLocaleString()} AXN`}
                    style={{ ...fieldStyle, marginBottom: 0 }} />
                </div>

                <button
                  onClick={handleUsdWithdraw}
                  disabled={withdrawMutation.isPending || !meetsRequirements}
                  style={{
                    width: '100%', padding: '13px 0', border: `1px solid ${meetsRequirements ? '#22c55e' : BORDER}`,
                    background: meetsRequirements ? '#002210' : '#1a1a1a',
                    color: meetsRequirements ? '#4ade80' : TEXT_DIM,
                    fontFamily: MONO, fontSize: 14, cursor: meetsRequirements ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {withdrawMutation.isPending ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
                  {meetsRequirements ? '→ Withdraw USDT ←' : 'Requirements Not Met'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
