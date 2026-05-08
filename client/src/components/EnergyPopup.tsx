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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(14,26,58,0.99) 0%, rgba(7,13,30,0.99) 100%)', border: '1.5px solid rgba(250,204,21,0.25)' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header: icon left + title right */}
          <div className="flex items-center gap-4 px-5 pt-5 pb-4">
            <motion.div
              className="flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.06 }}
            >
              <img src="/energy-icon.png" alt="Energy" className="w-24 h-24 object-contain" style={{ imageRendering: "pixelated" }} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-[22px] uppercase leading-none tracking-wide">ENERGY</p>
              <p className="text-yellow-400 font-black text-base leading-none mt-0.5">RECHARGE</p>
              <p className="text-white/40 text-[10px] mt-0.5 leading-tight">Refill CPU energy to start mining</p>
              <div className="flex items-center gap-1.5 mt-2">
                <BsLightningChargeFill style={{ color: '#f87171', width: 13, height: 13 }} />
                <span className="text-red-400 font-black text-sm">Empty</span>
              </div>
            </div>
          </div>

          <div className="h-px mx-5" style={{ background: 'rgba(250,204,21,0.18)' }} />

          <div className="px-5 py-4 space-y-2.5">
            {/* Stats card */}
            <div className="rounded-xl px-4 py-3 space-y-2.5" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(250,204,21,0.1)' }}>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs font-bold uppercase tracking-wide">Energy</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xs font-black">Empty</span>
                  <span className="text-white/25 text-xs">→</span>
                  <span className="text-[#F5C542] text-xs font-black">Full ⚡</span>
                </div>
              </div>
              <div className="h-px" style={{ background: 'rgba(250,204,21,0.1)' }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FaHourglassHalf style={{ color: '#60a5fa', width: 12, height: 12 }} />
                  <span className="text-white/40 text-xs">Free Cooldown</span>
                </div>
                {cooldown > 0
                  ? <span className="text-white/50 font-black text-sm tabular-nums">{formatCooldown(cooldown)}</span>
                  : <span className="text-green-400 font-black text-sm">Ready</span>}
              </div>
              <div className="h-px" style={{ background: 'rgba(250,204,21,0.1)' }} />
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs font-bold uppercase tracking-wide">Cost</span>
                <div className="flex items-center gap-1">
                  <AXNIcon size={13} />
                  <span className={`font-black text-sm tabular-nums ${canAfford ? "text-[#F5C542]" : "text-red-400/70"}`}>{energyCost} AXN</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleFreeRefill}
                disabled={cooldown > 0 || adWatching || freeMutation.isPending}
                className="h-12 rounded-xl font-black text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              >
                {freeMutation.isPending || adWatching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : cooldown > 0
                  ? <><FaHourglassHalf style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} /> {formatCooldown(cooldown)}</>
                  : <><RiTv2Fill style={{ width: 16, height: 16, color: '#60a5fa' }} /> Ad Free</>}
              </button>
              <button
                onClick={() => paidMutation.mutate()}
                disabled={paidMutation.isPending || !canAfford}
                className="h-12 rounded-xl font-black text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                style={canAfford
                  ? { background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', color: '#fff', boxShadow: '0 0 18px rgba(29,78,216,0.45)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
              >
                {paidMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><AXNIcon size={20} /> {energyCost}</>}
              </button>
            </div>

            <button onClick={onClose}
              className="w-full h-10 rounded-xl font-bold text-sm text-white/35 active:scale-[0.97] transition-transform"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
