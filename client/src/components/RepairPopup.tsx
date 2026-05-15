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

  const applyRepair = (deductCost = 0) => {
    queryClient.setQueryData<any>(["/api/axn-mining/state"], (old: any) =>
      old ? { ...old, machineHealth: 100 } : old
    );
    if (deductCost > 0) {
      queryClient.setQueryData<any>(["/api/auth/user"], (old: any) => {
        if (!old) return old;
        const newBal = Math.max(0, parseFloat(old.balance || "0") - deductCost);
        return { ...old, balance: String(Math.round(newBal)) };
      });
    }
  };

  const repairPaidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      applyRepair(repairCost);
      invalidate();
      onClose();
    },
    onError: (e: any) => showNotification(e.message || "Repair failed", "error"),
  });

  const repairFreeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/repair-free").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      applyRepair(0);
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: 'linear-gradient(180deg, rgba(14,26,58,0.99) 0%, rgba(7,13,30,0.99) 100%)', border: '1.5px solid rgba(251,146,60,0.25)' }}
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
              <img src="/icon-repair.png" alt="Repair" style={{ width: 80, height: 108, objectFit: "contain" }} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-[22px] uppercase leading-none tracking-wide">REPAIR</p>
              <p className="text-orange-400 font-black text-base leading-none mt-0.5">MACHINE</p>
              <p className="text-white/40 text-[10px] mt-1 leading-tight">Restore machine health to 100%</p>
              <div className="flex items-center gap-2 mt-2">
                <FaHeartbeat style={{ color: healthColor, width: 13, height: 13 }} />
                <span className="text-white/40 text-xs">Health:</span>
                <span className="font-black text-sm tabular-nums" style={{ color: healthColor }}>{machineHealth}%</span>
              </div>
            </div>
          </div>

          <div className="h-px mx-5" style={{ background: 'rgba(251,146,60,0.18)' }} />

          <div className="px-5 py-4 space-y-2.5">
            {/* Stats card */}
            <div className="rounded-xl px-4 py-3 space-y-2.5" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(251,146,60,0.12)' }}>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs font-bold uppercase tracking-wide">Health</span>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-xs font-bold tabular-nums">{machineHealth}%</span>
                  <span className="text-white/25 text-xs">→</span>
                  <span className="text-[#F5C542] text-xs font-black">100%</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${machineHealth}%`, background: healthColor }} />
              </div>
              <div className="h-px" style={{ background: 'rgba(251,146,60,0.1)' }} />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FaHourglassHalf style={{ color: '#60a5fa', width: 12, height: 12 }} />
                  <span className="text-white/40 text-xs">Free Cooldown</span>
                </div>
                {cooldown > 0
                  ? <span className="text-white/50 font-black text-sm tabular-nums">{formatCooldown(cooldown)}</span>
                  : <span className="text-green-400 font-black text-sm">Ready</span>}
              </div>
              <div className="h-px" style={{ background: 'rgba(251,146,60,0.1)' }} />
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs font-bold uppercase tracking-wide">Cost</span>
                <div className="flex items-center gap-1">
                  <AXNIcon size={13} />
                  <span className={`font-black text-sm tabular-nums ${canAfford ? "text-[#F5C542]" : "text-red-400/70"}`}>{repairCost} AXN</span>
                </div>
              </div>
            </div>

            {isFullHealth ? (
              <div className="w-full h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <span className="text-green-400 font-black text-sm">Machine is at 100% health</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFreeRepair}
                  disabled={cooldown > 0 || adWatching || repairFreeMutation.isPending}
                  className="h-12 rounded-xl font-black text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                >
                  {repairFreeMutation.isPending || adWatching
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : cooldown > 0
                    ? <><FaHourglassHalf style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} /> {formatCooldown(cooldown)}</>
                    : <><RiTv2Fill style={{ width: 16, height: 16, color: '#60a5fa' }} /> Ad Free</>}
                </button>
                <button
                  onClick={() => repairPaidMutation.mutate()}
                  disabled={repairPaidMutation.isPending || !canAfford}
                  className="h-12 rounded-xl font-black text-sm transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                  style={canAfford
                    ? { background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', color: '#fff', boxShadow: '0 0 18px rgba(29,78,216,0.45)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
                >
                  {repairPaidMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><AXNIcon size={20} /> {repairCost}</>}
                </button>
              </div>
            )}

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
