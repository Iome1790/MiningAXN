import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { RiTv2Fill, RiToolsFill } from "react-icons/ri";
import { FaHourglassHalf } from "react-icons/fa";
import { AXNIcon } from "@/components/AXNIcon";
import { FaHeartbeat } from "react-icons/fa";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const COOLDOWN_KEY = "repair_free_used_at";
const COOLDOWN_MS = 35 * 60 * 1000;

interface RepairPopupProps {
  repairCost: number;
  machineHealth: number;
  balance: number;
  onClose: () => void;
}

function getRemainingCooldown(): number {
  const stored = localStorage.getItem(COOLDOWN_KEY);
  if (!stored) return 0;
  const diff = COOLDOWN_MS - (Date.now() - parseInt(stored, 10));
  return Math.max(0, Math.floor(diff / 1000));
}

function formatCooldown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RepairPopup({ repairCost, machineHealth, balance, onClose }: RepairPopupProps) {
  const queryClient = useQueryClient();
  const [cooldown, setCooldown] = useState(getRemainingCooldown);
  const [adWatching, setAdWatching] = useState(false);

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

  const repairPaidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair").then((r) => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); onClose(); },
    onError: (e: any) => showNotification(e.message || "Repair failed", "error"),
  });

  const repairFreeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair-free").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Repair failed", "error"),
  });

  const handleFreeRepair = async () => {
    if (adWatching) return;
    setAdWatching(true);
    try {
      if (typeof (window as any).show_10963365 === "function") {
        try { await (window as any).show_10963365(); } catch {}
      }
      repairFreeMutation.mutate();
    } catch {
      showNotification("Ad failed. Try again.", "error");
    } finally {
      setAdWatching(false);
    }
  };

  const canAfford = balance >= repairCost;
  const isFullHealth = machineHealth >= 100;
  const healthColor = machineHealth > 60 ? "#22c55e" : machineHealth > 30 ? "#f59e0b" : "#ef4444";

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
            <RiToolsFill className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-wider">Repair Machine</p>
              <p className="text-white/35 text-[11px] mt-0.5">Restore machine health to 100%</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            {/* Health indicator */}
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaHeartbeat className="w-3.5 h-3.5" style={{ color: healthColor }} />
                  <span className="text-white/40 text-xs">Current Health</span>
                </div>
                <span className="font-black text-sm tabular-nums" style={{ color: healthColor }}>{machineHealth}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${machineHealth}%`, background: healthColor }}
                />
              </div>
            </div>

            {/* Cooldown row */}
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaHourglassHalf className="w-3.5 h-3.5 text-blue-400/60" />
                <span className="text-white/40 text-xs">Free Cooldown</span>
              </div>
              {cooldown > 0 ? (
                <span className="text-white/50 font-black text-sm tabular-nums">{formatCooldown(cooldown)}</span>
              ) : (
                <span className="text-green-400 font-black text-sm">Ready</span>
              )}
            </div>

            {/* Info note */}
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Machine health <span className="text-white/50">decreases over time</span> automatically. Repair to restore full mining efficiency.
              </p>
            </div>

            {isFullHealth ? (
              <div className="w-full h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <span className="text-green-400 font-black text-sm">Machine is at 100% health</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFreeRepair}
                  disabled={cooldown > 0 || adWatching || repairFreeMutation.isPending}
                  className="h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
                >
                  {repairFreeMutation.isPending || adWatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : cooldown > 0 ? (
                    <><FaHourglassHalf className="w-3.5 h-3.5 text-white/30" /> {formatCooldown(cooldown)}</>
                  ) : (
                    <><RiTv2Fill className="w-4 h-4 text-blue-400" /> Ad Free</>
                  )}
                </button>

                <button
                  onClick={() => repairPaidMutation.mutate()}
                  disabled={repairPaidMutation.isPending || !canAfford}
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
                  {repairPaidMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><AXNIcon size={22} /> {repairCost}</>
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
