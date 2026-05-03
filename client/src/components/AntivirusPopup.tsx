import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Loader2, Clock, Play } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const FREE_COOLDOWN_KEY = "antivirus_free_used_at";
const AV_ACTIVE_KEY = "av_activated_at";
const COOLDOWN_MS = 35 * 60 * 1000;

export function getAvDurationMs(avLevel: number): number {
  const level = Math.max(1, Math.min(25, avLevel || 1));
  return (level * 10 + 10) * 60 * 1000;
}

export const AV_DURATION_MS = getAvDurationMs(1);

function getRemainingCooldown(): number {
  const stored = localStorage.getItem(FREE_COOLDOWN_KEY);
  if (!stored) return 0;
  const diff = COOLDOWN_MS - (Date.now() - parseInt(stored, 10));
  return Math.max(0, Math.floor(diff / 1000));
}

function formatCooldown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDurationMinutes(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${min} minutes`;
}

interface AntivirusPopupProps {
  antivirusCost: number;
  antivirusActive: boolean;
  balance: number;
  miningLevel: number;
  onClose: () => void;
}

export default function AntivirusPopup({ antivirusCost, antivirusActive, balance, miningLevel, onClose }: AntivirusPopupProps) {
  const queryClient = useQueryClient();
  const [cooldown, setCooldown] = useState(getRemainingCooldown);
  const [adWatching, setAdWatching] = useState(false);

  const avDurationMs = getAvDurationMs(miningLevel);
  const durationLabel = formatDurationMinutes(avDurationMs);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      const remaining = getRemainingCooldown();
      setCooldown(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const paidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/toggle-antivirus").then((r) => r.json()),
    onSuccess: (d) => {
      if (d.active) {
        localStorage.setItem(AV_ACTIVE_KEY, String(Date.now()));
        showNotification(`Antivirus activated for ${durationLabel}!`, "success");
      } else {
        localStorage.removeItem(AV_ACTIVE_KEY);
        showNotification("Antivirus deactivated.", "info");
      }
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const freeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/antivirus-free").then((r) => r.json()),
    onSuccess: () => {
      localStorage.setItem(AV_ACTIVE_KEY, String(Date.now()));
      localStorage.setItem(FREE_COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      showNotification(`Antivirus activated for ${durationLabel}! (Free)`, "success");
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const handleFreeActivate = async () => {
    if (adWatching) return;
    setAdWatching(true);
    try {
      if (typeof (window as any).show_10401872 === "function") {
        try { await (window as any).show_10401872(); } catch {}
      } else if (typeof (window as any).Adsgram !== "undefined") {
        try { await (window as any).Adsgram.init({ blockId: "int-20373" }).show(); } catch {}
      }
      freeMutation.mutate();
    } catch {
      showNotification("Ad failed. Try again.", "error");
    } finally {
      setAdWatching(false);
    }
  };

  const canAfford = balance >= antivirusCost;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ background: '#0a0a0a', border: '1px solid #1c1c1e' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
            <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-wider">Antivirus</p>
              <p className="text-white/35 text-[11px] mt-0.5">Protects your AXN balance from virus attacks</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            {/* Status row */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-white/40 text-xs">Protection Status</span>
              {antivirusActive ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-black text-sm">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-red-400 font-black text-sm">Exposed</span>
                </div>
              )}
            </div>

            {/* Duration row */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-white/25" />
                <span className="text-white/40 text-xs">Protection Duration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">{durationLabel}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide text-[#F5C542] bg-[#F5C542]/10">
                  AV Lv.{miningLevel}
                </span>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Antivirus level = <span className="text-white/50">lowest level among Mining, Capacity & CPU.</span> Upgrade all three equally to increase duration by +10 min per level.
              </p>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Antivirus <span className="text-white/50">only protects your AXN balance</span> — machine health decreases naturally over time regardless.
              </p>
            </div>

            {antivirusActive ? (
              <div className="w-full h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-black text-sm">Balance Protected</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleFreeActivate}
                  disabled={cooldown > 0 || adWatching || freeMutation.isPending}
                  className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
                >
                  {freeMutation.isPending || adWatching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : cooldown > 0 ? (
                    <><Clock className="w-4 h-4 text-white/30" /> <span className="text-white/40">Free in {formatCooldown(cooldown)}</span></>
                  ) : (
                    <><Play className="w-4 h-4 text-white/60" /> Free — Watch Ad</>
                  )}
                </button>

                <button
                  onClick={() => paidMutation.mutate()}
                  disabled={paidMutation.isPending || !canAfford}
                  className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={canAfford ? {
                    background: "linear-gradient(135deg, #F5C542, #d4920a)",
                    color: "#000",
                    boxShadow: "0 0 18px rgba(245,197,66,0.2)",
                  } : {
                    background: "#1c1c1e",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {paidMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : canAfford ? (
                    `Pay ${antivirusCost} AXN`
                  ) : (
                    `Need ${antivirusCost} AXN`
                  )}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 active:scale-[0.97] transition-transform"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
