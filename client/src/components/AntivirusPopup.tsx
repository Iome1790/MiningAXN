import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { RiShieldCheckFill, RiShieldFlashFill, RiTv2Fill } from "react-icons/ri";
import { FaHourglassHalf, FaBug } from "react-icons/fa";
import { AXNIcon } from "@/components/AXNIcon";
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
      if (typeof (window as any).show_10963365 === "function") {
        try { await (window as any).show_10963365(); } catch {}
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
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl overflow-hidden popup-glow-open"
          style={{ background: 'rgba(8,14,32,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
            {antivirusActive
              ? <RiShieldFlashFill style={{ width: 22, height: 22, color: "#4ade80", flexShrink: 0 }} />
              : <FaBug style={{ width: 20, height: 20, color: "#f87171", flexShrink: 0 }} />
            }
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-wider">Antivirus</p>
              <p className="text-white/35 text-[11px] mt-0.5">Protects your CPU time from virus drain</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            {/* Status row */}
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
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
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaHourglassHalf className="w-3.5 h-3.5 text-blue-400/60" />
                <span className="text-white/40 text-xs">Protection Duration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">{durationLabel}</span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide text-blue-400 bg-blue-400/10">
                  AV Lv.{miningLevel}
                </span>
              </div>
            </div>

            {/* Consolidated info */}
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Antivirus level must match <span className="text-white/50">Mining, Capacity, and CPU</span>. Each level adds <span className="text-white/50">+10 min</span> of protection.
              </p>
              <p className="text-white/30 text-[11px] leading-relaxed">
                Without antivirus, viruses drain <span className="text-white/50">CPU time every 2 minutes</span>. Higher levels lose more per tick.
              </p>
            </div>

            {antivirusActive ? (
              <div className="w-full h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                <RiShieldFlashFill style={{ width: 18, height: 18, color: "#4ade80" }} />
                <span className="text-green-400 font-black text-sm">CPU Time Protected</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFreeActivate}
                  disabled={cooldown > 0 || adWatching || freeMutation.isPending}
                  className="h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
                >
                  {freeMutation.isPending || adWatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : cooldown > 0 ? (
                    <><FaHourglassHalf className="w-3.5 h-3.5 text-white/30" /> {formatCooldown(cooldown)}</>
                  ) : (
                    <><RiTv2Fill className="w-4 h-4 text-blue-400" /> Ad Free</>
                  )}
                </button>

                <button
                  onClick={() => paidMutation.mutate()}
                  disabled={paidMutation.isPending || !canAfford}
                  className="h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={canAfford ? {
                    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                    color: "#fff",
                    boxShadow: "0 0 18px rgba(59,130,246,0.25)",
                  } : {
                    background: "#1c1c1e",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {paidMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><AXNIcon size={22} /> {antivirusCost}</>
                  )}
                </button>
              </div>
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
