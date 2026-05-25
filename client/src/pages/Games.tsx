import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { useLocation } from "wouter";

const FARMING_DURATION_MS = 3 * 60 * 60 * 1000;
const MINING_RATE = 0.01;

const animStyles = `
@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}
@keyframes float-img {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
@keyframes spark {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes blue-ring-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  const [farmingStartTime, setFarmingStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem('farming_start_time');
    return saved ? parseInt(saved) : null;
  });
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: miningState } = useQuery<any>({
    queryKey: ['/api/mining/state'],
    refetchInterval: 30000,
    staleTime: 5000,
  });

  const baseAmount: number = parseFloat(miningState?.minedAmount ?? '0');

  const isFarming = farmingStartTime !== null;
  const elapsed = farmingStartTime ? now - farmingStartTime : 0;
  const farmingDone = elapsed >= FARMING_DURATION_MS;
  const timeLeft = farmingStartTime ? Math.max(0, FARMING_DURATION_MS - elapsed) : FARMING_DURATION_MS;

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  useEffect(() => {
    setDisplayed(baseAmount);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isFarming || farmingDone) return;
    intervalRef.current = setInterval(() => {
      setDisplayed(prev => parseFloat((prev + MINING_RATE).toFixed(4)));
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [baseAmount, isFarming, farmingDone]);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/mining/claim', {});
      return res.json();
    },
    onSuccess: (data) => {
      showNotification(`${parseFloat(data.claimed ?? displayed.toString()).toFixed(4)} AXN claimed!`, 'success');
      setDisplayed(0);
      setFarmingStartTime(null);
      localStorage.removeItem('farming_start_time');
      queryClient.invalidateQueries({ queryKey: ['/api/mining/state'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: () => {
      showNotification(`${displayed.toFixed(4)} AXN claimed!`, 'success');
      setDisplayed(0);
      setFarmingStartTime(null);
      localStorage.removeItem('farming_start_time');
    },
  });

  const handleStartFarming = () => {
    const t = Date.now();
    setFarmingStartTime(t);
    localStorage.setItem('farming_start_time', t.toString());
    showNotification('Mining started! Come back in 3 hours.', 'success');
  };

  const handleClaim = () => {
    claimMutation.mutate();
  };

  const handleMinerStore = () => {
    showNotification('Coming Soon', 'info');
  };

  const farmingPct = isFarming ? Math.min(100, (elapsed / FARMING_DURATION_MS) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{animStyles}</style>

      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setLocation('/wallet')} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', paddingTop: 72, paddingBottom: 90,
        position: 'relative',
      }}>

        {/* Mining status label */}
        <div style={{
          color: isFarming ? '#3b82f6' : 'rgba(255,255,255,0.3)',
          fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 18,
        }}>
          {isFarming ? (farmingDone ? 'FARMING COMPLETE — CLAIM NOW' : 'FARMING ACTIVE') : 'READY TO FARM'}
        </div>

        {/* Live mined counter */}
        <div style={{
          color: isFarming ? '#60a5fa' : 'rgba(255,255,255,0.25)',
          fontSize: 52, fontWeight: 900,
          letterSpacing: '-1px', lineHeight: 1, marginBottom: 14,
          fontVariantNumeric: 'tabular-nums',
          textShadow: isFarming ? '0 0 30px rgba(96,165,250,0.4)' : 'none',
          transition: 'color 0.3s',
        }}>
          {displayed.toFixed(4)}
        </div>

        {/* Speed pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 50, padding: '6px 16px', marginBottom: 32,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isFarming ? '#3b82f6' : 'rgba(255,255,255,0.3)',
            flexShrink: 0,
            animation: isFarming ? 'dot-blink 1.4s ease-in-out infinite' : 'none',
            boxShadow: isFarming ? '0 0 8px #3b82f6' : 'none',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
            SPEED: {MINING_RATE.toFixed(2)} / sec
          </span>
        </div>

        {/* AXN Image circle — BLUE neon */}
        <div style={{
          position: 'relative', width: 220, height: 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 44,
        }}>
          {/* Outer blue glow */}
          <div style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 70%)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }} />

          {/* Particle sparks — blue */}
          {[
            { top: '8%', left: '22%', delay: '0s' },
            { top: '12%', right: '20%', delay: '0.4s' },
            { bottom: '10%', left: '18%', delay: '0.8s' },
            { bottom: '8%', right: '22%', delay: '1.2s' },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', width: 5, height: 5, borderRadius: '50%',
              background: '#3b82f6', ...pos,
              animation: `spark 2s ${pos.delay} ease-in-out infinite`,
            }} />
          ))}

          {/* Blue circle frame */}
          <div style={{
            width: 190, height: 190, borderRadius: '50%',
            border: '3px solid rgba(59,130,246,0.7)',
            boxShadow: '0 0 40px rgba(59,130,246,0.45), 0 0 80px rgba(59,130,246,0.2), inset 0 0 20px rgba(59,130,246,0.1)',
            overflow: 'hidden', flexShrink: 0,
            position: 'relative', zIndex: 2,
            animation: 'float-img 3.5s ease-in-out infinite',
          }}>
            <img
              src="/axn-icon.png"
              alt="AXN"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Progress bar (visible when farming) */}
        {isFarming && (
          <div style={{ width: '100%', maxWidth: 300, marginBottom: 20, padding: '0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>
                {farmingDone ? 'Complete!' : 'Farming...'}
              </span>
              <span style={{ color: '#3b82f6', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                {farmingDone ? '3:00:00 ✓' : formatCountdown(timeLeft)}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 9999,
                background: farmingDone ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #2563eb, #3b82f6)',
                width: `${farmingPct}%`,
                transition: 'width 0.5s',
                boxShadow: farmingDone ? '0 0 10px rgba(74,222,128,0.5)' : '0 0 10px rgba(59,130,246,0.5)',
              }} />
            </div>
          </div>
        )}

        {/* Buttons — single column, full width, blue premium */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          width: '100%', maxWidth: 340, padding: '0 20px',
        }}>
          {/* Main farming button */}
          {!isFarming ? (
            <button
              onClick={handleStartFarming}
              className="active:scale-95 transition-transform"
              style={{
                padding: '16px 0', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                borderRadius: 16, fontSize: 15, fontWeight: 900,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 24px rgba(37,99,235,0.45)',
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="5 3 19 12 5 21 5 3" fill="white"/>
              </svg>
              Start Farming
            </button>
          ) : farmingDone ? (
            <button
              onClick={handleClaim}
              disabled={claimMutation.isPending}
              className="active:scale-95 transition-transform"
              style={{
                padding: '16px 0', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                borderRadius: 16, fontSize: 15, fontWeight: 900,
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 24px rgba(34,197,94,0.4)',
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
                opacity: claimMutation.isPending ? 0.7 : 1,
              }}
            >
              {claimMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                  <path d="M8 12l3 3 5-5"/>
                </svg>
              )}
              Claim Mined AXN
            </button>
          ) : (
            <button
              disabled
              style={{
                padding: '16px 0', border: '1px solid rgba(59,130,246,0.25)', cursor: 'not-allowed',
                background: 'rgba(37,99,235,0.08)',
                borderRadius: 16, fontSize: 14, fontWeight: 800,
                color: 'rgba(255,255,255,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#3b82f6',
                animation: 'dot-blink 1.4s ease-in-out infinite',
                boxShadow: '0 0 8px #3b82f6',
                flexShrink: 0,
              }} />
              {formatCountdown(timeLeft)}
            </button>
          )}

          {/* Miner Store button */}
          <button
            onClick={handleMinerStore}
            className="active:scale-95 transition-transform"
            style={{
              padding: '16px 0', cursor: 'pointer',
              background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 16, fontSize: 15, fontWeight: 800,
              color: '#93c5fd',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(37,99,235,0.2)',
              transition: 'all 0.2s',
              letterSpacing: '0.02em',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Miner Store
          </button>
        </div>

      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
