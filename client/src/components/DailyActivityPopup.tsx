import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Gift, Check, Loader2 } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";

const DAILY_REWARDS = [
  { day: 1,  axn: 5 },
  { day: 2,  axn: 5 },
  { day: 3,  axn: 10 },
  { day: 4,  axn: 12 },
  { day: 5,  axn: 20 },
  { day: 6,  axn: 23 },
  { day: 7,  axn: 40 },
  { day: 8,  axn: 44 },
  { day: 9,  axn: 60 },
  { day: 10, axn: 65 },
  { day: 11, axn: 80 },
  { day: 12, axn: 86 },
  { day: 13, axn: 100 },
  { day: 14, axn: 107 },
  { day: 15, axn: 120 },
  { day: 16, axn: 128 },
  { day: 17, axn: 140 },
  { day: 18, axn: 149 },
  { day: 19, axn: 160 },
  { day: 20, axn: 170 },
  { day: 21, axn: 180 },
  { day: 22, axn: 191 },
  { day: 23, axn: 200 },
  { day: 24, axn: 212 },
  { day: 25, axn: 220 },
  { day: 26, axn: 233 },
  { day: 27, axn: 240 },
  { day: 28, axn: 254 },
  { day: 29, axn: 260 },
  { day: 30, axn: 275 },
];

const STORAGE_KEY = "daily_activity_last_seen";

interface DailyActivityPopupProps {
  onClose: () => void;
}

export default function DailyActivityPopup({ onClose }: DailyActivityPopupProps) {
  const queryClient = useQueryClient();
  const [adShowing, setAdShowing] = useState(false);

  const { data: activityData } = useQuery<{
    currentDay: number;
    claimed: boolean;
    nextReset: string;
  }>({
    queryKey: ["/api/daily-activity/status"],
    retry: false,
  });

  const currentDay = activityData?.currentDay ?? 1;
  const claimed = activityData?.claimed ?? false;

  const claimMutation = useMutation({
    mutationFn: async () => {
      setAdShowing(true);
      try {
        if (typeof (window as any).show_10401872 === "function") {
          try { await (window as any).show_10401872(); } catch {}
        } else if (typeof (window as any).Adsgram !== "undefined") {
          try { await (window as any).Adsgram.init({ blockId: "int-20373" }).show(); } catch {}
        }
      } catch {}
      setAdShowing(false);
      const res = await apiRequest("POST", "/api/daily-activity/claim");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to claim");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-activity/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const reward = DAILY_REWARDS[Math.min(currentDay - 1, 29)];
      showNotification(`+${reward.axn} AXN claimed for Day ${currentDay}!`, "success");
    },
    onError: (e: any) => showNotification(e.message || "Failed to claim", "error"),
  });

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[600] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
          style={{ background: "#0a0a0a", border: "1px solid #1c1c1e", maxHeight: "90vh" }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1c1c1e] flex-shrink-0">
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-white font-black text-sm uppercase tracking-wider">Daily Activity</p>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-[#1c1c1e] flex items-center justify-center text-white/50 active:scale-90 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="px-5 pt-4 pb-3 flex-shrink-0">
            <div className="bg-[#F5C542]/8 border border-[#F5C542]/15 rounded-2xl px-4 py-3 flex items-start gap-3">
              <Gift className="w-4 h-4 text-[#F5C542] flex-shrink-0 mt-0.5" />
              <p className="text-white/60 text-xs leading-relaxed">
                Visit daily and collect bonuses! Reach{" "}
                <span className="text-[#F5C542] font-bold">Day 30</span> to get the maximum prize! Then start again.
              </p>
            </div>
          </div>

          {/* Day Grid */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="grid grid-cols-5 gap-2">
              {DAILY_REWARDS.map((reward) => {
                const isPast = reward.day < currentDay;
                const isCurrent = reward.day === currentDay;
                const isFuture = reward.day > currentDay;
                const isClaimedToday = isCurrent && claimed;

                return (
                  <div
                    key={reward.day}
                    className={`rounded-2xl p-2 text-center border transition-all ${
                      isClaimedToday
                        ? "bg-green-500/15 border-green-500/30"
                        : isCurrent
                        ? "bg-[#F5C542]/12 border-[#F5C542]/40"
                        : isPast
                        ? "bg-[#1a1a1a] border-white/5 opacity-60"
                        : "bg-[#111] border-white/5 opacity-40"
                    }`}
                  >
                    {isClaimedToday ? (
                      <Check className="w-3.5 h-3.5 text-green-400 mx-auto mb-1" />
                    ) : (
                      <p className={`text-[9px] font-black uppercase tracking-wide mb-1 ${
                        isCurrent ? "text-[#F5C542]" : isPast ? "text-white/40" : "text-white/20"
                      }`}>
                        Day {reward.day}
                      </p>
                    )}
                    <p className={`text-[11px] font-black tabular-nums ${
                      isClaimedToday ? "text-green-400" : isCurrent ? "text-[#F5C542]" : isPast ? "text-white/50" : "text-white/25"
                    }`}>
                      {reward.axn}
                    </p>
                    <div className="flex items-center justify-center gap-0.5">
                      <AXNIcon size={8} />
                      <p className={`text-[8px] ${isCurrent && !isClaimedToday ? "text-[#F5C542]/60" : "text-white/20"}`}>AXN</p>
                    </div>
                    {!isClaimedToday && (
                      <p className={`text-[8px] font-black uppercase mt-0.5 ${
                        isCurrent ? "text-[#F5C542]/70" : isPast ? "text-white/30" : "text-white/15"
                      }`}>
                        {isPast ? "✓" : isCurrent ? "NOW" : `D${reward.day}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Claim Button */}
          <div className="px-5 pb-5 pt-3 border-t border-[#1c1c1e] flex-shrink-0">
            {claimed ? (
              <div className="w-full h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-black text-sm">Claimed for Today!</span>
              </div>
            ) : (
              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || adShowing}
                className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #F5C542, #d4920a)",
                  color: "#000",
                  boxShadow: "0 0 20px rgba(245,197,66,0.25)",
                }}
              >
                {claimMutation.isPending || adShowing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Claim Day {currentDay} — <AXNIcon size={14} /> {DAILY_REWARDS[Math.min(currentDay - 1, 29)].axn} AXN
                  </>
                )}
              </button>
            )}
            <p className="text-white/20 text-[10px] text-center mt-2">
              An ad will be shown before claiming your reward
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowDailyActivity(): boolean {
  const last = localStorage.getItem(STORAGE_KEY);
  if (!last) return true;
  const lastDate = new Date(last);
  const now = new Date();
  return lastDate.toDateString() !== now.toDateString();
}

export function markDailyActivitySeen(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}
