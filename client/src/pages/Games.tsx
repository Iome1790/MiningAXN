import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { useLocation } from "wouter";

const FARMING_DURATION_MS = 3 * 60 * 60 * 1000;
const TON_PER_AXN = 0.00001;

const animStyles = `
@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
}
@keyframes ripple-1 {
  0% { transform: scale(0.92); opacity: 0.5; }
  100% { transform: scale(1.28); opacity: 0; }
}
@keyframes ripple-2 {
  0% { transform: scale(0.92); opacity: 0.35; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes float-img {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-9px); }
}
@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
`;

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function Games() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayed, setDisplayed] = useState(0);
  const [sessionDelta, setSessionDelta] = useState(0);
  const [tonPrice, setTonPrice] = useState<number | null>(null);
  const [farmingStartTime, setFarmingStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('farming_start_time');
    return saved ? parseInt(saved) : null;
  });
  const [now, setNow] = useState(Date.now());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deltaSetRef = useRef(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: miningState } = useQuery<any>({
    queryKey: ['/api/mining/state'],
    refetchInterval: 30000,
    staleTime: 5000,
  });

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const baseAmount: number = parseFloat(miningState?.minedAmount ?? '0');
  const axnUsdValue = tonPrice ? axnBalance * TON_PER_AXN * tonPrice : 0;

  const isFarming = farmingStartTime !== null;
  const elapsed = farmingStartTime ? now - farmingStartTime : 0;
  const farmingDone = elapsed >= FARMING_DURATION_MS;
  const timeLeft = farmingStartTime ? Math.max(0, FARMING_DURATION_MS - elapsed) : FARMING_DURATION_MS;
  const farmingPct = isFarming ? Math.min(100, (elapsed / FARMING_DURATION_MS) * 100) : 0;

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setTonPrice(d?.['the-open-network']?.usd ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  useEffect(() => {
    if (!deltaSetRef.current && baseAmount > 0) {
      deltaSetRef.current = true;
      const lastAmount = parseFloat(localStorage.getItem('last_mined_amount') || '0');
      const delta = parseFloat((baseAmount - lastAmount).toFixed(4));
      if (delta > 0) setSessionDelta(delta);
      localStorage.setItem('last_mined_amount', baseAmount.toString());
    }
  }, [baseAmount]);

  const perSecRate = parseFloat(miningState?.rawMiningRate?.toString() ?? '0');

  useEffect(() => {
    setDisplayed(baseAmount);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isFarming || farmingDone) return;
    intervalRef.current = setInterval(() => {
      setDisplayed(prev => parseFloat((prev + perSecRate).toFixed(5)));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [baseAmount, isFarming, farmingDone, perSecRate]);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/mining/claim', {});
      return res.json();
    },
    onSuccess: (data) => {
      showNotification(`${parseFloat(data.claimed ?? displayed.toString()).toFixed(4)} AXN claimed!`, 'success');
      setDisplayed(0);
      setSessionDelta(0);
      localStorage.setItem('last_mined_amount', '0');
      setFarmingStartTime(null);
      localStorage.removeItem('farming_start_time');
      queryClient.invalidateQueries({ queryKey: ['/api/mining/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      let msg = 'Claim failed. Please try again.';
      try { const p = JSON.parse(error.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    },
  });

  const handleStartFarming = () => {
    const t = Date.now();
    setFarmingStartTime(t);
    localStorage.setItem('farming_start_time', t.toString());
    showNotification('Mining started! Come back in 3 hours.', 'success');
  };

  const handleClaim = () => { claimMutation.mutate(); };

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{animStyles}</style>
      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setLocation('/wallet')} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '68px 20px 68px',
      }}>

        {/* ── Total Balance ── */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Total Balance
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 2 }}>
          <span style={{ color: '#fff', fontSize: 32, fontWeight: 900, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
            {axnBalance.toLocaleString()}
          </span>
          <span style={{ color: 'rgba(96,165,250,0.85)', fontSize: 16, fontWeight: 700, marginLeft: 6 }}>AXN</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 500 }}>
            {tonPrice ? `≈ $${axnUsdValue.toFixed(4)} USD` : '— USD'}
          </span>
        </div>

        {/* ── AXN Coin Image ── */}
        <div style={{
          position: 'relative', width: 200, height: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          {/* Soft background glow */}
          <div style={{
            position: 'absolute', width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 68%)',
            animation: 'glow-pulse 2.8s ease-in-out infinite',
          }} />
          {/* Ripple ring 1 */}
          <div style={{
            position: 'absolute', width: 190, height: 190, borderRadius: '50%',
            border: '1.5px solid rgba(59,130,246,0.5)',
            animation: 'ripple-1 2.4s ease-out infinite',
          }} />
          {/* Ripple ring 2 — delayed */}
          <div style={{
            position: 'absolute', width: 190, height: 190, borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.28)',
            animation: 'ripple-2 2.4s ease-out 1s infinite',
          }} />
          {/* Coin */}
          <div style={{
            width: 178, height: 178, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            position: 'relative', zIndex: 2,
            animation: 'float-img 3.5s ease-in-out infinite',
            boxShadow: '0 0 32px rgba(59,130,246,0.35), 0 0 70px rgba(59,130,246,0.12)',
            border: '2px solid rgba(59,130,246,0.25)',
          }}>
            <img
              src="/axn-coin-new.png"
              alt="AXN"
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%) scale(1.18)',
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              }}
            />
          </div>
        </div>

        {/* ── Mining Power + Mined ── */}
        <div style={{ width: '100%', maxWidth: 340 }}>

          {/* Row: Mining Power label | speed */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Mining Power
            </span>
            <span style={{ color: '#3b82f6', fontSize: 11, fontWeight: 800, fontFamily: 'monospace' }}>
              {parseFloat(miningState?.miningRate ?? '0.036').toFixed(4)}/h
            </span>
          </div>

          {/* Mined amount + delta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{
                color: isFarming ? '#fff' : 'rgba(255,255,255,0.45)',
                fontSize: 32, fontWeight: 900,
                letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums',
                textShadow: isFarming ? '0 0 20px rgba(96,165,250,0.3)' : 'none',
              }}>
                {displayed.toFixed(4)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, fontWeight: 600 }}>AXN</span>
            </div>
            {sessionDelta > 0 && (
              <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 800 }}>
                +{sessionDelta.toFixed(4)}
              </span>
            )}
          </div>

          {/* Action Button */}
          {!isFarming ? (
            <button onClick={handleStartFarming} className="active:scale-95 transition-transform" style={{
              width: '100%', padding: '14px 0', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              borderRadius: 16, fontSize: 15, fontWeight: 900, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 28px rgba(37,99,235,0.45)', letterSpacing: '0.02em',
            }}>
              Start Mining
            </button>
          ) : farmingDone ? (
            <button onClick={handleClaim} disabled={claimMutation.isPending} className="active:scale-95 transition-transform" style={{
              width: '100%', padding: '14px 0', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              borderRadius: 16, fontSize: 15, fontWeight: 900, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: '0 4px 28px rgba(34,197,94,0.4)',
              opacity: claimMutation.isPending ? 0.7 : 1,
            }}>
              {claimMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              Claim Mined AXN
            </button>
          ) : (
            <button disabled style={{
              width: '100%', padding: '14px 0',
              border: '1px solid rgba(59,130,246,0.15)', cursor: 'not-allowed',
              background: 'rgba(37,99,235,0.04)', borderRadius: 16, fontSize: 14, fontWeight: 800,
              color: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'monospace', letterSpacing: '0.05em',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#3b82f6',
                animation: 'dot-blink 1.4s ease-in-out infinite',
                boxShadow: '0 0 8px #3b82f6', flexShrink: 0,
              }} />
              {formatCountdown(timeLeft)}
            </button>
          )}
        </div>

      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
