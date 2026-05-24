import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#A78BFA';
const PURPLE_DIM = 'rgba(167,139,250,0.6)';
const CARD_BG = 'rgba(18,12,36,0.97)';
const BORDER = 'rgba(124,58,237,0.15)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

const cardStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: '14px',
  marginBottom: 10,
};

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 44,
  background: 'rgba(124,58,237,0.08)',
  border: '1px solid rgba(124,58,237,0.2)',
  color: TEXT,
  fontSize: 13, padding: '0 12px', outline: 'none',
  boxSizing: 'border-box',
  borderRadius: 12,
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

  const requirements = [
    {
      label: `Min ${minAxn.toLocaleString()} AXN`,
      progress: `${axnBalance.toLocaleString()} / ${minAxn.toLocaleString()}`,
      met: axnBalance >= minAxn,
    },
    {
      label: 'Invite 3 Friends',
      progress: `${friendsCount} / 3`,
      met: friendsCount >= MIN_FRIENDS,
    },
    {
      label: 'Complete 10 Ad Tasks',
      progress: `${adsWatched} / ${MIN_ADS}`,
      met: adsWatched >= MIN_ADS,
    },
  ];

  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0614', display: 'flex', flexDirection: 'column' }}>

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onWithdrawOpen={() => setLocation('/wallet')}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', paddingBottom: 80, paddingTop: 90 }}>

        {/* Balance Card */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(91,33,182,0.12) 100%)',
          border: '1px solid rgba(124,58,237,0.28)',
          borderRadius: 22, padding: '18px 16px',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #A78BFA, transparent)' }} />
          <div style={{ paddingLeft: 4 }}>
            <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>AXN Balance</p>
            <p style={{ color: TEXT, fontSize: 34, fontWeight: 900, margin: '0 0 2px', letterSpacing: '-1px' }}>
              {axnBalance.toLocaleString()}
              <span style={{ color: PURPLE_DIM, fontSize: 16, fontWeight: 700, marginLeft: 8 }}>AXN</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
              <div style={{ background: 'rgba(124,58,237,0.1)', borderRadius: 12, padding: '8px 10px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <p style={{ color: TEXT_DIM, fontSize: 9, margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>TON Value</p>
                <p style={{ color: PURPLE_LIGHT, fontSize: 13, fontWeight: 900, margin: '2px 0 0' }}>{tonValue.toFixed(4)}</p>
              </div>
              <div style={{ background: 'rgba(74,222,128,0.07)', borderRadius: 12, padding: '8px 10px', border: '1px solid rgba(74,222,128,0.12)' }}>
                <p style={{ color: TEXT_DIM, fontSize: 9, margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>USD Value</p>
                <p style={{ color: '#4ade80', fontSize: 13, fontWeight: 900, margin: '2px 0 0' }}>
                  {tonLoading ? '—' : usdValue !== null ? `$${usdValue.toFixed(4)}` : '—'}
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ color: TEXT_DIM, fontSize: 9, margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>TON Price</p>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 900, margin: '2px 0 0' }}>
                  {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)}` : 'N/A'}
                </p>
              </div>
            </div>
            <p style={{ color: 'rgba(167,139,250,0.35)', fontSize: 10, margin: '10px 0 0' }}>1,000 AXN = 0.01 TON · Live price</p>
          </div>
        </div>

        {/* Requirements */}
        <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Withdrawal Requirements
        </p>
        <div style={{ ...cardStyle, marginBottom: 14, padding: '12px 14px' }}>
          {requirements.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: i > 0 ? '10px 0 0' : '0',
              borderTop: i > 0 ? '1px solid rgba(124,58,237,0.07)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: r.met ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${r.met ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.met ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                  )}
                </div>
                <span style={{ color: r.met ? TEXT : TEXT_DIM, fontSize: 13, fontWeight: r.met ? 700 : 500 }}>{r.label}</span>
              </div>
              <span style={{
                color: r.met ? '#4ade80' : TEXT_DIM,
                fontSize: 11, fontWeight: 800,
                background: r.met ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${r.met ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 50, padding: '3px 12px', whiteSpace: 'nowrap',
              }}>{r.met ? 'Done' : r.progress}</span>
            </div>
          ))}
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 14,
          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.1)',
          borderRadius: 50, padding: 4,
        }}>
          {([{ id: 'ton' as Tab, label: 'TON Network' }, { id: 'usd' as Tab, label: 'USDT (BEP-20)' }]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 0', border: 'none',
              background: tab === t.id ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'transparent',
              fontSize: 12, fontWeight: tab === t.id ? 800 : 600,
              color: tab === t.id ? '#fff' : TEXT_DIM,
              cursor: 'pointer', borderRadius: 50,
              boxShadow: tab === t.id ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

            {tab === 'ton' && (
              <div>
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: TEXT_DIM, fontSize: 12, fontWeight: 600 }}>TON Network · Live Price</span>
                  <span style={{ color: PURPLE_LIGHT, fontSize: 14, fontWeight: 900 }}>
                    {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div style={{ ...cardStyle }}>
                  <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>TON Wallet Address</div>
                  <input type="text" value={tonAddress} onChange={e => setTonAddress(e.target.value)}
                    placeholder="Enter your TON wallet address"
                    style={{ ...fieldStyle, marginBottom: 12 }} />
                  <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Memo (optional)</div>
                  <input type="text" value={tonMemo} onChange={e => setTonMemo(e.target.value)}
                    placeholder="Memo / Tag (if required)"
                    style={{ ...fieldStyle, marginBottom: 12 }} />
                  <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Amount (AXN)</div>
                  <input type="number" value={tonAmount} onChange={e => setTonAmount(e.target.value)}
                    placeholder={`Min ${minAxn.toLocaleString()} AXN`}
                    style={{ ...fieldStyle }} />
                </div>
                <button
                  onClick={handleTonWithdraw}
                  disabled={withdrawMutation.isPending || !meetsRequirements}
                  className="active:scale-95 transition-transform"
                  style={{
                    width: '100%', padding: '13px 0',
                    background: meetsRequirements ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${meetsRequirements ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: meetsRequirements ? '#fff' : TEXT_DIM,
                    fontSize: 14, fontWeight: 800,
                    cursor: meetsRequirements ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderRadius: 50,
                    boxShadow: meetsRequirements ? '0 4px 16px rgba(124,58,237,0.4)' : 'none',
                  }}
                >
                  {withdrawMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {meetsRequirements ? 'Withdraw TON' : 'Requirements Not Met'}
                </button>
              </div>
            )}

            {tab === 'usd' && (
              <div>
                <div style={{
                  ...cardStyle,
                  borderLeft: '3px solid #ef4444',
                  background: 'rgba(239,68,68,0.05)',
                  marginBottom: 10,
                }}>
                  <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>IMPORTANT WARNING</div>
                  <div style={{ color: TEXT_DIM, fontSize: 12, lineHeight: 1.6 }}>
                    Only send to a <strong style={{ color: '#fff' }}>BEP-20 (BSC)</strong> USDT address starting with{' '}
                    <span style={{ color: PURPLE_LIGHT, fontFamily: 'monospace' }}>0x</span>.
                    Wrong network = permanent loss of funds.
                  </div>
                  <div style={{ marginTop: 8, padding: '5px 10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8 }}>
                    <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>Network: BSC (BEP-20)</span>
                  </div>
                </div>
                <div style={{ ...cardStyle }}>
                  <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>USDT Address (BEP-20)</div>
                  <input type="text" value={usdAddress} onChange={e => setUsdAddress(e.target.value)}
                    placeholder="0x... BSC address"
                    style={{ ...fieldStyle, marginBottom: 12, fontFamily: 'monospace' }} />
                  <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Amount (AXN)</div>
                  <input type="number" value={usdAmount} onChange={e => setUsdAmount(e.target.value)}
                    placeholder={`Min ${minAxn.toLocaleString()} AXN`}
                    style={{ ...fieldStyle }} />
                </div>
                <button
                  onClick={handleUsdWithdraw}
                  disabled={withdrawMutation.isPending || !meetsRequirements}
                  className="active:scale-95 transition-transform"
                  style={{
                    width: '100%', padding: '13px 0',
                    background: meetsRequirements ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${meetsRequirements ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: meetsRequirements ? '#fff' : TEXT_DIM,
                    fontSize: 14, fontWeight: 800,
                    cursor: meetsRequirements ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderRadius: 50,
                    boxShadow: meetsRequirements ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
                  }}
                >
                  {withdrawMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {meetsRequirements ? 'Withdraw USDT' : 'Requirements Not Met'}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
