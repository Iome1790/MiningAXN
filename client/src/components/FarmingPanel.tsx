import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { AXNIcon } from "@/components/AXNIcon";

const FARMING_RATE = 0.01;
const FARMING_DURATION = 2 * 60 * 60;

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';

interface FarmingState {
  isActive: boolean;
  startedAt: string | null;
  minedAxn: number;
  remainingSeconds: number;
  elapsedSeconds: number;
}

interface FarmingPanelProps {
  onWalletOpen?: () => void;
  onInviteOpen?: () => void;
  onProfileOpen?: () => void;
  onRoadmapChange?: (open: boolean) => void;
}

// ── Banner carousel ──
const BANNERS = ["/banner-1.png", "/banner-2.png"];
const BANNER_CHANNEL_URL = "https://t.me/LightningSatoshi";

function BannerCarousel({ onInviteOpen }: { onInviteOpen?: () => void }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % BANNERS.length), 3000);
    return () => clearInterval(t);
  }, []);
  function handleTap(index: number) {
    if (index === 0) {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) tg.openTelegramLink(BANNER_CHANNEL_URL);
      else window.open(BANNER_CHANNEL_URL, "_blank");
    } else if (index === 1) {
      onInviteOpen?.();
    }
  }
  return (
    <div style={{ position: "relative", width: "100%", height: "clamp(68px, 13svh, 100px)", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
      {BANNERS.map((src, i) => (
        <motion.img key={src} src={src} alt={`banner-${i + 1}`} onClick={() => handleTap(i)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", borderRadius: 12, cursor: "pointer" }}
          initial={false}
          animate={{ opacity: i === current ? 1 : 0, scale: i === current ? 1 : 1.02 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
      ))}
      <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, zIndex: 10, pointerEvents: "none" }}>
        {BANNERS.map((_, i) => (
          <motion.div key={i}
            animate={{ width: i === current ? 16 : 6, background: i === current ? "#3B82F6" : "rgba(255,255,255,0.35)" }}
            transition={{ duration: 0.3 }}
            style={{ height: 4, borderRadius: 2 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function FarmingPanel({ onWalletOpen, onInviteOpen, onProfileOpen, onRoadmapChange }: FarmingPanelProps) {
  const queryClient = useQueryClient();
  const [localElapsed, setLocalElapsed] = useState(0);

  const { data: farmingData, isLoading } = useQuery<FarmingState>({
    queryKey: ["/api/farming/state"],
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    staleTime: 15000,
  });

  useEffect(() => {
    if (!farmingData?.isActive || !farmingData.startedAt) {
      setLocalElapsed(farmingData?.elapsedSeconds ?? 0);
      return;
    }
    const startedAt = new Date(farmingData.startedAt).getTime();
    const tick = () => setLocalElapsed(Math.min(Math.floor((Date.now() - startedAt) / 1000), FARMING_DURATION));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [farmingData?.isActive, farmingData?.startedAt, farmingData?.elapsedSeconds]);

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/farming/start").then(r => r.json()),
    onSuccess: (d) => {
      if (d.success) { showNotification("Farming started! 0.01 AXN/sec", "success"); queryClient.invalidateQueries({ queryKey: ["/api/farming/state"] }); }
      else showNotification(d.message || "Failed to start", "error");
    },
    onError: () => showNotification("Failed to start farming", "error"),
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/farming/claim").then(r => r.json()),
    onSuccess: (d) => {
      if (d.success) {
        showNotification(`+${d.amount} AXN claimed!`, "success");
        queryClient.invalidateQueries({ queryKey: ["/api/farming/state"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else showNotification(d.message || "Nothing to claim", "error");
    },
    onError: () => showNotification("Failed to claim", "error"),
  });

  const isFarmingDone = localElapsed >= FARMING_DURATION;
  const isIdle = !farmingData?.isActive;
  const isFarming = !!(farmingData?.isActive && !isFarmingDone);
  const isReady = !!(farmingData?.isActive && isFarmingDone);

  const minedNow = parseFloat(Math.min(localElapsed * FARMING_RATE, FARMING_DURATION * FARMING_RATE).toFixed(4));
  const remaining = Math.max(0, FARMING_DURATION - localElapsed);
  const progressPct = Math.min((localElapsed / FARMING_DURATION) * 100, 100);
  const balance = Math.floor(parseFloat(user?.balance || "0"));

  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (isLoading && !farmingData) {
    return (
      <div className="w-full px-3 pt-4 space-y-3 pb-24">
        {[80, 130, 60, 90].map((h, i) => (
          <div key={i} className="w-full animate-pulse"
            style={{ height: h, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", clipPath: CUT_SM }} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-3 pt-4 flex flex-col gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 86px)" }}>

        {/* ── FARMING CARD ── */}
        <div style={{ clipPath: CUT_SM, padding: "1.5px", background: isReady ? "linear-gradient(135deg,rgba(0,200,80,0.6) 0%,rgba(0,140,60,0.35) 50%,rgba(0,200,80,0.6) 100%)" : "linear-gradient(135deg,rgba(0,160,255,0.5) 0%,rgba(0,80,200,0.3) 50%,rgba(0,160,255,0.5) 100%)", boxShadow: isReady ? "0 0 18px rgba(0,200,80,0.25)" : "0 0 18px rgba(0,120,255,0.18)" }}>
          <div style={{ clipPath: CUT_SM, background: "rgba(5,10,28,0.97)", padding: "18px 16px 16px" }}>

            {/* Top row: icon + label + balance */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AXNIcon size={22} />
                </div>
                <div>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 900, lineHeight: 1 }}>AXN Farming</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
                    {isIdle ? "Ready to farm" : isFarming ? "Farming in progress…" : "Ready to claim!"}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Balance</p>
                <p style={{ color: "#fff", fontSize: 15, fontWeight: 900 }}>{balance.toLocaleString()} <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>AXN</span></p>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "Rate", value: "0.01 AXN/s" },
                { label: "Duration", value: "2 hours" },
                { label: "Max Earn", value: "72 AXN" },
              ].map(s => (
                <div key={s.label} style={{ clipPath: CUT_SM, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "8px 6px", textAlign: "center" }}>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{s.label}</p>
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar (when active) */}
            {(isFarming || isReady) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, color: isReady ? "#4ade80" : "#60a5fa" }}>
                    {isReady ? "✓ COMPLETE" : `MINED: ${minedNow.toFixed(4)} AXN`}
                  </span>
                  {isFarming && (
                    <span style={{ fontFamily: "'Courier New',monospace", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)" }}>
                      {hh}:{mm}:{ss}
                    </span>
                  )}
                </div>
                <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ height: "100%", borderRadius: 4, background: isReady ? "linear-gradient(90deg,#16a34a,#22c55e)" : "linear-gradient(90deg,#1d4ed8,#3b82f6)", boxShadow: isReady ? "0 0 8px rgba(34,197,94,0.6)" : "0 0 8px rgba(59,130,246,0.6)" }}
                  />
                </div>
              </div>
            )}

            {/* Action button */}
            <div style={{ clipPath: CUT_SM, padding: "1.5px", background: isReady ? "linear-gradient(135deg,rgba(0,200,80,0.75) 0%,rgba(0,140,60,0.45) 50%,rgba(0,200,80,0.75) 100%)" : "linear-gradient(135deg,rgba(0,160,255,0.75) 0%,rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75) 100%)", boxShadow: isReady ? "0 0 20px rgba(0,200,80,0.4)" : isFarming ? "none" : "0 0 20px rgba(0,120,255,0.4)" }}>
              <button
                onClick={() => { if (isIdle) startMutation.mutate(); else if (isReady) claimMutation.mutate(); }}
                disabled={claimMutation.isPending || startMutation.isPending || isFarming}
                className="w-full active:opacity-75 transition-all disabled:opacity-60"
                style={{ clipPath: CUT_SM, height: 48, background: isReady ? "linear-gradient(135deg,#065f46 0%,#059669 40%,#047857 100%)" : "linear-gradient(180deg,rgba(5,16,44,0.99),rgba(3,9,26,0.99))", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {(claimMutation.isPending || startMutation.isPending)
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : isFarming
                  ? <>
                      <AXNIcon size={16} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Farming — {minedNow.toFixed(3)} AXN</span>
                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "monospace" }}>{hh}:{mm}:{ss} remaining</span>
                      </div>
                    </>
                  : isReady
                  ? <>
                      <AXNIcon size={20} />
                      <span style={{ color: "#fff", fontSize: 15, fontWeight: 900 }}>Claim {minedNow.toFixed(3)} AXN</span>
                    </>
                  : <>
                      <AXNIcon size={20} />
                      <span style={{ color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: "0.04em" }}>Start Farming</span>
                    </>
                }
              </button>
            </div>

          </div>
        </div>

        {/* ── BANNER CAROUSEL ── */}
        <BannerCarousel onInviteOpen={onInviteOpen} />

      </div>
    </>
  );
}
