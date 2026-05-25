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
const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';

const TON_PER_AXN = 0.00001;

function rawToFriendlyAddress(raw: string): string {
  try {
    if (!raw.includes(':')) return raw;
    const parts = raw.split(':');
    if (parts.length !== 2) return raw;
    const workchain = parseInt(parts[0]);
    const hexAddr = parts[1];
    if (hexAddr.length !== 64) return raw;
    const tag = 0x51;
    const bytes = new Uint8Array(36);
    bytes[0] = tag;
    bytes[1] = workchain & 0xff;
    for (let i = 0; i < 32; i++) {
      bytes[i + 2] = parseInt(hexAddr.slice(i * 2, i * 2 + 2), 16);
    }
    let crc = 0;
    for (let i = 0; i < 34; i++) {
      crc ^= bytes[i] << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    bytes[34] = (crc >> 8) & 0xff;
    bytes[35] = crc & 0xff;
    const b64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return b64;
  } catch {
    return raw;
  }
}

function shortAddress(addr: string): string {
  if (addr.length > 12) return addr.slice(0, 6) + '...' + addr.slice(-4);
  return addr;
}

function formatDate(dateStr: string): { date: string; time: string } {
  try {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
  } catch {
    return { date: dateStr, time: '' };
  }
}

function statusColor(status: string) {
  if (status === 'approved' || status === 'completed' || status === 'paid') return '#4ade80';
  if (status === 'rejected') return '#f87171';
  return '#fbbf24';
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
  const { data: withdrawalsData } = useQuery<any>({
    queryKey: ['/api/withdrawals'],
    staleTime: 30000,
  });

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const tonBalance = parseFloat(user?.tonBalance || '0');
  const AXN_PRICE_USD = tonPrice ? TON_PER_AXN * tonPrice : 0;
  const axnUsdValue = tonPrice ? axnBalance * TON_PER_AXN * tonPrice : 0;
  const tonUsdValue = tonPrice ? tonBalance * tonPrice : 0;
  const totalUsd = axnUsdValue + tonUsdValue;

  const rawWalletAddress = wallet?.account?.address || user?.tonWalletAddress || '';
  const friendlyAddress = rawWalletAddress ? rawToFriendlyAddress(rawWalletAddress) : '';
  const connectedAddress = friendlyAddress;

  const withdrawalHistory: any[] = withdrawalsData?.withdrawals ?? [];

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

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setWithdrawOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 90, paddingTop: 88 }}>

        {/* ── Portfolio section ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ color: TEXT_DIM, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Total Portfolio
          </div>
          <div style={{ color: TEXT, fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 4 }}>
            ${totalUsd.toFixed(2)}
            <span style={{ color: TEXT_DIM, fontSize: 14, fontWeight: 500, marginLeft: 8 }}>USD</span>
          </div>

          {/* Connected wallet pill */}
          {connectedAddress ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
              borderRadius: 50, padding: '4px 12px', marginBottom: 14, marginTop: 4,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>Connected</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }}>
                {shortAddress(connectedAddress)}
              </span>
            </div>
          ) : null}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: connectedAddress ? 0 : 14 }}>
            {connectedAddress ? (
              <button
                onClick={handleDisconnect}
                className="active:scale-95 transition-transform"
                style={{
                  flex: 1, padding: '13px 0', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 14,
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
                  flex: 1, padding: '13px 0',
                  border: `1px solid rgba(59,130,246,0.35)`,
                  background: 'rgba(37,99,235,0.1)', borderRadius: 14,
                  color: BLUE, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 2px 12px rgba(37,99,235,0.15)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
                flex: 1, padding: '13px 0', border: 'none',
                background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
                borderRadius: 14,
                color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              Withdraw AXIONET
            </button>
          </div>
        </div>

        {/* ── Quick shortcuts: Route & White Paper only ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            {
              label: 'Route',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/>
                  <path d="M6 17V9a2 2 0 0 1 2-2h8"/>
                  <polyline points="14 4 18 8 14 12"/>
                </svg>
              ),
              color: '#a78bfa',
              action: () => showNotification('Coming soon', 'info'),
            },
            {
              label: 'White Paper',
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
              ),
              color: '#34d399',
              action: () => window.open('https://axionet.io/whitepaper', '_blank'),
            },
          ].map(item => (
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

        {/* ── Assets section ── */}
        <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Assets
        </div>

        {/* AXN Asset Row */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 12px rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                overflow: 'hidden',
                background: '#000',
              }}>
                <img src="/axn-icon.png" alt="AXN" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>Axionet</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>
                  {tonLoading ? '...' : AXN_PRICE_USD > 0 ? `$${AXN_PRICE_USD.toFixed(6)} / AXN` : 'AXN Token'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>{axnBalance.toLocaleString()}</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>
                {tonLoading ? '...' : axnUsdValue > 0 ? `$${axnUsdValue.toFixed(4)}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* TON Asset Row */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0088cc, #005a99)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4h3V8h2v4h3l-4 4z"/>
                </svg>
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>TON</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>
                  {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)} / TON` : 'The Open Network'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>{tonBalance.toFixed(4)}</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>
                {tonLoading ? '...' : tonUsdValue > 0 ? `$${tonUsdValue.toFixed(2)}` : ''}
              </div>
            </div>
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
          1,000 AXN = 0.01 TON · Live CoinGecko price
        </div>

        {/* ── Withdrawal History ── */}
        <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Withdrawal History
        </div>

        {withdrawalHistory.length === 0 ? (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 14, padding: '24px 16px', textAlign: 'center',
          }}>
            <div style={{ color: TEXT_DIM, fontSize: 13 }}>No withdrawal history yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {withdrawalHistory.map((w: any) => {
              const { date, time } = formatDate(w.createdAt);
              const sc = statusColor(w.status);
              const displayAddr = w.details ? shortAddress(w.details) : (w.address ? shortAddress(w.address) : '—');
              return (
                <div key={w.id} style={{
                  background: CARD, border: `1px solid ${BORDER}`,
                  borderRadius: 14, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{parseFloat(w.amount).toLocaleString()} AXN</span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 50,
                        background: `${sc}18`, border: `1px solid ${sc}40`, color: sc,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{w.status}</span>
                    </div>
                    <div style={{ color: TEXT_DIM, fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayAddr}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 600 }}>{date}</div>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>{time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {withdrawOpen && (
        <WithdrawPopup
          onClose={() => {
            setWithdrawOpen(false);
            queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
          }}
          userBalance={axnBalance}
          connectedAddress={connectedAddress || undefined}
        />
      )}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
