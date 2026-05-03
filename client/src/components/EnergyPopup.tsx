import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, Clock, Play } from "lucide-react";
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

  const paidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message || "Energy refilled!", "success");
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

  const canAfford = balance >= energyCost;

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
            <Zap className="w-5 h-5 text-[#F5C542] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-wider">Energy Refill</p>
              <p className="text-white/35 text-[11px] mt-0.5">Refill energy to continue mining operations</p>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-white/25" />
                <span className="text-white/40 text-xs">Energy Status</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-400 font-black text-sm">Empty</span>
              </div>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3">
              <p className="text-white/30 text-[11px] leading-relaxed">
                Your CPU needs energy to mine AXN. <span className="text-white/50">Watch an ad for free</span> or pay AXN to refill instantly.
              </p>
            </div>

            <div className="bg-[#141414] border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-white/25" />
                <span className="text-white/40 text-xs">Free Cooldown</span>
              </div>
              {cooldown > 0 ? (
                <span className="text-white/50 font-black text-sm tabular-nums">{formatCooldown(cooldown)}</span>
              ) : (
                <span className="text-green-400 font-black text-sm">Ready</span>
              )}
            </div>

            <button
              onClick={handleFreeRefill}
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
                `Pay ${energyCost} AXN`
              ) : (
                `Need ${energyCost} AXN`
              )}
            </button>

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
