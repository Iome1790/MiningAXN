import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import MenuPopup from "@/components/MenuPopup";
import Header from "@/components/Header";
import { useLocation } from "wouter";
import { showRewardedInterstitial } from "@/lib/showAd";

const TON_PER_AXN = 0.00001;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

type MysteryPhase = 'idle' | 'opening' | 'revealed' | 'claiming' | 'done';

export default function Games() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [tonPrice, setTonPrice] = useState<number | null>(null);
  const [showSendPopup, setShowSendPopup] = useState(false);
  const [showReceivePopup, setShowReceivePopup] = useState(false);
  const [showSwapPopup, setShowSwapPopup] = useState(false);
  const [dailyChecked, setDailyChecked] = useState(() => localStorage.getItem('daily_check_date') === getTodayKey());
  const [dailyAdLoading, setDailyAdLoading] = useState(false);
  const [mysteryOpened, setMysteryOpened] = useState(() => localStorage.getItem('mystery_box_date') === getTodayKey());
  const [mysteryPhase, setMysteryPhase] = useState<MysteryPhase>('idle');
  const [mysteryReward, setMysteryReward] = useState(0);
  const [mysteryAdLoading, setMysteryAdLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const mysteryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: botInfo } = useQuery<{ username: string }>({ queryKey: ['/api/bot-info'], staleTime: 3600000 });

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const axnUsdValue = tonPrice ? axnBalance * TON_PER_AXN * tonPrice : 0;

  const firstName: string = user?.firstName || user?.username || "User";
  const username: string = user?.username ? `@${user.username}` : "";
  const profileImageUrl: string | null =
    user?.profileImageUrl ||
    (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ||
    null;
  const initials = firstName.slice(0, 2).toUpperCase();

  const botUsername = botInfo?.username || 'bot';
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : '';

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setTonPrice(d?.['the-open-network']?.usd ?? null))
      .catch(() => {});
  }, []);

  const dailyCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-checkin', {});
      return res.json();
    },
    onSuccess: (data) => {
      setDailyChecked(true);
      localStorage.setItem('daily_check_date', getTodayKey());
      showNotification(`Daily check-in done! +${data.reward ?? 5} AXN`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: () => {
      setDailyChecked(true);
      localStorage.setItem('daily_check_date', getTodayKey());
      showNotification('Daily check-in done! Come back tomorrow.', 'success');
    },
  });

  const handleDailyCheck = async () => {
    if (dailyChecked || dailyAdLoading || dailyCheckMutation.isPending) return;
    setDailyAdLoading(true);
    try { await showRewardedInterstitial(); } catch {}
    setDailyAdLoading(false);
    dailyCheckMutation.mutate();
  };

  const handleMysteryOpen = () => {
    if (mysteryOpened || mysteryPhase !== 'idle') return;
    const reward = Math.floor(Math.random() * 50) + 1;
    setMysteryReward(reward);
    setMysteryPhase('opening');
    if (mysteryTimerRef.current) clearTimeout(mysteryTimerRef.current);
    mysteryTimerRef.current = setTimeout(() => setMysteryPhase('revealed'), 2200);
  };

  const handleMysteryClaim = async () => {
    if (mysteryPhase !== 'revealed') return;
    setMysteryAdLoading(true);
    setMysteryPhase('claiming');
    try { await showRewardedInterstitial(); } catch {}
    setMysteryAdLoading(false);
    try {
      await apiRequest('POST', '/api/mystery-box', {});
    } catch {}
    setMysteryOpened(true);
    localStorage.setItem('mystery_box_date', getTodayKey());
    showNotification(`Mystery Box! You won ${mysteryReward} AXN!`, 'success');
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    setMysteryPhase('done');
    mysteryTimerRef.current = setTimeout(() => setMysteryPhase('idle'), 1800);
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink)
      .then(() => showNotification('Invite link copied!', 'success'))
      .catch(() => showNotification('Invite link copied!', 'success'));
  };

  const shareLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Mine AXN with me on Axionet! Get 50 AXN on signup.')}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(url);
      else window.open(url, '_blank');
    } catch {}
    setIsSharing(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      <Header onMenuOpen={() => setMenuOpen(true)} />

      {/* ── Balance Section ── */}
      <div style={{
        padding: 'calc(var(--header-height, 62px) + 32px) 20px 16px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
            {balanceHidden ? '••••' : `$${axnUsdValue.toFixed(2)}`}
          </span>
          <button onClick={() => setBalanceHidden(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            {balanceHidden ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600 }}>
          {balanceHidden ? '••••' : `${axnBalance.toLocaleString()} AXN`}
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 28 }}>

          {/* Send */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <button onClick={() => setShowSendPopup(true)} style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
            }} className="active:scale-90 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" opacity="0.85"/>
              </svg>
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Send</span>
          </div>

          {/* Receive */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <button onClick={() => setShowReceivePopup(true)} style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(37,99,235,0.55)',
            }} className="active:scale-90 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8 17 12 21 16 17"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
              </svg>
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Receive</span>
          </div>

          {/* Swap */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <button onClick={() => setShowSwapPopup(true)} style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
            }} className="active:scale-90 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
                <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Swap</span>
          </div>

          {/* Earn */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLocation('/earn')} style={{
                width: 54, height: 54, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }} className="active:scale-90 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="white" opacity="0.9" stroke="none"/>
                </svg>
              </button>
              <div style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ef4444', borderRadius: 10, minWidth: 17, height: 17,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0a0a0a',
                fontSize: 8, fontWeight: 900, color: '#fff', padding: '0 3px',
              }}>9+</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>Earn</span>
          </div>

        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', paddingBottom: 90 }}>

        {/* DAILY REWARDS */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Daily Rewards
          </span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 20, overflow: 'hidden',
        }}>
          {/* Daily Checking */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Daily Checking</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>Earn 5 AXN</div>
            </div>
            <button
              onClick={handleDailyCheck}
              disabled={dailyChecked || dailyAdLoading || dailyCheckMutation.isPending}
              style={{
                background: dailyChecked
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: dailyChecked ? 'rgba(255,255,255,0.3)' : '#fff',
                border: dailyChecked ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: 10, padding: '9px 16px',
                fontSize: 12, fontWeight: 800,
                cursor: (dailyChecked || dailyAdLoading) ? 'not-allowed' : 'pointer',
                flexShrink: 0, letterSpacing: '0.03em',
                boxShadow: dailyChecked ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              className="active:scale-95 transition-transform"
            >
              {(dailyAdLoading || dailyCheckMutation.isPending) ? (
                <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /></>
              ) : dailyChecked ? 'DONE' : 'CHECK'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />

          {/* Mystery Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Mystery Box</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>Win upto 1–100 AXN</div>
            </div>
            <button
              onClick={handleMysteryOpen}
              disabled={mysteryOpened || mysteryPhase !== 'idle'}
              style={{
                background: mysteryOpened
                  ? 'rgba(255,255,255,0.06)'
                  : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: mysteryOpened ? 'rgba(255,255,255,0.3)' : '#fff',
                border: mysteryOpened ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: 10, padding: '9px 16px',
                fontSize: 12, fontWeight: 800,
                cursor: mysteryOpened ? 'not-allowed' : 'pointer',
                flexShrink: 0, letterSpacing: '0.03em',
                boxShadow: mysteryOpened ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
              }}
              className="active:scale-95 transition-transform"
            >
              {mysteryOpened ? 'DONE' : 'OPEN'}
            </button>
          </div>
        </div>

        {/* REFER & EARN */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Refer &amp; Earn
          </span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Invite Friends</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
                  Earn per referral <span style={{ color: '#60a5fa', fontWeight: 700 }}>150 AXN</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={shareLink}
                disabled={!referralLink || isSharing}
                style={{
                  flex: 1, padding: '13px 0',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  border: 'none', borderRadius: 14, color: '#fff',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                  opacity: !referralLink ? 0.6 : 1,
                }}
                className="active:scale-95 transition-transform"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                Invite Friend
              </button>
              <button
                onClick={copyLink}
                disabled={!referralLink}
                style={{
                  padding: '13px 20px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14, color: 'rgba(255,255,255,0.7)',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: !referralLink ? 0.6 : 1,
                }}
                className="active:scale-95 transition-transform"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Send Popup ── */}
      {showSendPopup && (
        <SendReceivePopup
          mode="send"
          user={user}
          onClose={() => setShowSendPopup(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }); setShowSendPopup(false); }}
        />
      )}

      {/* ── Receive Popup ── */}
      {showReceivePopup && (
        <SendReceivePopup
          mode="receive"
          user={user}
          onClose={() => setShowReceivePopup(false)}
          onSuccess={() => setShowReceivePopup(false)}
        />
      )}

      {/* ── Mystery Box Popup ── */}
      {mysteryPhase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes boxPulse {
              0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
              50% { transform: scale(1.06); box-shadow: 0 0 0 12px rgba(37,99,235,0); }
            }
            @keyframes rewardIn {
              0% { transform: scale(0.6); opacity: 0; }
              70% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
          <div style={{
            position: 'relative', width: '85%', maxWidth: 320,
            background: '#111', border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: 24, padding: '36px 24px 28px',
            textAlign: 'center', zIndex: 951,
            boxShadow: '0 0 60px rgba(37,99,235,0.12)',
          }}>

            {/* Box animation area */}
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>

              {mysteryPhase === 'opening' && (
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'boxPulse 0.6s ease-in-out infinite',
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
              )}

              {(mysteryPhase === 'revealed' || mysteryPhase === 'claiming') && (
                <div style={{ animation: 'rewardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                  <div style={{ fontSize: 46, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
                    {mysteryReward}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6', marginTop: 6, letterSpacing: '0.05em' }}>AXN</div>
                </div>
              )}

              {mysteryPhase === 'done' && (
                <div style={{ animation: 'rewardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Title & status */}
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
              {mysteryPhase === 'opening' && 'Opening...'}
              {(mysteryPhase === 'revealed') && 'You won!'}
              {mysteryPhase === 'claiming' && 'Claiming...'}
              {mysteryPhase === 'done' && 'Claimed!'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 }}>
              {mysteryPhase === 'opening' && 'Revealing your reward'}
              {mysteryPhase === 'revealed' && `${mysteryReward} AXN is waiting for you`}
              {mysteryPhase === 'claiming' && 'Watch a short ad to receive reward'}
              {mysteryPhase === 'done' && `${mysteryReward} AXN added to your balance`}
            </div>

            {mysteryPhase === 'revealed' && (
              <button
                onClick={handleMysteryClaim}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  border: 'none', borderRadius: 14, color: '#fff',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
                }}
                className="active:scale-95 transition-transform"
              >
                Claim {mysteryReward} AXN
              </button>
            )}

            {(mysteryPhase === 'opening' || mysteryPhase === 'claiming') && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Please wait</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Swap Popup ── */}
      {showSwapPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowSwapPopup(false)} />
          <div style={{
            position: 'relative', width: '100%',
            background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px 24px 0 0', padding: '28px 20px 44px', zIndex: 901,
            textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Swap Coming Soon</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>AXN token swapping will be available soon. Stay tuned!</div>
            <button onClick={() => setShowSwapPopup(false)} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
            }}>Got it</button>
          </div>
        </div>
      )}

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

function SendReceivePopup({ mode, user, onClose, onSuccess }: {
  mode: 'send' | 'receive';
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.1)',
    fontSize: 15, color: '#fff',
    background: 'rgba(255,255,255,0.05)', outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    display: 'block', marginBottom: 6,
  };

  const handleSend = async () => {
    if (!recipient || !amount) { showNotification('Fill in recipient and amount', 'error'); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { showNotification('Enter a valid amount', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/transfers/send', { recipient, amount: num, note });
      const data = await res.json();
      if (data.success) {
        showNotification(`Sent ${num} AXN successfully!`, 'success');
        onSuccess();
      } else {
        showNotification(data.message || 'Transfer failed', 'error');
      }
    } catch {
      showNotification('Transfer failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyId = (val: string) => {
    navigator.clipboard.writeText(val)
      .then(() => showNotification('Copied!', 'success'))
      .catch(() => showNotification('Copied!', 'success'));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: '#161616', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px 24px 0 0', padding: '24px 20px 44px', zIndex: 901,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: mode === 'send' ? 'rgba(99,102,241,0.12)' : 'rgba(34,197,94,0.1)',
              border: `1px solid ${mode === 'send' ? 'rgba(99,102,241,0.25)' : 'rgba(34,197,94,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {mode === 'send' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#fff' }}>
              {mode === 'send' ? 'Send AXN' : 'Receive AXN'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {mode === 'send' ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Recipient ID or Username</label>
              <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@username or user ID" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Amount (AXN)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." style={inputStyle} />
            </div>
            <button onClick={handleSend} disabled={loading} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontSize: 15, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Sending...' : 'Send AXN'}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Share your ID or username to receive AXN</div>
            </div>
            {[
              { label: 'Your User ID', value: user?.id?.toString() || '' },
              { label: 'Your Username', value: user?.username ? `@${user.username}` : '' },
            ].filter(r => r.value).map(row => (
              <div key={row.label} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{row.label}</label>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '12px 14px',
                }}>
                  <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{row.value}</span>
                  <button onClick={() => copyId(row.value)} style={{
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none',
                    borderRadius: 8, padding: '6px 14px',
                    color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>Copy</button>
                </div>
              </div>
            ))}
            <button onClick={onClose} style={{
              width: '100%', padding: '14px', marginTop: 8,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, color: 'rgba(255,255,255,0.6)',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
            }}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
