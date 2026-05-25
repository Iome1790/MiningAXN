import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { useLocation } from "wouter";

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
`;

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#111', border: '1px solid rgba(245,196,0,0.3)',
        borderRadius: 24, padding: '40px 28px', textAlign: 'center', maxWidth: 300, width: '90%',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          background: 'rgba(245,196,0,0.12)', border: '1px solid rgba(245,196,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>⚡</div>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 10px' }}>Miner Store</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 28px', lineHeight: 1.6 }}>
          Mining upgrades and boosts coming soon!
        </p>
        <button onClick={onClose} style={{
          background: '#F5C400', border: 'none', borderRadius: 50,
          color: '#000', fontSize: 14, fontWeight: 800, padding: '11px 36px', cursor: 'pointer',
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

  const ratePerDay = rawRate * 3600 * 24;
  const canClaim = displayed >= 0.00001 && !claimMutation.isPending;

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{animStyles}</style>

      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setLocation('/wallet')} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', paddingTop: 72, paddingBottom: 90,
        position: 'relative',
      }}>

        {/* ── Mining status label ── */}
        <div style={{
          color: '#F5C400', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: 18,
        }}>
          FREE MINING ACTIVE ({ratePerDay.toFixed(1)} AXN/DAY)
        </div>

        {/* ── Live mined counter ── */}
        <div style={{
          color: '#FF5C5C', fontSize: 52, fontWeight: 900,
          letterSpacing: '-1px', lineHeight: 1, marginBottom: 14,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {displayed.toFixed(4)}
        </div>

        {/* ── Speed pill ── */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 50, padding: '6px 16px', marginBottom: 32,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0,
            animation: 'dot-blink 1.4s ease-in-out infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
            SPEED: {rawRate.toFixed(7)} / sec
          </span>
        </div>

        {/* ── AXN Image circle ── */}
        <div style={{
          position: 'relative', width: 220, height: 220,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 44,
        }}>
          {/* Outer gold glow */}
          <div style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,196,0,0.22) 0%, transparent 70%)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }} />

          {/* Particle sparks */}
          {[
            { top: '8%', left: '22%', delay: '0s' },
            { top: '12%', right: '20%', delay: '0.4s' },
            { bottom: '10%', left: '18%', delay: '0.8s' },
            { bottom: '8%', right: '22%', delay: '1.2s' },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', width: 5, height: 5, borderRadius: '50%',
              background: '#F5C400', ...pos,
              animation: `spark 2s ${pos.delay} ease-in-out infinite`,
            }} />
          ))}

          {/* Gold circle frame */}
          <div style={{
            width: 190, height: 190, borderRadius: '50%',
            border: '3px solid rgba(245,196,0,0.6)',
            boxShadow: '0 0 40px rgba(245,196,0,0.35), inset 0 0 20px rgba(245,196,0,0.08)',
            overflow: 'hidden', flexShrink: 0,
            position: 'relative', zIndex: 2,
            animation: 'float-img 3.5s ease-in-out infinite',
          }}>
            <img
              src="/axn-coin.jpg"
              alt="AXN"
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
                display: 'block',
                transform: 'scale(1.35)',
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>

        {/* ── Buttons ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          width: '100%', maxWidth: 340, padding: '0 20px',
        }}>
          <button
            onClick={() => canClaim && claimMutation.mutate()}
            disabled={!canClaim}
            className="active:scale-95 transition-transform"
            style={{
              padding: '15px 0', border: 'none', cursor: canClaim ? 'pointer' : 'not-allowed',
              background: canClaim ? '#BAED2E' : 'rgba(255,255,255,0.06)',
              borderRadius: 14, fontSize: 14, fontWeight: 900,
              color: canClaim ? '#000' : 'rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: canClaim ? '0 4px 20px rgba(186,237,46,0.4)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {claimMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
                <path d="M8 12l3 3 5-5"/>
              </svg>
            )}
            CLAIM MINED
          </button>

          <button
            onClick={() => setStoreOpen(true)}
            className="active:scale-95 transition-transform"
            style={{
              padding: '15px 0', cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, fontSize: 14, fontWeight: 800,
              color: '#F5C400',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            MINER STORE ⚡
          </button>
        </div>

      </div>

      {storeOpen && <ComingSoonModal onClose={() => setStoreOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
