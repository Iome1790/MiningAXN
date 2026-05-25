import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import WithdrawPopup from "@/components/WithdrawPopup";

const CARD = 'rgba(10,10,10,0.97)';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.35)';
const PURPLE = '#2563eb';
const PURPLE_L = '#60a5fa';

const animStyles = `
@keyframes wlt-glow-pulse { 0%,100%{opacity:0.5}50%{opacity:1} }
@keyframes wlt-shimmer { 0%{left:-60%}100%{left:110%} }
`;

const TON_PER_AXN = 0.00001;

function ConnectWalletModal({ onClose, onConnect, savedAddress }: { onClose: () => void; onConnect: (addr: string) => void; savedAddress?: string }) {
  const [step, setStep] = useState<'choose' | 'input'>(savedAddress ? 'input' : 'choose');
  const [manualAddr, setManualAddr] = useState(savedAddress || '');
  const [saving, setSaving] = useState(false);

  const WALLETS = [
    { name: 'Tonkeeper', color: '#0088CC', icon: '💎', deepLink: 'tonkeeper://' },
    { name: 'MyTonWallet', color: '#2563eb', icon: '🔷', deepLink: 'mytonwallet://' },
    { name: 'OpenMask', color: '#2563eb', icon: '🔮', deepLink: null },
    { name: 'Tonhub', color: '#10b981', icon: '🏠', deepLink: 'tonhub://' },
  ];

  const handleWalletClick = (w: typeof WALLETS[0]) => {
    if (w.deepLink) {
      window.open(w.deepLink, '_blank');
    }
    setStep('input');
  };

  const handleSave = async () => {
    if (!manualAddr.trim()) { showNotification('Enter wallet address', 'error'); return; }
    setSaving(true);
    try {
      await apiRequest('POST', '/api/wallet/save', { tonWalletAddress: manualAddr.trim() });
      showNotification('Wallet connected!', 'success');
      onConnect(manualAddr.trim());
      onClose();
    } catch {
      showNotification('Failed to save wallet', 'error');
    }
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'linear-gradient(160deg, #0a0a0c, #111118)',
        border: '1px solid rgba(37,99,235,0.22)',
        borderRadius: '28px 28px 0 0', padding: '28px 20px 44px',
        boxShadow: '0 -8px 60px rgba(37,99,235,0.18)',
        position: 'relative', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #2563eb, transparent)' }} />
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ color: TEXT, fontSize: 18, fontWeight: 900 }}>
              {step === 'choose' ? 'Connect Wallet' : 'Enter Address'}
            </div>
            <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2 }}>
              {step === 'choose' ? 'Select your TON wallet' : 'Paste your TON wallet address'}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'choose' ? (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {WALLETS.map(w => (
                  <button key={w.name} onClick={() => handleWalletClick(w)} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16, padding: '16px 12px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }} className="active:scale-95 transition-transform">
                    <div style={{ fontSize: 28 }}>{w.icon}</div>
                    <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{w.name}</div>
                    <div style={{
                      background: `rgba(${w.color.slice(1).match(/.{2}/g)!.map(h=>parseInt(h,16)).join(',')},0.15)`,
                      border: `1px solid ${w.color}30`,
                      borderRadius: 50, padding: '3px 10px',
                      color: w.color, fontSize: 10, fontWeight: 700,
                    }}>Connect</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('input')} style={{
                width: '100%', padding: '12px 0', border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent', borderRadius: 50,
                color: TEXT_DIM, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Enter address manually</button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <input
                type="text" value={manualAddr} onChange={e => setManualAddr(e.target.value)}
                placeholder="Enter TON wallet address"
                style={{
                  width: '100%', height: 48,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(37,99,235,0.2)',
                  color: TEXT, fontSize: 13, padding: '0 14px', outline: 'none',
                  boxSizing: 'border-box', borderRadius: 12, marginBottom: 16,
                }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                {savedAddress ? null : (
                  <button onClick={() => setStep('choose')} style={{
                    flex: 1, padding: '13px 0', border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', borderRadius: 50,
                    color: TEXT_DIM, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>Back</button>
                )}
                <button onClick={handleSave} disabled={saving} style={{
                  flex: 2, padding: '13px 0', border: 'none', borderRadius: 50,
                  background: 'linear-gradient(135deg, #2563eb, #2563eb)',
                  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                  opacity: saving ? 0.7 : 1,
                }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Save Wallet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Wallet() {
  const [connectOpen, setConnectOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tonPrice, setTonPrice] = useState<number | null>(null);
  const [tonLoading, setTonLoading] = useState(true);
  const [connectedAddress, setConnectedAddress] = useState('');

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: wellData } = useQuery<any>({ queryKey: ['/api/referrals/well'], staleTime: 30000 });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.tonWalletAddress) setConnectedAddress(user.tonWalletAddress);
  }, [user?.tonWalletAddress]);

  useEffect(() => {
    setTonLoading(true);
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setTonPrice(d?.['the-open-network']?.usd ?? null))
      .catch(() => {})
      .finally(() => setTonLoading(false));
  }, []);

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const tonBalance = parseFloat(user?.tonBalance || '0');
  const axnTonValue = axnBalance * TON_PER_AXN;
  const axnUsdValue = tonPrice ? axnTonValue * tonPrice : 0;
  const tonUsdValue = tonPrice ? tonBalance * tonPrice : 0;
  const totalUsd = axnUsdValue + tonUsdValue;

  const QUICK_ITEMS = [
    {
      label: 'History', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ), color: '#60a5fa', action: () => showNotification('Coming soon', 'info'),
    },
    {
      label: 'Route', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ), color: '#a78bfa', action: () => showNotification('Coming soon', 'info'),
    },
    {
      label: 'White Paper', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      ), color: '#34d399', action: () => window.open('https://axionet.io/whitepaper', '_blank'),
    },
  ];

  const AXN_PRICE_USD = tonPrice ? TON_PER_AXN * tonPrice : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>
      <style>{animStyles}</style>

      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setWithdrawOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 86, paddingTop: 88 }}>

        {/* ── Portfolio Header ── */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(160deg, #0d0d14 0%, #111120 100%)',
          border: '1px solid rgba(37,99,235,0.2)',
          borderRadius: 22, padding: '20px 18px', marginBottom: 12,
          boxShadow: '0 4px 40px rgba(37,99,235,0.1)',
        }}>
          {/* Shimmer */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 22, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, width: '60%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)',
              animation: 'wlt-shimmer 3s ease-in-out infinite',
            }} />
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, transparent)', animation: 'wlt-glow-pulse 2.5s infinite' }} />

          <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            User Total Portfolio
          </div>
          <div style={{ color: TEXT, fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 18, lineHeight: 1 }}>
            ${totalUsd.toFixed(2)}
            <span style={{ color: TEXT_DIM, fontSize: 14, fontWeight: 600, marginLeft: 8 }}>USD</span>
          </div>

          {/* Wallet status */}
          {connectedAddress ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 50, padding: '5px 14px', marginBottom: 16,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                {connectedAddress.slice(0, 8)}...{connectedAddress.slice(-6)}
              </span>
            </div>
          ) : null}

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => setConnectOpen(true)} className="active:scale-95 transition-transform" style={{
              padding: '13px 0', border: '1px solid rgba(37,99,235,0.35)', cursor: 'pointer',
              background: 'rgba(37,99,235,0.1)', borderRadius: 14,
              color: '#60a5fa', fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 0 16px rgba(37,99,235,0.15)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              {connectedAddress ? 'Change Wallet' : 'Connect Wallet'}
            </button>
            <button onClick={() => setWithdrawOpen(true)} className="active:scale-95 transition-transform" style={{
              padding: '13px 0', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #2563eb)',
              borderRadius: 14, color: '#fff', fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
              Withdraw AXN
            </button>
          </div>
        </div>

        {/* ── Quick Options ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {QUICK_ITEMS.map(item => (
            <button key={item.label} onClick={item.action} className="active:scale-95 transition-transform" style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 16, padding: '14px 8px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: `${item.color}12`, border: `1px solid ${item.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.color,
              }}>
                {item.icon}
              </div>
              <span style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700 }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* ── Asset Balance Section ── */}
        <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Asset Balance
        </div>

        {/* AXIONET (AXN) */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 18, padding: '16px 16px', marginBottom: 8,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #f59e0b, transparent)' }} />
          <div style={{ paddingLeft: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(245,158,11,0.35)',
                }}>
                  <span style={{ color: '#000', fontSize: 11, fontWeight: 900 }}>AXN</span>
                </div>
                <div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>AXIONET</div>
                  <div style={{ color: TEXT_DIM, fontSize: 11 }}>AXN Token</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: TEXT, fontSize: 16, fontWeight: 900 }}>{axnBalance.toLocaleString()}</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>AXN</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'AXN Balance', value: axnBalance.toLocaleString(), color: '#f59e0b' },
                { label: 'AXN Price', value: tonLoading ? '...' : AXN_PRICE_USD > 0 ? `$${AXN_PRICE_USD.toFixed(6)}` : 'N/A', color: '#60a5fa' },
                { label: 'USD Value', value: `$${axnUsdValue.toFixed(4)}`, color: '#4ade80' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10, padding: '8px 6px', textAlign: 'center',
                }}>
                  <div style={{ color: s.color, fontSize: 12, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TON */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 18, padding: '16px 16px', marginBottom: 8,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #0088cc, transparent)' }} />
          <div style={{ paddingLeft: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #0088cc, #005a99)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(0,136,204,0.3)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4h3V8h2v4h3l-4 4z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>TON</div>
                  <div style={{ color: TEXT_DIM, fontSize: 11 }}>The Open Network</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: TEXT, fontSize: 16, fontWeight: 900 }}>{tonBalance.toFixed(4)}</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>TON</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'TON Balance', value: tonBalance.toFixed(4), color: '#0088cc' },
                { label: 'USD Value', value: `$${tonUsdValue.toFixed(4)}`, color: '#4ade80' },
                { label: 'TON Price', value: tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)}` : 'N/A', color: '#60a5fa' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 10, padding: '8px 6px', textAlign: 'center',
                }}>
                  <div style={{ color: s.color, fontSize: 12, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TON rate note */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center', marginTop: 6 }}>
          1,000 AXN = 0.01 TON · Live CoinGecko price
        </div>
      </div>

      {connectOpen && (
        <ConnectWalletModal
          onClose={() => setConnectOpen(false)}
          onConnect={(addr) => setConnectedAddress(addr)}
          savedAddress={connectedAddress || undefined}
        />
      )}
      {withdrawOpen && (
        <WithdrawPopup
          onClose={() => setWithdrawOpen(false)}
          userBalance={axnBalance}
          connectedAddress={connectedAddress || undefined}
        />
      )}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
