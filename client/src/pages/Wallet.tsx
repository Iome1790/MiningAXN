import { useState, useEffect, Component, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTonConnectUI, useTonWallet, useTonAddress } from "@tonconnect/ui-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import WithdrawPopup from "@/components/WithdrawPopup";

// ── TonConnect isolation ──────────────────────────────────────────
// Hooks are in this sub-component; if the SDK throws during init
// only this button fails — the rest of the Wallet page stays up.
class TonConnectErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(e: unknown) { console.warn("[TonConnect]", e); }
  render() {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}

function ConnectWalletButton({ onConnected }: { onConnected?: (addr: string) => void }) {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  // useTonAddress returns the user-friendly EQ.../UQ... format (not raw hex)
  const friendlyAddress = useTonAddress();

  useEffect(() => {
    if (friendlyAddress && onConnected) {
      onConnected(friendlyAddress);
    }
  }, [friendlyAddress]);

  if (wallet) {
    return (
      <button
        onClick={() => tonConnectUI.disconnect()}
        style={{
          width: '100%', padding: '13px 0', border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.04)', borderRadius: 14,
          color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 7,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
          <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
        </svg>
        Disconnect Wallet
      </button>
    );
  }

  return (
    <button
      onClick={() => tonConnectUI.openModal()}
      style={{
        width: '100%', padding: '13px 0', border: '1px solid rgba(59,130,246,0.3)',
        background: 'rgba(255,255,255,0.04)', borderRadius: 14,
        color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 7,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>
      </svg>
      Connect TON Wallet
    </button>
  );
}

function ConnectWalletSection({ onConnected }: { onConnected?: (addr: string) => void }) {
  return (
    <TonConnectErrorBoundary
      fallback={
        <div style={{
          width: '100%', padding: '13px 0', border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.03)', borderRadius: 14,
          color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600,
          textAlign: 'center',
        }}>
          Wallet connection unavailable
        </div>
      }
    >
      <ConnectWalletButton onConnected={onConnected} />
    </TonConnectErrorBoundary>
  );
}

const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.35)';
const CARD = 'rgba(255,255,255,0.04)';
const BORDER = 'rgba(255,255,255,0.07)';
const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';
const TON_PER_AXN = 0.00001;

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
  const [addressInput, setAddressInput] = useState('');
  const [addressEditing, setAddressEditing] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [chainTonBalance, setChainTonBalance] = useState<number | null>(null);
  const [chainAxnBalance, setChainAxnBalance] = useState<number | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: withdrawalsData } = useQuery<any>({
    queryKey: ['/api/withdrawals'],
    staleTime: 30000,
  });

  const poolAxnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const savedAddress: string = user?.tonWalletAddress || '';
  const withdrawalHistory: any[] = withdrawalsData?.withdrawals ?? [];

  const AXN_PRICE_USD = tonPrice ? TON_PER_AXN * tonPrice : 0;
  const poolAxnUsd = tonPrice ? poolAxnBalance * TON_PER_AXN * tonPrice : 0;
  const chainTonUsd = tonPrice && chainTonBalance !== null ? chainTonBalance * tonPrice : 0;
  const chainAxnUsd = tonPrice && chainAxnBalance !== null ? chainAxnBalance * TON_PER_AXN * tonPrice : 0;
  const totalUsd = poolAxnUsd + chainTonUsd + chainAxnUsd;

  useEffect(() => {
    if (user?.tonWalletAddress) {
      setAddressInput(user.tonWalletAddress);
    }
  }, [user?.tonWalletAddress]);

  useEffect(() => {
    setTonLoading(true);
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setTonPrice(d?.['the-open-network']?.usd ?? null))
      .catch(() => {})
      .finally(() => setTonLoading(false));
  }, []);

  // Fetch real blockchain balances when wallet address is available
  useEffect(() => {
    const address = savedAddress || addressInput.trim();
    if (!address || address.length < 10) {
      setChainTonBalance(null);
      setChainAxnBalance(null);
      return;
    }
    setChainLoading(true);
    // Fetch TON native balance from TonCenter API
    fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(d => {
        if (d?.ok && d?.result) {
          const nanotons = parseInt(d.result, 10);
          setChainTonBalance(nanotons / 1e9);
        }
      })
      .catch(() => {})
      .finally(() => setChainLoading(false));

    // Fetch AXN Jetton balance — AXN contract on TON mainnet
    // Uses TON API v2 jetton balance endpoint
    const AXN_JETTON_MASTER = 'EQD0vdSA_NedR9uvbgN9OixH55vx673V4vCojeL-eCYih2D5';
    fetch(`https://toncenter.com/api/v2/getTokenData?address=${encodeURIComponent(AXN_JETTON_MASTER)}`)
      .catch(() => {});
    // Attempt jetton balance via tonapi.io
    fetch(`https://tonapi.io/v2/accounts/${encodeURIComponent(address)}/jettons?currencies=ton,usd`)
      .then(r => r.json())
      .then(d => {
        const balances = d?.balances ?? [];
        const axnEntry = balances.find((b: any) =>
          b?.jetton?.symbol?.toUpperCase() === 'AXN' ||
          b?.jetton?.name?.toLowerCase().includes('axionet')
        );
        if (axnEntry) {
          const decimals = axnEntry.jetton?.decimals ?? 9;
          const raw = parseInt(axnEntry.balance ?? '0', 10);
          setChainAxnBalance(raw / Math.pow(10, decimals));
        }
      })
      .catch(() => {});
  }, [savedAddress, addressInput]);

  const handleSaveAddress = async () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      showNotification('Please enter a wallet address', 'error');
      return;
    }
    setSavingAddress(true);
    try {
      await apiRequest('POST', '/api/wallet/save', { tonWalletAddress: trimmed });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setAddressEditing(false);
      showNotification('Wallet address saved!', 'success');
    } catch {
      showNotification('Failed to save address. Try again.', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleRemoveAddress = async () => {
    setSavingAddress(true);
    try {
      await apiRequest('POST', '/api/wallet/save', { tonWalletAddress: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setAddressInput('');
      setAddressEditing(false);
      showNotification('Wallet address removed', 'info');
    } catch {
      showNotification('Failed to remove address', 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>
      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setWithdrawOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 90, paddingTop: 88 }}>

        {/* ── Portfolio ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ color: TEXT_DIM, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            Total Portfolio
          </div>
          <div style={{ color: TEXT, fontSize: 38, fontWeight: 900, letterSpacing: '-1.5px', marginBottom: 4 }}>
            ${totalUsd.toFixed(2)}
            <span style={{ color: TEXT_DIM, fontSize: 14, fontWeight: 500, marginLeft: 8 }}>USD</span>
          </div>

          {/* Saved address display */}
          {savedAddress && !addressEditing && (
            <div style={{ marginBottom: 10, marginTop: 4 }}>
              {/* Status pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)',
                borderRadius: 50, padding: '4px 12px', marginBottom: 8,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>Wallet Connected</span>
              </div>
              {/* Short address with copy */}
              <div
                onClick={() => {
                  navigator.clipboard?.writeText(savedAddress)
                    .then(() => showNotification('Address copied!', 'success'))
                    .catch(() => showNotification('Copy failed', 'error'));
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(34,197,94,0.2)', borderRadius: 50,
                  padding: '5px 12px', cursor: 'pointer',
                }}
              >
                <span style={{ color: '#4ade80', fontSize: 12, fontFamily: 'monospace' }}>
                  {shortAddress(savedAddress)}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </div>
            </div>
          )}

          {/* Wallet address input */}
          <div style={{ marginTop: savedAddress && !addressEditing ? 6 : 14, marginBottom: 6 }}>
            {addressEditing || !savedAddress ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  fontSize: 11, color: TEXT_DIM, textAlign: 'left', marginBottom: 2,
                }}>
                  Enter your TON wallet address for withdrawals
                </div>
                <input
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  placeholder="EQ... or UQ... wallet address"
                  style={{
                    width: '100%', padding: '12px 14px', background: CARD,
                    border: `1px solid rgba(59,130,246,0.35)`, borderRadius: 12,
                    color: TEXT, fontSize: 13, fontFamily: 'monospace',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSaveAddress}
                    disabled={savingAddress}
                    style={{
                      flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer',
                      background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
                      borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 800,
                      opacity: savingAddress ? 0.6 : 1,
                    }}
                  >
                    {savingAddress ? 'Saving...' : 'Save Address'}
                  </button>
                  {savedAddress && (
                    <button
                      onClick={() => { setAddressEditing(false); setAddressInput(savedAddress); }}
                      style={{
                        padding: '12px 16px', background: CARD,
                        border: `1px solid ${BORDER}`, borderRadius: 12,
                        color: TEXT_DIM, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setAddressEditing(true)}
                  style={{
                    flex: 1, padding: '12px 0',
                    border: `1px solid rgba(255,255,255,0.1)`,
                    background: CARD, borderRadius: 12,
                    color: TEXT_DIM, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Change Address
                </button>
                <button
                  onClick={handleRemoveAddress}
                  disabled={savingAddress}
                  style={{
                    padding: '12px 16px', background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12,
                    color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Connect TON Wallet — SDK button, safely isolated */}
          <div style={{ marginTop: 10 }}>
            <ConnectWalletSection
              onConnected={(addr) => {
                setAddressInput(addr);
                apiRequest('POST', '/api/wallet/save', { tonWalletAddress: addr })
                  .then(() => queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }))
                  .catch(() => {});
              }}
            />
          </div>

          {/* Withdraw button — always visible */}
          <button
            onClick={() => setWithdrawOpen(true)}
            className="active:scale-95 transition-transform"
            style={{
              width: '100%', marginTop: 10, padding: '14px 0', border: 'none',
              background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
              borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            Withdraw AXIONET
          </button>
        </div>

        {/* ── Quick shortcuts ── */}
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

        {/* ── Assets ── */}
        <div style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Assets
        </div>

        {/* Holding Wallet — AXN on blockchain */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px', marginBottom: 8 }}>
          <div style={{ color: TEXT_DIM, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Holding Wallet {savedAddress ? '· On-Chain' : '· Connect Wallet'}
          </div>
          {/* AXN Jetton on TON */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 12px rgba(59,130,246,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                overflow: 'hidden', background: '#000',
              }}>
                <img src="/axn-icon.png" alt="AXN" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>AXN (Wallet)</div>
                <div style={{ color: TEXT_DIM, fontSize: 10 }}>
                  {tonLoading ? '...' : AXN_PRICE_USD > 0 ? `$${AXN_PRICE_USD.toFixed(6)} / AXN` : 'AXN Token'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>
                {chainLoading ? '...' : chainAxnBalance !== null ? chainAxnBalance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : (savedAddress ? '0' : '—')}
              </div>
              <div style={{ color: TEXT_DIM, fontSize: 10 }}>
                {!chainLoading && chainAxnBalance !== null && chainAxnUsd > 0 ? `$${chainAxnUsd.toFixed(4)}` : ''}
              </div>
            </div>
          </div>
          {/* TON native */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0088cc, #005a99)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4h3V8h2v4h3l-4 4z"/>
                </svg>
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>TON</div>
                <div style={{ color: TEXT_DIM, fontSize: 10 }}>
                  {tonLoading ? '...' : tonPrice ? `$${tonPrice.toFixed(2)} / TON` : 'The Open Network'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>
                {chainLoading ? '...' : chainTonBalance !== null ? chainTonBalance.toFixed(4) : (savedAddress ? '0' : '—')}
              </div>
              <div style={{ color: TEXT_DIM, fontSize: 10 }}>
                {!chainLoading && chainTonBalance !== null && chainTonUsd > 0 ? `$${chainTonUsd.toFixed(2)}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Pool Reward — mined AXN in app */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '14px', marginBottom: 8 }}>
          <div style={{ color: TEXT_DIM, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Pool Reward · Mining Balance
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '1px solid rgba(59,130,246,0.3)',
                background: 'rgba(37,99,235,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                overflow: 'hidden',
              }}>
                <img src="/axn-icon.png" alt="AXN" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>AXN (Pool)</div>
                <div style={{ color: TEXT_DIM, fontSize: 10 }}>Mining & App Rewards</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{poolAxnBalance.toLocaleString()}</div>
              <div style={{ color: TEXT_DIM, fontSize: 10 }}>
                {tonLoading ? '...' : poolAxnUsd > 0 ? `$${poolAxnUsd.toFixed(4)}` : ''}
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
          connectedAddress={savedAddress || undefined}
        />
      )}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
