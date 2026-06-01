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
import { useTonConnectUI, useTonAddress } from "@tonconnect/ui-react";

const AXN_PER_TON = 100000;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

type MysteryPhase = 'idle' | 'opening' | 'revealed' | 'claiming' | 'done';

const FARM_RATE = 0.001;
const FARM_DURATION = 4 * 3600;
const FARM_MAX = parseFloat((FARM_DURATION * FARM_RATE).toFixed(4));

function fmtCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function Games() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
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

  // Farming state
  const [farmCountdown, setFarmCountdown] = useState(FARM_DURATION);
  const [farmAccum, setFarmAccum] = useState(0);
  const [showFarmInfo, setShowFarmInfo] = useState(false);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [showSpeedUpPopup, setShowSpeedUpPopup] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  // 'idle' | 'paying' | 'verifying' | 'needs_verify' (paid but verify failed — show retry)
  const [upgradeStep, setUpgradeStep] = useState<'idle'|'paying'|'verifying'|'needs_verify'>('idle');
  const farmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TonConnect — get both friendly (for display) and raw (for API matching)
  const [tonConnectUI] = useTonConnectUI();
  const tonWalletAddress = useTonAddress();       // friendly: UQabc...
  const tonWalletRaw = useTonAddress(false);       // raw: 0:hexhex...

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [tonPrice, setTonPrice] = useState<number>(5.5);

  useEffect(() => {
    getTONPrice().then(p => setTonPrice(p)).catch(() => {});
  }, []);

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: botInfo } = useQuery<{ username: string }>({ queryKey: ['/api/bot-info'], staleTime: 3600000 });

  const axnBalance = Math.floor(parseFloat(user?.walletBalance || '0'));
  const axnUsdValue = (axnBalance / AXN_PER_TON) * tonPrice;

  const firstName: string = user?.firstName || user?.username || "User";
  const profileImageUrl: string | null =
    user?.profileImageUrl ||
    (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ||
    null;
  const initials = firstName.slice(0, 2).toUpperCase();

  const botUsername = botInfo?.username || 'bot';
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : '';

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
      showNotification(`Daily check-in done! +${data.reward ?? 5} CIPHER added`, 'success');
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

    mysteryTimerRef.current = setTimeout(() => {
      setMysteryPhase('revealed');
    }, 2200);
  };

  const handleMysteryClaim = () => {
    if (mysteryPhase !== 'revealed') return;
    setMysteryOpened(true);
    showNotification(`Mystery Box! You won ${mysteryReward} CIPHER!`, 'success');
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

  // Farming query & mutations
  const { data: farmData, refetch: refetchFarm } = useQuery<any>({
    queryKey: ['/api/farming/state'],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!farmData) return;
    setFarmCountdown(farmData.remainingSeconds ?? FARM_DURATION);
    setFarmAccum(farmData.minedAxn ?? 0);
  }, [farmData]);

  useEffect(() => {
    if (farmIntervalRef.current) clearInterval(farmIntervalRef.current);
    const isActive = farmData?.isActive;
    if (!isActive) return;
    const rate = farmData?.effectiveRate ?? FARM_RATE;
    const maxAxn = FARM_DURATION * rate;
    farmIntervalRef.current = setInterval(() => {
      setFarmCountdown(prev => Math.max(0, prev - 1));
      setFarmAccum(prev => parseFloat(Math.min(prev + rate, maxAxn).toFixed(4)));
    }, 1000);
    return () => { if (farmIntervalRef.current) clearInterval(farmIntervalRef.current); };
  }, [farmData?.isActive, farmData?.startedAt, farmData?.effectiveRate]);

  const farmStartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/farming/start', {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start');
      return data;
    },
    onSuccess: () => {
      showNotification('Farming started! Claim anytime — no need to wait.', 'success');
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

      {/* Balance Section */}
      <div style={{
        padding: 'calc(var(--header-height, 62px) + 32px) 16px 20px',
        textAlign: 'center',
      }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
            Wallet Balance
          </div>

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

          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, fontWeight: 600, marginBottom: 28 }}>
            {balanceHidden ? '•••• AXN' : `${axnBalance.toLocaleString()} AXN`}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>

            {/* Withdraw */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => setShowWithdrawPopup(true)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }} className="active:scale-90 transition-transform">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v14M5 9l7 7 7-7"/>
                  <path d="M3 20h18"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.48)' }}>Withdraw</span>
            </div>

            {/* Swap */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => showNotification('Swap feature coming soon.', 'info')} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }} className="active:scale-90 transition-transform">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="17 1 21 5 17 9"/>
                  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                  <polyline points="7 23 3 19 7 15"/>
                  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.48)' }}>Swap</span>
            </div>

            {/* Staking */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <button onClick={() => setShowStakingPopup(true)} style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                border: 'none',
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
                border: 'none',
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

      {/* Scrollable Content */}
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
          {/* Daily Check-In */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <polyline points="9 16 11 18 15 14"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Daily Check-In</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>Earn 5 CIPHER</div>
            </div>
            <button
              onClick={handleDailyCheck}
              disabled={dailyChecked || dailyAdLoading || dailyCheckMutation.isPending}
              style={{
                background: dailyChecked ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: dailyChecked ? 'rgba(255,255,255,0.3)' : '#fff',
                border: 'none',
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
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>Mystery Box</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>Win 1–100 CIPHER</div>
            </div>
            <button
              onClick={handleMysteryOpen}
              disabled={mysteryOpened || mysteryPhase !== 'idle'}
              style={{
                background: mysteryOpened ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: mysteryOpened ? 'rgba(255,255,255,0.3)' : '#fff',
                border: 'none',
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

        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          {/* Main row: coin + info + action button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: '#000',
              boxShadow: farmData?.isActive ? '0 0 14px rgba(34,197,94,0.4)' : '0 0 12px rgba(37,99,235,0.2)',
            }}>
              <img src="/axn-coin.jpg" alt="AXN" style={{ width: '110%', height: '110%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>AXN Farming</div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                {farmData?.isActive
                  ? <span style={{ color: '#4ade80', fontWeight: 700 }}>{farmAccum.toFixed(3)} AXN ready</span>
                  : <span style={{ color: 'rgba(255,255,255,0.35)' }}>0.001/s · 14.4 AXN per cycle</span>
                }
              </div>
            </div>
            {/* Compact action button */}
            {(() => {
              const isActive = farmData?.isActive;
              const isPending = farmStartMutation.isPending || farmClaimMutation.isPending;
              if (isPending) return (
                <button disabled style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: '9px 14px', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.5)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  {farmClaimMutation.isPending ? 'Claiming' : 'Starting'}
                </button>
              );
              if (isActive) return (
                <button onClick={() => farmClaimMutation.mutate()} style={{
                  background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', borderRadius: 10,
                  padding: '8px 13px', cursor: 'pointer', flexShrink: 0,
                  boxShadow: '0 2px 12px rgba(34,197,94,0.4)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                }} className="active:scale-95 transition-transform">
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>CLAIM</span>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{farmAccum.toFixed(3)}</span>
                </button>
              );
              return (
                <button onClick={() => farmStartMutation.mutate()} style={{
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none', borderRadius: 10,
                  padding: '9px 20px', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
                  boxShadow: '0 2px 12px rgba(37,99,235,0.4)', letterSpacing: '0.05em',
                }} className="active:scale-95 transition-transform">START</button>
              );
            })()}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          {/* Sub-row: Info | Speed Up | Alert */}
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <button onClick={() => setShowFarmInfo(true)} style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', fontSize: 15, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="active:scale-95 transition-transform">?</button>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
            <button onClick={() => setShowSpeedUpPopup(true)} style={{
              flex: 3, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              color: farmData?.multiplier && farmData.multiplier > 1 ? '#4ade80' : '#fbbf24',
              fontSize: 12, fontWeight: 800,
            }} className="active:scale-95 transition-transform">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              {farmData?.multiplier && farmData.multiplier > 1 ? `×${farmData.multiplier} Speed Active` : 'Speed Up'}
            </button>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.05)' }} />
            <button onClick={() => setShowAlertPopup(true)} style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="active:scale-95 transition-transform">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Farm Info Popup — bottom sheet */}
        {showFarmInfo && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowFarmInfo(false)} />
            <div style={{ position: 'relative', width: '100%', background: 'linear-gradient(160deg, #0d0d0f, #111118)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '28px 28px 0 0', padding: '28px 20px 48px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)' }} />
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                  <img src="/axn-coin.jpg" alt="AXN" style={{ width: '110%', height: '110%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 17, fontWeight: 900 }}>AXN Farming</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>How it works</div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '4px 0', marginBottom: 20 }}>
                {[
                  { label: 'Base speed', val: '0.001 AXN/s' },
                  { label: 'Cycle duration', val: '4 hours' },
                  { label: 'Max per cycle', val: '14.4 AXN' },
                  { label: 'Speed Up boost', val: '×10 for 7 days' },
                  { label: 'Speed Up cost', val: '10 TON' },
                ].map((r, i, arr) => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{r.label}</span>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{r.val}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowFarmInfo(false)} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }} className="active:scale-95 transition-transform">Got it</button>
            </div>
          </div>
        )}

        {/* Speed Up Popup — bottom sheet */}
        {showSpeedUpPopup && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={() => { if (!upgradeLoading) { setShowSpeedUpPopup(false); setUpgradeStep('idle'); } }} />
            <div style={{ position: 'relative', width: '100%', background: 'linear-gradient(160deg, #0d0d0f, #111118)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '28px 28px 0 0', padding: '28px 20px 52px', overflow: 'hidden', boxShadow: '0 -8px 60px rgba(245,158,11,0.07)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #d97706, #f59e0b, #d97706, transparent)' }} />
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>Speed Up Farming</div>
                  <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, marginTop: 2 }}>Boost your AXN mining rate</div>
                </div>
              </div>

              {/* Boost active state */}
              {farmData?.boostExpiresAt ? (
                <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'axn-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                    <span style={{ color: '#4ade80', fontSize: 15, fontWeight: 900 }}>×10 Speed Boost Active</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    Expires {new Date(farmData.boostExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                  {/* Speed before → after */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>NOW</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, fontWeight: 900 }}>0.001<span style={{ fontSize: 11, fontWeight: 600 }}>/s</span></div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <svg width="26" height="14" viewBox="0 0 26 14" fill="none"><path d="M1 7h18M15 2l7 5-7 5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 900 }}>×10</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>BOOSTED</div>
                      <div style={{ color: '#f59e0b', fontSize: 17, fontWeight: 900 }}>0.01<span style={{ fontSize: 11, fontWeight: 600 }}>/s</span></div>
                    </div>
                  </div>
                  {/* Benefits + price */}
                  <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: '⚡', text: '10× faster AXN farming for 7 days' },
                      { icon: '🎁', text: '+250,000 AXN instant bonus' },
                      { icon: '💎', text: 'One-time — 10 TON' },
                    ].map(b => (
                      <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14 }}>{b.icon}</span>
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{b.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient wallet (only when not boosted) */}
              {!farmData?.boostExpiresAt && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '9px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>UQC3F3vDP_W0pKMoEHWtFn...F6pikm</span>
                </div>
              )}

              {/* Action buttons */}
              {(() => {
                const doVerify = async () => {
                  setUpgradeStep('verifying');
                  setUpgradeLoading(true);
                  try {
                    const resp = await apiRequest('POST', '/api/farming/verify-ton-upgrade', { walletAddress: tonWalletRaw || tonWalletAddress });
                    const data = await resp.json();
                    if (!resp.ok) throw new Error(data.message || 'Verification failed');
                    showNotification(data.message || 'Speed upgraded! ×10 boost active.', 'success');
                    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/farming/state'] });
                    setUpgradeStep('idle');
                    setShowSpeedUpPopup(false);
                  } catch (err: any) {
                    showNotification(err?.message || 'Not confirmed yet — tap Verify Again in 1–2 min.', 'error');
                    setUpgradeStep('needs_verify');
                  } finally {
                    setUpgradeLoading(false);
                  }
                };

                if (farmData?.boostExpiresAt) return null;

                if (!tonWalletAddress) return (
                  <button onClick={() => tonConnectUI.openModal()} style={{ width: '100%', padding: '15px', marginBottom: 10, background: 'linear-gradient(135deg, #0088CC, #229ED9)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 18px rgba(0,136,204,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} className="active:scale-95 transition-transform">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    Connect TON Wallet
                  </button>
                );

                if (upgradeLoading) return (
                  <button disabled style={{ width: '100%', padding: '15px', marginBottom: 10, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 14, color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    {upgradeStep === 'paying' ? 'Waiting for wallet...' : 'Verifying on blockchain...'}
                  </button>
                );

                if (upgradeStep === 'needs_verify') return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                      Payment sent but not confirmed yet. Wait 1–2 min then tap Verify Again.
                    </div>
                    <button onClick={doVerify} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #d97706, #f59e0b)', border: 'none', borderRadius: 14, color: '#000', fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 18px rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} className="active:scale-95 transition-transform">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      Verify Again
                    </button>
                  </div>
                );

                return (
                  <div style={{ marginBottom: 10 }}>
                    <button onClick={async () => {
                      setUpgradeStep('paying'); setUpgradeLoading(true);
                      try {
                        await tonConnectUI.sendTransaction({ validUntil: Math.floor(Date.now() / 1000) + 600, messages: [{ address: 'UQC3F3vDP_W0pKMoEHWtFnpfNBOR336AriAOned-uhF6pikm', amount: '10000000000' }] });
                      } catch (err: any) {
                        showNotification(err?.message?.includes('reject') || err?.message?.includes('cancel') ? 'Transaction cancelled.' : (err?.message || 'Transaction failed.'), 'info');
                        setUpgradeStep('idle'); setUpgradeLoading(false); return;
                      }
                      showNotification('Payment sent! Verifying on blockchain...', 'info');
                      setUpgradeLoading(false); await doVerify();
                    }} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #d97706, #f59e0b)', border: 'none', borderRadius: 14, color: '#000', fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} className="active:scale-95 transition-transform">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      Pay 10 TON — Upgrade Speed
                    </button>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center', marginTop: 8 }}>Wallet: {tonWalletAddress.slice(0, 6)}...{tonWalletAddress.slice(-4)}</div>
                  </div>
                );
              })()}

              <button onClick={() => { if (!upgradeLoading) { setShowSpeedUpPopup(false); setUpgradeStep('idle'); } }} style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} className="active:scale-95 transition-transform">
                {farmData?.boostExpiresAt ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Alert Popup — bottom sheet */}
        {showAlertPopup && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAlertPopup(false)} />
            <div style={{ position: 'relative', width: '100%', background: 'linear-gradient(160deg, #0d0d0f, #111118)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '28px 28px 0 0', padding: '28px 20px 48px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 10 }}>Notice</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                  Press START to begin farming AXN. You can claim your earned AXN at any time — no need to wait for the full cycle.
                </div>
                <button onClick={() => setShowAlertPopup(false)} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }} className="active:scale-95 transition-transform">Got it</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Promo Popup */}
      {showPromoPopup && (
        <PromoPopup
          onClose={() => setShowPromoPopup(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }); setShowPromoPopup(false); }}
        />
      )}

      {/* Withdraw Popup */}
      {showWithdrawPopup && (
        <WithdrawPopup
          onClose={() => setShowWithdrawPopup(false)}
          userBalance={axnBalance}
        />
      )}

      {/* Staking Popup */}
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

      {/* Mystery Box Popup */}
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
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6', marginTop: 6 }}>CIPHER</div>
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
                : mysteryPhase === 'revealed' ? `You won ${mysteryReward} CIPHER!`
                : mysteryPhase === 'claiming' ? 'Claiming...'
                : 'Reward Claimed!'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, marginBottom: 28 }}>
              {mysteryPhase === 'opening' ? 'Wait for your prize...'
                : mysteryPhase === 'revealed' ? 'Tap below to claim your CIPHER'
                : mysteryPhase === 'claiming' ? 'Please wait...'
                : 'CIPHER added to your balance'}
            </div>

            {mysteryPhase === 'revealed' && (
              <button onClick={handleMysteryClaim} style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none', borderRadius: 50, color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
              }} className="active:scale-95 transition-transform">
                Claim {mysteryReward} CIPHER
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _SendChoicePopupRemoved({ user, onClose, onWithdraw, onSuccess }: {
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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)' }} />
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

        {mode === 'user' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recipient User ID</div>
              <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Enter User ID..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (AXN)</div>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" style={inputStyle} />
              {usdPreview && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 5 }}>{usdPreview}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note (optional)</div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." style={inputStyle} />
            </div>
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none', borderRadius: 14, color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
                fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
              }}
              className="active:scale-95 transition-transform"
            >
              {loading ? 'Sending...' : 'Send AXN'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ReceivePopupRemoved({ user, onClose }: { user: any; onClose: () => void }) {
  const copyId = () => {
    const id = user?.id?.toString() || '';
    navigator.clipboard.writeText(id).then(() => showNotification('User ID copied!', 'success')).catch(() => {});
  };
  const copyUsername = () => {
    const un = user?.username || '';
    navigator.clipboard.writeText(un).then(() => showNotification('Username copied!', 'success')).catch(() => {});
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '24px 20px 52px', zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)' }} />
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Receive AXN</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>
          Share your User ID or username so others can send you AXN directly.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>User ID</div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: 'monospace' }}>{user?.id ?? '—'}</div>
            </div>
            <button onClick={copyId} style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', border: 'none', borderRadius: 9, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Copy</button>
          </div>
          {user?.username && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Username</div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, fontFamily: 'monospace' }}>@{user.username}</div>
              </div>
              <button onClick={copyUsername} style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', border: 'none', borderRadius: 9, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Copy</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PromoPopup({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) { showNotification('Enter a promo code', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/promo/redeem', { code: code.trim() });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Promo code redeemed!', 'success');
        onSuccess();
      } else {
        showNotification(data.message || 'Invalid promo code', 'error');
      }
    } catch {
      showNotification('Failed to redeem. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '24px 20px 52px', zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)' }} />
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Promo Code</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code..."
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              border: '1.5px solid rgba(37,99,235,0.2)',
              fontSize: 15, color: '#fff', letterSpacing: '0.08em', fontWeight: 700,
              background: 'rgba(255,255,255,0.04)', outline: 'none',
              boxSizing: 'border-box', textAlign: 'center',
            }}
          />
        </div>
        <button
          onClick={handleRedeem}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
            border: 'none', borderRadius: 14, color: loading ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 15, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
          }}
          className="active:scale-95 transition-transform"
        >
          {loading ? 'Redeeming...' : 'Redeem'}
        </button>
      </div>
    </div>
  );
}
