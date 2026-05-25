import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { useLocation } from "wouter";

const animStyles = `
@keyframes mine-glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.04); }
}
@keyframes mine-coin-float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50% { transform: translateY(-12px) scale(1.02); }
}
@keyframes mine-ring-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes mine-ring-reverse {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
@keyframes mine-scanline {
  0% { top: 10%; opacity: 0; }
  10% { opacity: 0.7; }
  90% { opacity: 0.7; }
  100% { top: 90%; opacity: 0; }
}
@keyframes mine-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes mine-badge-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
}
`;

function AXNCoin({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="gc-coin" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="40%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#92400e"/>
        </radialGradient>
        <radialGradient id="gc-inner" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#78350f"/>
        </radialGradient>
        <filter id="gc-glow">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gc-shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#f59e0b" floodOpacity="0.6"/>
        </filter>
      </defs>
      <circle cx="60" cy="60" r="57" fill="url(#gc-coin)" filter="url(#gc-shadow)"/>
      <circle cx="60" cy="60" r="57" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <circle cx="60" cy="60" r="44" fill="url(#gc-inner)"/>
      <path d="M32 36 Q60 26 88 36" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <text x="60" y="70" textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize="26" fontWeight="900"
        fontFamily="system-ui,sans-serif" letterSpacing="2">AXN</text>
      <circle cx="18" cy="26" r="3.5" fill="#fde68a" opacity="0.7"/>
      <circle cx="102" cy="20" r="2.5" fill="#fde68a" opacity="0.55"/>
      <circle cx="106" cy="92" r="2" fill="#fde68a" opacity="0.5"/>
      <circle cx="14" cy="90" r="2.5" fill="#fde68a" opacity="0.45"/>
    </svg>
  );
}

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #0a0a0a, #111118)',
        border: '1px solid rgba(37,99,235,0.35)',
        borderRadius: 24, padding: '40px 28px', textAlign: 'center', maxWidth: 300, width: '90%',
        boxShadow: '0 8px 48px rgba(37,99,235,0.35), 0 0 0 1px rgba(255,255,255,0.03)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 68, height: 68, borderRadius: '50%', margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 28px rgba(37,99,235,0.6)',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.5px' }}>Miner Store</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 28px', lineHeight: 1.6 }}>
          Mining upgrades and boosts coming soon. Get ready for exclusive performance enhancements!
        </p>
        <button onClick={onClose} style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          border: 'none', borderRadius: 50, color: '#fff',
          fontSize: 14, fontWeight: 800, padding: '11px 36px', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
        }}>Got it</button>
      </div>
    </div>
  );
}

