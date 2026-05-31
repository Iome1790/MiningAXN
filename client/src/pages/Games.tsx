import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import MenuPopup from "@/components/MenuPopup";
import Header from "@/components/Header";
import { useLocation } from "wouter";
import { showRewardedInterstitial } from "@/lib/showAd";
import WithdrawPopup from "@/components/WithdrawPopup";
import { getTONPrice } from "@/lib/tonPriceService";

// 1000 AXN = 0.01 TON (fixed), USD calculated via live TON price
const AXN_PER_TON = 100000; // 1 TON = 100,000 AXN

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

type MysteryPhase = 'idle' | 'opening' | 'revealed' | 'claiming' | 'done';

const FARM_RATE = 0.001; // AXN/s
const FARM_DURATION = 4 * 3600; // 4h in seconds
const FARM_MAX = parseFloat((FARM_DURATION * FARM_RATE).toFixed(4)); // 14.4 AXN

function fmtCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function Games() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [showSendPopup, setShowSendPopup] = useState(false);
  const [showReceivePopup, setShowReceivePopup] = useState(false);
  const [showStakingPopup, setShowStakingPopup] = useState(false);
  const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [dailyChecked, setDailyChecked] = useState(() => localStorage.getItem('daily_check_date') === getTodayKey());
  const [dailyAdLoading, setDailyAdLoading] = useState(false);
  const [mysteryOpened, setMysteryOpened] = useState(() => localStorage.getItem('mystery_box_date') === getTodayKey());

  const [mysteryPhase, setMysteryPhase] = useState<MysteryPhase>('idle');
  const [mysteryReward, setMysteryReward] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const mysteryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Farming state ──
  const [farmCountdown, setFarmCountdown] = useState(FARM_DURATION);
  const [farmAccum, setFarmAccum] = useState(0);
  const [showFarmInfo, setShowFarmInfo] = useState(false);
  const farmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tonPrice, setTonPrice] = useState<number>(5.5);

  useEffect(() => {
    getTONPrice().then(p => setTonPrice(p)).catch(() => {});
  }, []);

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: botInfo } = useQuery<{ username: string }>({ queryKey: ['/api/bot-info'], staleTime: 3600000 });

  const axnBalance = Math.floor(parseFloat(user?.walletBalance || '0'));
  // 1000 AXN = 0.01 TON → 1 AXN = 1/AXN_PER_TON TON → USD = AXN / AXN_PER_TON * tonPrice
  const axnUsdValue = (axnBalance / AXN_PER_TON) * tonPrice;

  const firstName: string = user?.firstName || user?.username || "User";
  const profileImageUrl: string | null =
    user?.profileImageUrl ||
    (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ||
    null;
  const initials = firstName.slice(0, 2).toUpperCase();

  const botUsername = botInfo?.username || 'bot';
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : '';

  // Sync claim states from server data (overrides stale localStorage)
  useEffect(() => {
    if (!user) return;
    const todayKey = getTodayKey();
    if (user.dailyCheckinClaimed && user.dailyTasksDate) {
      const serverDate = new Date(user.dailyTasksDate).toISOString().slice(0, 10);
      if (serverDate === todayKey) {
        setDailyChecked(true);
        localStorage.setItem('daily_check_date', todayKey);
      } else {
        setDailyChecked(false);
        localStorage.removeItem('daily_check_date');
      }
    } else if (!user.dailyCheckinClaimed) {
      setDailyChecked(false);
      localStorage.removeItem('daily_check_date');
    }
    if (user.mysteryBoxDate) {
      const serverDate = new Date(user.mysteryBoxDate).toISOString().slice(0, 10);
      if (serverDate === todayKey) {
        setMysteryOpened(true);
        localStorage.setItem('mystery_box_date', todayKey);
      } else {
        setMysteryOpened(false);
        localStorage.removeItem('mystery_box_date');
      }
    } else {
      setMysteryOpened(false);
      localStorage.removeItem('mystery_box_date');
    }
  }, [user]);

  const dailyCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-checkin', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      return data;
    },
    onSuccess: (data) => {
      setDailyChecked(true);
      localStorage.setItem('daily_check_date', getTodayKey());
      showNotification(`Daily check-in done! +${data.reward ?? 5} AXN added to your wallet`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (err: any) => {
      showNotification(err?.message || 'Daily check-in failed. Try again.', 'error');
    },
  });

  const handleDailyCheck = async () => {
    if (dailyChecked || dailyAdLoading || dailyCheckMutation.isPending) return;
    setDailyAdLoading(true);
    try { await showRewardedInterstitial(); } catch {}
    setDailyAdLoading(false);
    dailyCheckMutation.mutate();
  };

  const handleMysteryOpen = async () => {
    if (mysteryOpened || mysteryPhase !== 'idle') return;
    setMysteryPhase('opening');
    if (mysteryTimerRef.current) clearTimeout(mysteryTimerRef.current);

    // Claim from server during the opening animation — real reward, no mismatch
    let serverReward = 0;
    try { await showRewardedInterstitial(); } catch {}
    try {
      const res = await apiRequest('POST', '/api/mystery-box', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      serverReward = data.reward ?? 0;
      setMysteryReward(serverReward);
      localStorage.setItem('mystery_box_date', getTodayKey());
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    } catch (err: any) {
      setMysteryPhase('idle');
      showNotification(err?.message || 'Failed to open mystery box. Try again.', 'error');
      return;
    }

    // Show reveal after animation delay, using the actual server reward
    mysteryTimerRef.current = setTimeout(() => {
      setMysteryPhase('revealed');
    }, 2200);
  };

  const handleMysteryClaim = () => {
    if (mysteryPhase !== 'revealed') return;
    setMysteryOpened(true);
    showNotification(`Mystery Box! You won ${mysteryReward} AXN!`, 'success');
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
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Axionet! I earn 150 AXN for every friend who completes 10 tasks. Start earning now!')}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(url);
      else window.open(url, '_blank');
    } catch {}
    setIsSharing(false);
  };

  // ── Farming query & mutations ──
  const { data: farmData, refetch: refetchFarm } = useQuery<any>({
    queryKey: ['/api/farming/state'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // Sync server farming state to local countdown/accum
  useEffect(() => {
    if (!farmData) return;
    setFarmCountdown(farmData.remainingSeconds ?? FARM_DURATION);
    setFarmAccum(farmData.minedAxn ?? 0);
  }, [farmData]);

  // Live countdown tick when farming is active
  useEffect(() => {
    if (farmIntervalRef.current) clearInterval(farmIntervalRef.current);
    const isActive = farmData?.isActive && (farmData?.remainingSeconds ?? 0) > 0;
    if (!isActive) return;
    farmIntervalRef.current = setInterval(() => {
      setFarmCountdown(prev => {
        const next = Math.max(0, prev - 1);
        if (next <= 0 && farmIntervalRef.current) clearInterval(farmIntervalRef.current);
        return next;
      });
      setFarmAccum(prev => parseFloat(Math.min(prev + FARM_RATE, FARM_MAX).toFixed(4)));
    }, 1000);
    return () => { if (farmIntervalRef.current) clearInterval(farmIntervalRef.current); };
  }, [farmData?.isActive, farmData?.startedAt]);

  const farmStartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/farming/start', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start');
      return data;
    },
    onSuccess: () => {
      showNotification('Farming started! +0.001 AXN/s for 4 hours', 'success');
      refetchFarm();
    },
    onError: (err: any) => showNotification(err?.message || 'Failed to start farming', 'error'),
  });

  const farmClaimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/farming/claim', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to claim');
      return data;
    },
    onSuccess: (data) => {
      showNotification(`Farming reward claimed! +${data.amount} AXN`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      refetchFarm();
    },
    onError: (err: any) => showNotification(err?.message || 'Failed to claim', 'error'),
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes boxPulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
          50% { transform: scale(1.06); box-shadow: 0 0 0 14px rgba(37,99,235,0); }
        }
        @keyframes rewardIn {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes axn-glow { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        @keyframes axn-pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes popup-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
      `}</style>

      <Header onMenuOpen={() => setMenuOpen(true)} />

      {/* ── Balance Section ── */}
      <div style={{
        padding: 'calc(var(--header-height, 62px) + 32px) 16px 20px',
        textAlign: 'center',
      }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Wallet Balance
          </div>

          {/* USD Value — primary big text */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
              <span style={{
                fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Space Grotesk', 'Outfit', sans-serif",
                letterSpacing: '0px', userSelect: 'none',
              }}>$</span>
              <span style={{
                fontSize: 48, fontWeight: 700, color: '#fff',
                fontFamily: "'Oxanium', 'Space Grotesk', sans-serif",
                letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {balanceHidden ? '••••' : axnUsdValue.toFixed(3)}
              </span>
            </div>
            <button onClick={() => setBalanceHidden(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 4 }}>
              {balanceHidden ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>

          {/* AXN amount — subtitle text */}
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, fontWeight: 600, marginBottom: 28 }}>
            {balanceHidden ? '•••• AXN' : `${axnBalance.toLocaleString()} AXN`}
          </div>

          {/* ── Action Buttons ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>

            {/* Send */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => setShowSendPopup(true)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                border: '1px solid rgba(59,130,246,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }} className="active:scale-90 transition-transform">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" opacity="0.9"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.48)' }}>Send</span>
            </div>

            {/* Receive */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => setShowReceivePopup(true)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: '1px solid rgba(59,130,246,0.35)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(37,99,235,0.5)',
              }} className="active:scale-90 transition-transform">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 17 12 21 16 17"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.48)' }}>Receive</span>
            </div>

            {/* Staking */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => setShowStakingPopup(true)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                border: '1px solid rgba(59,130,246,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }} className="active:scale-90 transition-transform">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.48)' }}>Staking</span>
            </div>

            {/* Promo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => setShowPromoPopup(true)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                border: '1px solid rgba(59,130,246,0.3)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }} className="active:scale-90 transition-transform">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.48)' }}>Promo</span>
            </div>

          </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', paddingBottom: 90 }}>

        {/* DAILY REWARDS */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Daily Rewards
          </span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: 14,
          marginBottom: 20, overflow: 'hidden',
        }}>
          {/* Daily Check-In — calendar icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <polyline points="9 16 11 18 15 14"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Daily Check-In</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>Earn 5 AXN</div>
            </div>
            <button
              onClick={handleDailyCheck}
              disabled={dailyChecked || dailyAdLoading || dailyCheckMutation.isPending}
              style={{
                background: dailyChecked ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: dailyChecked ? 'rgba(255,255,255,0.3)' : '#fff',
                border: dailyChecked ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 800,
                cursor: (dailyChecked || dailyAdLoading) ? 'not-allowed' : 'pointer',
                flexShrink: 0, letterSpacing: '0.03em',
                boxShadow: dailyChecked ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              className="active:scale-95 transition-transform"
            >
              {(dailyAdLoading || dailyCheckMutation.isPending) ? (
                <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              ) : dailyChecked ? 'DONE' : 'CHECK'}
            </button>
          </div>

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
                background: mysteryOpened ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: mysteryOpened ? 'rgba(255,255,255,0.3)' : '#fff',
                border: mysteryOpened ? '1px solid rgba(255,255,255,0.08)' : 'none',
                borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 800,
                cursor: mysteryOpened ? 'not-allowed' : 'pointer', flexShrink: 0,
                boxShadow: mysteryOpened ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
              }}
              className="active:scale-95 transition-transform"
            >
              {mysteryOpened ? 'DONE' : 'OPEN'}
            </button>
          </div>
        </div>

        {/* FARMING */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Farming
          </span>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>

          {/* ? button — top-right circular, no border */}
          <button
            onClick={() => setShowFarmInfo(true)}
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              border: 'none', color: 'rgba(255,255,255,0.65)',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
            className="active:scale-95 transition-transform"
          >?</button>

          <div style={{ padding: '16px 16px 18px' }}>

            {/* Top row: larger image + large reward display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <img
                src="/axn-coin.jpg"
                alt="AXN"
                style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 0 18px rgba(37,99,235,0.25)',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#60a5fa', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {farmAccum.toFixed(3)}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(96,165,250,0.7)', marginLeft: 5 }}>AXN</span>
                </div>
              </div>
            </div>

            {/* Buttons row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>

              {/* Center dynamic button */}
              {(() => {
                const isActive = farmData?.isActive;
                const canClaim = isActive && farmCountdown <= 0;
                const isPending = farmStartMutation.isPending || farmClaimMutation.isPending;

                if (canClaim) {
                  return (
                    <button
                      onClick={() => farmClaimMutation.mutate()}
                      disabled={isPending}
                      style={{
                        flex: 1, padding: '13px 0',
                        background: isPending ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #16a34a, #22c55e)',
                        border: 'none', borderRadius: 12,
                        color: isPending ? 'rgba(255,255,255,0.3)' : '#fff',
                        fontSize: 13, fontWeight: 800, cursor: isPending ? 'default' : 'pointer',
                        boxShadow: isPending ? 'none' : '0 4px 18px rgba(34,197,94,0.35)',
                      }}
                      className="active:scale-95 transition-transform"
                    >
                      {isPending ? 'Claiming…' : `CLAIM ${farmAccum.toFixed(3)} AXN`}
                    </button>
                  );
                }
                if (isActive) {
                  return (
                    <button
                      disabled
                      style={{
                        flex: 1, padding: '13px 0',
                        background: 'rgba(255,255,255,0.04)',
                        border: 'none',
                        borderRadius: 12, color: 'rgba(255,255,255,0.5)',
                        fontSize: 14, fontWeight: 700, cursor: 'default',
                        letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtCountdown(farmCountdown)}
                    </button>
                  );
                }
                return (
                  <button
                    onClick={() => farmStartMutation.mutate()}
                    disabled={isPending}
                    style={{
                      flex: 1, padding: '13px 0',
                      background: isPending ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      border: 'none', borderRadius: 12,
                      color: isPending ? 'rgba(255,255,255,0.3)' : '#fff',
                      fontSize: 14, fontWeight: 800, cursor: isPending ? 'default' : 'pointer',
                      boxShadow: isPending ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
                    }}
                    className="active:scale-95 transition-transform"
                  >
                    {isPending ? 'Starting…' : 'START'}
                  </button>
                );
              })()}

              {/* Speed Up button — speed value on top, label below */}
              <button
                onClick={() => showNotification('Speed Up feature is coming soon.', 'info')}
                style={{
                  flexShrink: 0, padding: '8px 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: 12, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  minWidth: 64,
                }}
                className="active:scale-95 transition-transform"
              >
                <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 800 }}>0.001/s</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600 }}>Speed Up</span>
              </button>

            </div>
          </div>
        </div>

        {/* Farming Info Popup */}
        {showFarmInfo && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowFarmInfo(false)} />
            <div style={{
              position: 'relative', width: '100%', maxWidth: 340,
              background: '#111', borderRadius: 20, padding: '28px 24px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <img src="/axn-coin.jpg" alt="AXN" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                <span style={{ color: '#fff', fontSize: 17, fontWeight: 800 }}>Farming Info</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {[
                  ['Farming Speed', '0.001 AXN/s'],
                  ['Farming Duration', '4 Hours'],
                  ['Max Reward', `${FARM_MAX.toFixed(3)} AXN per session`],
                  ['How to Claim', 'Wait for countdown to end, then press CLAIM'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{label}</span>
                    <span style={{ color: '#60a5fa', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowFarmInfo(false)}
                style={{
                  width: '100%', padding: '13px 0',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  border: 'none', borderRadius: 12, color: '#fff',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}
              >Got it</button>
            </div>
          </div>
        )}

      </div>

      {/* ── Send Popup (2 options) ── */}
      {showSendPopup && (
        <SendChoicePopup
          user={user}
          onClose={() => setShowSendPopup(false)}
          onWithdraw={() => { setShowSendPopup(false); setShowWithdrawPopup(true); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }); setShowSendPopup(false); }}
        />
      )}

      {/* ── Receive Popup ── */}
      {showReceivePopup && (
        <ReceivePopup user={user} onClose={() => setShowReceivePopup(false)} />
      )}

      {/* ── Promo Popup ── */}
      {showPromoPopup && (
        <PromoPopup
          onClose={() => setShowPromoPopup(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }); setShowPromoPopup(false); }}
        />
      )}

      {/* ── Withdraw Popup ── */}
      {showWithdrawPopup && (
        <WithdrawPopup
          onClose={() => setShowWithdrawPopup(false)}
          userBalance={axnBalance}
        />
      )}

      {/* ── Staking Popup ── */}
      {showStakingPopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowStakingPopup(false)} />
          <div style={{
            position: 'relative', width: '100%',
            background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
            border: '1px solid rgba(37,99,235,0.25)',
            borderRadius: '28px 28px 0 0', padding: '28px 20px 52px', zIndex: 901, textAlign: 'center',
            boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)', animation: 'popup-glow 2s ease-in-out infinite' }} />
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))',
              border: '1px solid rgba(37,99,235,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 28px rgba(37,99,235,0.25)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>AXN Staking</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: 10, lineHeight: 1.55 }}>
              Stake your AXN to earn passive rewards.
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 50, padding: '5px 14px', marginBottom: 28,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'axn-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>Launching Soon</span>
            </div>
            <button onClick={() => setShowStakingPopup(false)} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              border: 'none', borderRadius: 50, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
            }} className="active:scale-95 transition-transform">Got it</button>
          </div>
        </div>
      )}

      {/* ── Mystery Box Popup ── */}
      {mysteryPhase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)' }} />
          <div style={{
            position: 'relative', width: '85%', maxWidth: 320,
            background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
            border: '1px solid rgba(37,99,235,0.22)',
            borderRadius: 24, padding: '36px 24px 28px',
            textAlign: 'center', zIndex: 951,
            boxShadow: '0 0 60px rgba(37,99,235,0.15), 0 -4px 20px rgba(37,99,235,0.08)',
          }}>
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              {mysteryPhase === 'opening' && (
                <div style={{
                  width: 82, height: 82, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'boxPulse 0.65s ease-in-out infinite',
                }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
              )}
              {(mysteryPhase === 'revealed' || mysteryPhase === 'claiming') && (
                <div style={{ animation: 'rewardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>{mysteryReward}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6', marginTop: 6 }}>AXN</div>
                </div>
              )}
              {mysteryPhase === 'done' && (
                <div style={{ animation: 'rewardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                  <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
              )}
            </div>

            <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
              {mysteryPhase === 'opening' ? 'Opening box...'
                : mysteryPhase === 'revealed' ? `You won ${mysteryReward} AXN!`
                : mysteryPhase === 'claiming' ? 'Claiming...'
                : 'Reward Claimed!'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, marginBottom: 28 }}>
              {mysteryPhase === 'opening' ? 'Wait for your prize...'
                : mysteryPhase === 'revealed' ? 'Watch a short ad to claim your reward'
                : mysteryPhase === 'claiming' ? 'Please wait...'
                : 'AXN added to your balance'}
            </div>

            {mysteryPhase === 'revealed' && (
              <button onClick={handleMysteryClaim} style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none', borderRadius: 50, color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
              }} className="active:scale-95 transition-transform">
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

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

function SendChoicePopup({ user, onClose, onWithdraw, onSuccess }: {
  user: any;
  onClose: () => void;
  onWithdraw: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<null | 'user'>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const [sendTonPrice, setSendTonPrice] = useState<number>(5.5);
  useEffect(() => { getTONPrice().then(p => setSendTonPrice(p)).catch(() => {}); }, []);
  const usdPreview = amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
    ? `≈ $${((parseFloat(amount) / AXN_PER_TON) * sendTonPrice).toFixed(4)} USD`
    : '';

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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    border: '1.5px solid rgba(37,99,235,0.2)',
    fontSize: 15, color: '#fff',
    background: 'rgba(255,255,255,0.04)', outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '24px 20px 52px', zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)', animation: 'popup-glow 2s ease-in-out infinite' }} />
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mode ? 22 : 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode && (
              <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
            )}
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>
              {mode === 'user' ? 'Send to User' : 'Send AXN'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Choice screen */}
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={() => setMode('user')} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)',
              borderRadius: 18, padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
            }} className="active:scale-[0.98] transition-transform">
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none" opacity="0.9"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Send to User</div>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>Internal transfer using User ID</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>

            <button onClick={onWithdraw} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)',
              borderRadius: 18, padding: '18px 20px', cursor: 'pointer', textAlign: 'left',
            }} className="active:scale-[0.98] transition-transform">
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #5b21b6, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 3 }}>Withdraw</div>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12 }}>Send to external TON wallet</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}

        {/* Send to User form */}
        {mode === 'user' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recipient User ID</div>
              <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Enter User ID..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (AXN)</div>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" style={inputStyle} />
              {usdPreview && <div style={{ color: '#60a5fa', fontSize: 12, marginTop: 6, fontWeight: 600 }}>{usdPreview}</div>}
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note (optional)</div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." style={inputStyle} />
            </div>
            <button onClick={handleSend} disabled={loading} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              border: 'none', borderRadius: 50, color: '#fff',
              fontSize: 15, fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
            }} className="active:scale-95 transition-transform">
              {loading ? 'Sending...' : 'Send AXN'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PromoPopup({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState<{ reward: string } | null>(null);

  const handleClaim = async () => {
    if (!code.trim()) { showNotification('Enter a promo code', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/promo-codes/redeem', { code: code.trim().toUpperCase() });
      const data = await res.json();
      if (data.success) {
        setClaimed({ reward: data.reward });
        showNotification(data.message || 'Promo code claimed!', 'success');
      } else {
        showNotification(data.message || 'Invalid promo code', 'error');
      }
    } catch {
      showNotification('Failed to redeem code. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={claimed ? onSuccess : onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '24px 20px 52px', zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)', animation: 'popup-glow 2s ease-in-out infinite' }} />
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Promo Code</span>
          <button onClick={claimed ? onSuccess : onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {!claimed ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))',
                border: '1px solid rgba(37,99,235,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(37,99,235,0.18)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, margin: 0 }}>
                Enter your promo code to claim AXN rewards
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Promo Code</div>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleClaim()}
                placeholder="Enter code here..."
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  border: '1.5px solid rgba(37,99,235,0.22)',
                  background: 'rgba(37,99,235,0.06)', color: '#fff',
                  fontSize: 16, fontWeight: 700, letterSpacing: '0.08em',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
                }}
              />
            </div>

            <button onClick={handleClaim} disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
              border: 'none', borderRadius: 50, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
            }} className="active:scale-95 transition-transform">
              {loading ? 'Checking...' : 'Claim Reward'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div style={{ animation: 'rewardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(74,222,128,0.18), rgba(34,197,94,0.08))',
                border: '1px solid rgba(74,222,128,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>+{Math.floor(parseFloat(claimed.reward))}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6', marginTop: 4, marginBottom: 16 }}>AXN</div>
              <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14, marginBottom: 28 }}>Added to your wallet balance!</p>
            </div>
            <button onClick={onSuccess} style={{
              width: '100%', padding: '14px',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              border: 'none', borderRadius: 50, color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
            }} className="active:scale-95 transition-transform">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceivePopup({ user, onClose }: { user: any; onClose: () => void }) {
  const userId = user?.id?.toString() || '';

  const copyId = () => {
    navigator.clipboard.writeText(userId)
      .then(() => showNotification('User ID copied!', 'success'))
      .catch(() => showNotification('User ID copied!', 'success'));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '24px 20px 52px', zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)', animation: 'popup-glow 2s ease-in-out infinite' }} />
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Receive AXN</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(59,130,246,0.1))',
            border: '1px solid rgba(37,99,235,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(37,99,235,0.18)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="8 17 12 21 16 17"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>
            </svg>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, margin: 0 }}>
            Share your User ID to receive AXN from other users
          </p>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your User ID</div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{userId}</span>
            <button onClick={copyId} style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none',
              borderRadius: 10, padding: '8px 18px',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
            }} className="active:scale-95 transition-transform">Copy</button>
          </div>
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '14px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 50, color: 'rgba(255,255,255,0.45)',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }} className="active:scale-95 transition-transform">Close</button>
      </div>
    </div>
  );
}
