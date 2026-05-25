import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import WithdrawPopup from "@/components/WithdrawPopup";

const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.35)';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.07)';
const GOLD = '#F5C400';

const TON_PER_AXN = 0.00001;

function toUserFriendlyAddress(raw: string): string {
  try {
    if (raw.length > 16) return raw.slice(0, 6) + '...' + raw.slice(-4);
    return raw;
  } catch {
    return raw;
  }
}

export default function Wallet() {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tonPrice, setTonPrice] = useState<number | null>(null);
  const [tonLoading, setTonLoading] = useState(true);

  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const queryClient = useQueryClient();
  const savedRef = useRef(false);

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const tonBalance = parseFloat(user?.tonBalance || '0');
  const AXN_PRICE_USD = tonPrice ? TON_PER_AXN * tonPrice : 0;
  const axnUsdValue = tonPrice ? axnBalance * TON_PER_AXN * tonPrice : 0;
  const tonUsdValue = tonPrice ? tonBalance * tonPrice : 0;
  const totalUsd = axnUsdValue + tonUsdValue;

  const connectedAddress = wallet?.account?.address
    ? toUserFriendlyAddress(wallet.account.address)
    : (user?.tonWalletAddress
        ? toUserFriendlyAddress(user.tonWalletAddress)
        : '');

  useEffect(() => {
    setTonLoading(true);
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setTonPrice(d?.['the-open-network']?.usd ?? null))
      .catch(() => {})
      .finally(() => setTonLoading(false));
  }, []);

  useEffect(() => {
    if (wallet?.account?.address && !savedRef.current) {
      savedRef.current = true;
      apiRequest('POST', '/api/wallet/save', { tonWalletAddress: wallet.account.address })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          showNotification('Wallet connected!', 'success');
        })
        .catch(() => {});
    }
    if (!wallet) savedRef.current = false;
  }, [wallet?.account?.address]);

  const handleConnect = () => {
    tonConnectUI.openModal();
  };

  const handleDisconnect = async () => {
    await tonConnectUI.disconnect();
    savedRef.current = false;
    await apiRequest('POST', '/api/wallet/save', { tonWalletAddress: '' }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    showNotification('Wallet disconnected', 'info');
  };

  const QUICK_ITEMS = [
    {
      label: 'History',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      color: GOLD,
      action: () => showNotification('Coming soon', 'info'),
    },
    {
      label: 'Route',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      color: '#a78bfa',
      action: () => showNotification('Coming soon', 'info'),
    },
    {
      label: 'White Paper',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
      color: '#34d399',
      action: () => window.open('https://axionet.io/whitepaper', '_blank'),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setWithdrawOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 90, paddingTop: 88 }}>

        {/* ── Portfolio card ── */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 20, padding: '20px 18px', marginBottom: 10,
        }}>
          <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Total Portfolio
          </div>
          <div style={{ color: TEXT, fontSize: 32, fontWeight: 900, letterSpacing: '-1px', marginBottom: 14 }}>
            ${totalUsd.toFixed(2)}
            <span style={{ color: TEXT_DIM, fontSize: 13, fontWeight: 500, marginLeft: 6 }}>USD</span>
          </div>

          {/* Wallet status */}
          {connectedAddress ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
              borderRadius: 50, padding: '4px 12px', marginBottom: 14,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                Wallet Connected ✔
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}>
                {connectedAddress}
              </span>
            </div>
          ) : null}

          {/* Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {connectedAddress ? (
              <button
                onClick={handleDisconnect}
                className="active:scale-95 transition-transform"
                style={{
                  padding: '12px 0', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', borderRadius: 12,
                  color: TEXT_DIM, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="active:scale-95 transition-transform"
                style={{
                  padding: '12px 0', border: `1px solid ${GOLD}40`,
                  background: `${GOLD}12`, borderRadius: 12,
                  color: GOLD, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Connect Wallet
              </button>
            )}
            <button
              onClick={() => setWithdrawOpen(true)}
              className="active:scale-95 transition-transform"
              style={{
                padding: '12px 0', border: 'none',
                background: GOLD, borderRadius: 12,
                color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              Withdraw AXN
            </button>
          </div>
        </div>

        {/* ── Quick shortcuts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {QUICK_ITEMS.map(item => (
            <button key={item.label} onClick={item.action} className="active:scale-95 transition-transform" style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '14px 6px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${item.color}14`, border: `1px solid ${item.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.color,
              }}>
                {item.icon}
              </div>
              <span style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 600 }}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* ── Asset Balance label ── */}
        <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Asset Balance
        </div>

        {/* AXN Row */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>AXN</span>
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>AXIONET</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>AXN Token</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>{axnBalance.toLocaleString()}</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>
                {tonLoading ? '...' : AXN_PRICE_USD > 0 ? `$${AXN_PRICE_USD.toFixed(6)}/AXN` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* TON Row */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0088cc, #005a99)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4h3V8h2v4h3l-4 4z"/>
                </svg>
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>TON</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>The Open Network</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>{tonBalance.toFixed(4)}</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>
                {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)}/TON` : ''}
              </div>
            </div>
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'center', marginTop: 8 }}>
          1,000 AXN = 0.01 TON · Live CoinGecko price
        </div>
      </div>

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
