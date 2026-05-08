import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronRight } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

interface MachineState {
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRate: number;
  capacity: number;
  cpuDurationSec: number;
  upgMining: number;
  upgCapacity: number;
  upgCpu: number;
  balance: number;
}

interface UpgradeMachinePopupProps {
  onClose: () => void;
  initialSubView?: "mining" | "capacity" | "cpu";
}

type SubView = null | "mining" | "capacity" | "cpu";

export default function UpgradeMachinePopup({ onClose, initialSubView }: UpgradeMachinePopupProps) {
  const [subView, setSubView] = useState<SubView>(initialSubView ?? null);
  const queryClient = useQueryClient();

  const { data: state } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    retry: false,
    staleTime: 10000,
  });

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const upgradeMutation = useMutation({
    mutationFn: (type: string) =>
      apiRequest("POST", "/api/axn-mining/upgrade", { type }).then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      invalidate();
      if (initialSubView) { onClose(); } else { setSubView(null); }
    },
    onError: (e: any) => showNotification(e.message || "Upgrade failed", "error"),
  });

  if (!state) return null;

  const canAffordMining = state.balance >= state.upgMining;
  const canAffordCapacity = state.balance >= state.upgCapacity;
  const canAffordCpu = state.balance >= state.upgCpu;

  const nextMiningRate = (state.miningRate + 0.01).toFixed(2);
  const nextCapacity = state.capacity + 24;
  const nextCpuMin = state.cpuDurationSec / 60 + 30;

  const popupBg = 'linear-gradient(180deg, rgba(14,26,58,0.99) 0%, rgba(7,13,30,0.99) 100%)';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: popupBg, border: '1.5px solid rgba(139,92,246,0.28)' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          <AnimatePresence mode="wait">
            {!subView && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15 }}
              >
                {/* Main header */}
                <div className="flex items-center gap-4 px-5 pt-5 pb-4">
                  <motion.div
                    className="flex items-center justify-center flex-shrink-0"
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.06 }}
                  >
                    <img src="/upgrade-icon.png" alt="Upgrade" className="w-16 h-16 object-contain" style={{ imageRendering: "pixelated" }} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-[22px] uppercase leading-none tracking-wide">UPGRADE</p>
                    <p className="text-purple-400 font-black text-base leading-none mt-0.5">MACHINE</p>
                    <div className="flex items-center gap-1 mt-2">
                      <AXNIcon size={12} />
                      <span className="text-white/40 text-xs">Balance: {state.balance.toFixed(2)} AXN</span>
                    </div>
                  </div>
                </div>

                <div className="h-px mx-5" style={{ background: 'rgba(139,92,246,0.2)' }} />

                <div className="px-5 py-4 space-y-2">
                  <UpgradeRow
                    iconSrc="/mining-speed-icon.png"
                    iconBg="rgba(139,92,246,0.15)"
                    iconBorder="rgba(139,92,246,0.35)"
                    label="Mining Speed"
                    sublabel="Earn more AXN per second"
                    level={state.miningLevel}
                    levelColor="#c084fc"
                    isMax={state.miningLevel >= 25}
                    onClick={() => setSubView("mining")}
                  />
                  <UpgradeRow
                    iconSrc="/capacity-icon.png"
                    iconBg="rgba(245,158,11,0.15)"
                    iconBorder="rgba(245,158,11,0.35)"
                    label="Capacity"
                    sublabel="Store more AXN before collecting"
                    level={state.capacityLevel}
                    levelColor="#fbbf24"
                    isMax={state.capacityLevel >= 25}
                    onClick={() => setSubView("capacity")}
                  />
                  <UpgradeRow
                    iconSrc="/cpu-time-icon.png"
                    iconBg="rgba(59,130,246,0.15)"
                    iconBorder="rgba(59,130,246,0.35)"
                    label="CPU Duration"
                    sublabel="Mine longer each session"
                    level={state.cpuLevel}
                    levelColor="#60a5fa"
                    isMax={state.cpuLevel >= 25}
                    onClick={() => setSubView("cpu")}
                  />

                  <button
                    onClick={onClose}
                    className="w-full h-10 rounded-xl font-bold text-sm text-white/35 active:scale-[0.97] transition-transform"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}

            {subView === "mining" && (
              <UpgradeDetail
                key="mining"
                iconSrc="/mining-speed-icon.png"
                iconBg="rgba(139,92,246,0.15)"
                iconBorder="rgba(139,92,246,0.4)"
                accentColor="#c084fc"
                title="MINING"
                subtitle="SPEED"
                description="Increases AXN earned per second"
                currentLevel={state.miningLevel}
                nextLevel={state.miningLevel + 1}
                currentLabel="Rate"
                currentStat={`${state.miningRate}/s`}
                improvedStat={`${nextMiningRate}/s`}
                cost={state.upgMining}
                canAfford={canAffordMining}
                isMax={state.miningLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("mining")}
                onBack={() => initialSubView ? onClose() : setSubView(null)}
              />
            )}

            {subView === "capacity" && (
              <UpgradeDetail
                key="capacity"
                iconSrc="/capacity-icon.png"
                iconBg="rgba(245,158,11,0.15)"
                iconBorder="rgba(245,158,11,0.4)"
                accentColor="#fbbf24"
                title="CAPACITY"
                subtitle="STORAGE"
                description="Increases max AXN storage before collecting"
                currentLevel={state.capacityLevel}
                nextLevel={state.capacityLevel + 1}
                currentLabel="Storage"
                currentStat={`${state.capacity} AXN`}
                improvedStat={`${nextCapacity} AXN`}
                cost={state.upgCapacity}
                canAfford={canAffordCapacity}
                isMax={state.capacityLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("capacity")}
                onBack={() => initialSubView ? onClose() : setSubView(null)}
              />
            )}

            {subView === "cpu" && (
              <UpgradeDetail
                key="cpu"
                iconSrc="/cpu-time-icon.png"
                iconBg="rgba(59,130,246,0.15)"
                iconBorder="rgba(59,130,246,0.4)"
                accentColor="#60a5fa"
                title="CPU"
                subtitle="DURATION"
                description="Increases mining session length"
                currentLevel={state.cpuLevel}
                nextLevel={state.cpuLevel + 1}
                currentLabel="Session"
                currentStat={`${state.cpuDurationSec / 60}m`}
                improvedStat={`${nextCpuMin}m`}
                cost={state.upgCpu}
                canAfford={canAffordCpu}
                isMax={state.cpuLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("cpu")}
                onBack={() => initialSubView ? onClose() : setSubView(null)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface UpgradeRowProps {
  iconSrc: string;
  iconBg: string;
  iconBorder: string;
  label: string;
  sublabel: string;
  level: number;
  levelColor: string;
  isMax: boolean;
  onClick: () => void;
}

function UpgradeRow({ iconSrc, iconBg, iconBorder, label, sublabel, level, levelColor, isMax, onClick }: UpgradeRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={isMax}
      className="w-full text-left rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-3 px-3 py-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, border: `1.5px solid ${iconBorder}` }}>
        <img src={iconSrc} alt={label} className="w-10 h-10 object-contain" style={{ imageRendering: "pixelated" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-sm font-bold">{label}</span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide"
            style={{ color: levelColor, background: `${levelColor}18` }}>
            {isMax ? "MAX" : `Lv.${level}`}
          </span>
        </div>
        <p className="text-white/35 text-xs">{sublabel}</p>
      </div>
      {!isMax && <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
    </button>
  );
}

interface UpgradeDetailProps {
  iconSrc: string;
  iconBg: string;
  iconBorder: string;
  accentColor: string;
  title: string;
  subtitle: string;
  description: string;
  currentLevel: number;
  nextLevel: number;
  currentLabel: string;
  currentStat: string;
  improvedStat: string;
  cost: number;
  canAfford: boolean;
  isMax: boolean;
  isPending: boolean;
  onUpgrade: () => void;
  onBack: () => void;
}

function UpgradeDetail({
  iconSrc, iconBg, iconBorder, accentColor,
  title, subtitle, description,
  currentLevel, nextLevel,
  currentLabel, currentStat, improvedStat,
  cost, canAfford, isMax, isPending, onUpgrade, onBack,
}: UpgradeDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header: icon left + title right */}
      <div className="flex items-center gap-4 px-5 pt-5 pb-4">
        <motion.div
          className="flex items-center justify-center flex-shrink-0"
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.06 }}
        >
          <img src={iconSrc} alt={title} className="w-16 h-16 object-contain" style={{ imageRendering: "pixelated" }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-[22px] uppercase leading-none tracking-wide">{title}</p>
          <p className="font-black text-base leading-none mt-0.5" style={{ color: accentColor }}>{subtitle}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-white/50 font-black text-sm">Lv.{currentLevel}</span>
            <span className="text-white/25 text-xs">→</span>
            <span className="font-black text-sm" style={{ color: accentColor }}>Lv.{nextLevel}</span>
          </div>
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: `${iconBorder}` }} />

      <div className="px-5 py-4 space-y-2.5">
        {/* Stats card */}
        <div className="rounded-xl px-4 py-3 space-y-2.5" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(60,120,255,0.12)' }}>
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wide">{currentLabel}</span>
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-xs font-bold tabular-nums">{currentStat}</span>
              <span className="text-white/25 text-xs">→</span>
              <span className="text-[#F5C542] text-xs font-black tabular-nums">{improvedStat}</span>
            </div>
          </div>
          <div className="h-px" style={{ background: 'rgba(60,120,255,0.1)' }} />
          <div className="flex items-center justify-between">
            <span className="text-white/35 text-xs">{description}</span>
          </div>
          <div className="h-px" style={{ background: 'rgba(60,120,255,0.1)' }} />
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wide">Cost</span>
            <div className="flex items-center gap-1">
              <AXNIcon size={13} />
              <span className={`text-sm font-black tabular-nums ${canAfford ? "text-[#F5C542]" : "text-red-400/70"}`}>
                {cost} AXN
              </span>
            </div>
          </div>
        </div>

        {isMax ? (
          <div className="w-full h-12 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-white/25 text-sm font-black uppercase tracking-wider">Maximum Level Reached</span>
          </div>
        ) : (
          <button
            onClick={onUpgrade}
            disabled={isPending || !canAfford}
            className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={canAfford ? {
              background: "linear-gradient(135deg,#f59e0b,#d97706)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(245,158,11,0.35)",
            } : {
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><AXNIcon size={20} /> Upgrade · {cost} AXN</>}
          </button>
        )}

        <button
          onClick={onBack}
          className="w-full h-10 rounded-xl font-bold text-sm text-white/35 active:scale-[0.97] transition-transform"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          ← Back
        </button>
      </div>
    </motion.div>
  );
}
