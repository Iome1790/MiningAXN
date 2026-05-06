import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { BsLightningChargeFill } from "react-icons/bs";
import { RiTv2Fill } from "react-icons/ri";
import { FaHourglassHalf } from "react-icons/fa";
import { AXNIcon } from "@/components/AXNIcon";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const ENERGY_FREE_COOLDOWN_KEY = "energy_free_used_at";
const COOLDOWN_MS = 35 * 60 * 1000;

function getRemainingCooldown(): number {
  const stored = localStorage.getItem(ENERGY_FREE_COOLDOWN_KEY);
  if (!stored) return 0;
  const diff = COOLDOWN_MS - (Date.now() - parseInt(stored, 10));
  return Math.max(0, Math.floor(diff / 1000));
}

function formatCooldown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface EnergyPopupProps {
  energyCost: number;
  balance: number;
  onClose: () => void;
}

export default function EnergyPopup({ energyCost, balance, onClose }: EnergyPopupProps) {
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

  // Instantly update energy state in cache — no waiting for refetch
  const applyEnergyRefill = (deductCost = 0) => {
    queryClient.setQueryData<any>(["/api/axn-mining/state"], (old: any) =>
      old ? { ...old, hasEnergy: true } : old
    );
    if (deductCost > 0) {
      queryClient.setQueryData<any>(["/api/auth/user"], (old: any) => {
        if (!old) return old;
        const newBal = Math.max(0, parseFloat(old.balance || "0") - deductCost);
        return { ...old, balance: String(Math.round(newBal)) };
      });
    }
  };

  const paidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message || "Energy refilled!", "success");
      applyEnergyRefill(energyCost);
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const freeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy-free").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message || "Energy refilled for free!", "success");
      localStorage.setItem(ENERGY_FREE_COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      applyEnergyRefill(0);
      invalidate();
      onClose();
    },
    onError: (e: any) => {
      if (e.message?.includes("endpoint") || e.message?.includes("not found")) {
        paidMutation.mutate();
      } else {
        showNotification(e.message || "Failed", "error");
      }
    },
  });

  const handleFreeRefill = async () => {
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

  const canAfford = balance >= energyCost;

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
            <BsLightningChargeFill className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-wider">Energy Refill</p>
              <p className="text-white/35 text-[11px] mt-0.5">Refill energy to continue mining operations</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BsLightningChargeFill className="w-3.5 h-3.5 text-red-400/60" />
                <span className="text-white/40 text-xs">Energy Status</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-400 font-black text-sm">Empty</span>
              </div>
            </div>

            <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Your CPU needs energy to mine AXN. <span className="text-white/50">Watch an ad for free</span> or pay AXN to refill instantly.
              </p>
            </div>

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

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleFreeRefill}
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
                  <><AXNIcon size={22} /> {energyCost}</>
                )}
              </button>
            </div>

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