export default function Games() {
  const [storeOpen, setStoreOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayed, setDisplayed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: miningState } = useQuery<any>({
    queryKey: ['/api/mining/state'],
    refetchInterval: 30000,
    staleTime: 5000,
  });

  const rawRate: number = miningState?.rawMiningRate ?? (0.036 / 3600);
  const baseAmount: number = parseFloat(miningState?.minedAmount ?? '0');

  useEffect(() => {
    setDisplayed(baseAmount);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (rawRate <= 0) return;
    intervalRef.current = setInterval(() => {
      setDisplayed(prev => parseFloat((prev + rawRate).toFixed(8)));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [baseAmount, rawRate]);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/mining/claim', {});
      return res.json();
    },
    onSuccess: (data) => {
      showNotification(`${parseFloat(data.claimed).toFixed(4)} AXN claimed!`, 'success');
      setDisplayed(0);
      queryClient.invalidateQueries({ queryKey: ['/api/mining/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (e: any) => {
      let msg = 'Claim failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    },
  });

  const ratePerHour = rawRate * 3600;
  const ratePerDay = ratePerHour * 24;

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{animStyles}</style>

      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setLocation('/wallet')} />

      {/* Background ambient */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at 50% 38%, rgba(245,158,11,0.06) 0%, rgba(37,99,235,0.04) 40%, transparent 70%)',
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', paddingTop: 80, paddingBottom: 90,
        position: 'relative', zIndex: 1,
      }}>

        {/* Active badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)',
          borderRadius: 50, padding: '6px 18px', marginBottom: 32,
          animation: 'mine-badge-pulse 2.2s ease-in-out infinite',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
            animation: 'mine-blink 1.6s ease-in-out infinite',
            boxShadow: '0 0 6px rgba(34,197,94,0.8)',
          }} />
          <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Free Mining Active ({ratePerDay.toFixed(1)} AXN/Day)
          </span>
        </div>

        {/* Coin with rings */}
        <div style={{ position: 'relative', width: 210, height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          {/* Outer ambient glow */}
          <div style={{
            position: 'absolute', width: 210, height: 210, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 65%)',
            animation: 'mine-glow-pulse 2.8s ease-in-out infinite',
          }} />
          {/* Ring 1 - fast spinning */}
          <div style={{
            position: 'absolute', width: 196, height: 196, borderRadius: '50%',
            border: '2px solid transparent',
            borderTopColor: 'rgba(245,158,11,0.8)',
            borderRightColor: 'rgba(245,158,11,0.3)',
            animation: 'mine-ring-spin 1.8s linear infinite',
          }} />
          {/* Ring 2 - reverse */}
          <div style={{
            position: 'absolute', width: 178, height: 178, borderRadius: '50%',
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(37,99,235,0.6)',
            borderLeftColor: 'rgba(37,99,235,0.2)',
            animation: 'mine-ring-reverse 2.6s linear infinite',
          }} />
          {/* Ring 3 - glow static */}
          <div style={{
            position: 'absolute', width: 158, height: 158, borderRadius: '50%',
            border: '1px solid rgba(245,158,11,0.12)',
            boxShadow: '0 0 20px rgba(245,158,11,0.15), inset 0 0 20px rgba(245,158,11,0.06)',
          }} />
          {/* Floating coin */}
          <div style={{ animation: 'mine-coin-float 3.2s ease-in-out infinite', position: 'relative', zIndex: 2 }}>
            <AXNCoin size={128} />
          </div>
          {/* Scan line */}
          <div style={{
            position: 'absolute', width: '75%', height: 2.5, left: '12.5%',
            background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7), transparent)',
            animation: 'mine-scanline 2.8s ease-in-out infinite',
            borderRadius: 2, zIndex: 3,
          }} />
        </div>

        {/* Live balance */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{
            color: '#f59e0b', fontSize: 46, fontWeight: 900,
            letterSpacing: '-1.5px', lineHeight: 1,
            textShadow: '0 0 28px rgba(245,158,11,0.55)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayed.toFixed(5)}
          </div>
        </div>

        {/* Speed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'mine-blink 1.2s infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 600 }}>
            Speed {rawRate.toFixed(7)}/sec
          </span>
        </div>

        {/* AXN logo */}
        <div style={{ marginBottom: 36, opacity: 0.25 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
            <text x="12" y="16" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="7" fontWeight="900" fontFamily="system-ui">AXN</text>
          </svg>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340, padding: '0 20px' }}>
          <button
            onClick={() => !claimMutation.isPending && claimMutation.mutate()}
            disabled={claimMutation.isPending || displayed < 0.00001}
            className="active:scale-95 transition-transform"
            style={{
              flex: 1, padding: '15px 0', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: 16, fontSize: 14, fontWeight: 900, color: '#000',
              boxShadow: '0 4px 24px rgba(245,158,11,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              opacity: (claimMutation.isPending || displayed < 0.00001) ? 0.45 : 1,
              transition: 'all 0.2s',
            }}
          >
            {claimMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            )}
            Claim Mined
          </button>

          <button
            onClick={() => setStoreOpen(true)}
            className="active:scale-95 transition-transform"
            style={{
              flex: 1, padding: '15px 0', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(37,99,235,0.35)',
              borderRadius: 16, fontSize: 14, fontWeight: 800, color: '#60a5fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 0 16px rgba(37,99,235,0.15)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Miner Store
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginTop: 20, width: '100%', maxWidth: 340, padding: '0 20px',
        }}>
          {[
            { label: 'Per Hour', value: ratePerHour.toFixed(4), color: '#f59e0b' },
            { label: 'Per Day', value: ratePerDay.toFixed(2), color: '#22c55e' },
            { label: 'Network', value: 'Active', color: '#60a5fa' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 12, padding: '10px 6px', textAlign: 'center',
            }}>
              <div style={{ color: s.color, fontSize: 13, fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {storeOpen && <ComingSoonModal onClose={() => setStoreOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
