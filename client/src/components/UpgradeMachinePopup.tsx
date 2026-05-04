import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Activity, HardDrive, Cpu, Settings, ChevronRight } from "lucide-react";
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
}

type SubView = null | "mining" | "capacity" | "cpu";

export default function UpgradeMachinePopup({ onClose }: UpgradeMachinePopupProps) {
  const [subView, setSubView] = useState<SubView>(null);
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
      setSubView(null);
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

  const subViewIcon =
    subView === "mining" ? <Activity className="w-5 h-5 text-[#F5C542] flex-shrink-0" />
    : subView === "capacity" ? <HardDrive className="w-5 h-5 text-blue-400 flex-shrink-0" />
    : subView === "cpu" ? <Cpu className="w-5 h-5 text-purple-400 flex-shrink-0" />
    : null;

  const subViewTitle =
    subView === "mining" ? "Mining Speed"
    : subView === "capacity" ? "Capacity"
    : subView === "cpu" ? "CPU Duration"
    : "";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center px-4"
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
            {subView ? subViewIcon : <Settings className="w-5 h-5 text-white/60 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-wider">
                {subView ? subViewTitle : "Upgrade Machine"}
              </p>
              {subView ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <AXNIcon size={12} />
                  <span className="text-white/35 text-[11px]">Balance: {state.balance.toFixed(2)} AXN</span>
                </div>
              ) : (
                <p className="text-white/35 text-[11px] mt-0.5">Improve speed, capacity & session length</p>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!subView && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15 }}
                className="px-5 py-4 space-y-2.5"
              >
                <UpgradeRow
                  icon={<Activity className="w-5 h-5 text-[#F5C542]" />}
                  label="Mining Speed"
                  sublabel="Earn more AXN per second"
                  level={state.miningLevel}
                  levelColor="#F5C542"
                  isMax={state.miningLevel >= 25}
                  onClick={() => setSubView("mining")}
                />
                <UpgradeRow
                  icon={<HardDrive className="w-5 h-5 text-blue-400" />}
                  label="Capacity"
                  sublabel="Store more AXN before collecting"
                  level={state.capacityLevel}
                  levelColor="#60a5fa"
                  isMax={state.capacityLevel >= 25}
                  onClick={() => setSubView("capacity")}
                />
                <UpgradeRow
                  icon={<Cpu className="w-5 h-5 text-purple-400" />}
                  label="CPU Duration"
                  sublabel="Mine longer each session"
                  level={state.cpuLevel}
                  levelColor="#c084fc"
                  isMax={state.cpuLevel >= 25}
                  onClick={() => setSubView("cpu")}
                />

                <button
                  onClick={onClose}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 active:scale-[0.97] transition-transform"
                  style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  Close
                </button>
              </motion.div>
            )}

            {subView === "mining" && (
              <UpgradeDetail
                key="mining"
                icon={<Activity className="w-6 h-6 text-[#F5C542]" />}
                description="Increase mining speed to earn more AXN per second."
                currentLevel={state.miningLevel}
                nextLevel={state.miningLevel + 1}
                currentLabel="Current rate"
                currentStat={`${state.miningRate}/sec`}
                improvedLabel="New rate"
                improvedStat={`${nextMiningRate}/sec`}
                cost={state.upgMining}
                canAfford={canAffordMining}
                isMax={state.miningLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("mining")}
                onBack={() => setSubView(null)}
              />
            )}

            {subView === "capacity" && (
              <UpgradeDetail
                key="capacity"
                icon={<HardDrive className="w-6 h-6 text-blue-400" />}
                description="Increase coin storage to hold more AXN before collecting."
                currentLevel={state.capacityLevel}
                nextLevel={state.capacityLevel + 1}
                currentLabel="Max capacity"
                currentStat={`${state.capacity} AXN`}
                improvedLabel="New capacity"
                improvedStat={`${nextCapacity} AXN`}
                cost={state.upgCapacity}
                canAfford={canAffordCapacity}
                isMax={state.capacityLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("capacity")}
                onBack={() => setSubView(null)}
              />
            )}

            {subView === "cpu" && (
              <UpgradeDetail
                key="cpu"
                icon={<Cpu className="w-6 h-6 text-purple-400" />}
                description="Increase mining duration for longer continuous sessions."
                currentLevel={state.cpuLevel}
                nextLevel={state.cpuLevel + 1}
                currentLabel="Session length"
                currentStat={`${state.cpuDurationSec / 60} min`}
                improvedLabel="New session length"
                improvedStat={`${nextCpuMin} min`}
                cost={state.upgCpu}
                canAfford={canAffordCpu}
                isMax={state.cpuLevel >= 25}
                isPending={upgradeMutation.isPending}
                onUpgrade={() => upgradeMutation.mutate("cpu")}
                onBack={() => setSubView(null)}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface UpgradeRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  level: number;
  levelColor: string;
  isMax: boolean;
  onClick: () => void;
}

function UpgradeRow({ icon, label, sublabel, level, levelColor, isMax, onClick }: UpgradeRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={isMax}
      className="w-full text-left rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-3.5 px-4 py-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white text-sm font-bold">{label}</span>
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide"
              style={{ color: levelColor, background: `${levelColor}18` }}
            >
              {isMax ? "MAX" : `Lv.${level}`}
            </span>
          </div>
          <p className="text-white/35 text-xs">{sublabel}</p>
        </div>
        {!isMax && (
          <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
        )}
      </div>
    </button>
  );
}

interface UpgradeDetailProps {
  icon: React.ReactNode;
  description: string;
  currentLevel: number;
  nextLevel: number;
  currentLabel: string;
  currentStat: string;
  improvedLabel: string;
  improvedStat: string;
  cost: number;
  canAfford: boolean;
  isMax: boolean;
  isPending: boolean;
  onUpgrade: () => void;
  onBack: () => void;
}

function UpgradeDetail({
  icon, description,
  currentLevel, nextLevel,
  currentLabel, currentStat,
  improvedLabel, improvedStat,
  cost, canAfford, isMax, isPending, onUpgrade, onBack,
}: UpgradeDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.15 }}
      className="px-5 py-4 space-y-2.5"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <p className="text-white/40 text-xs leading-relaxed">{description}</p>
      </div>

      <div className="rounded-2xl px-4 py-4 space-y-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs font-bold uppercase tracking-wider">Level</span>
          <div className="flex items-center gap-2">
            <span className="text-white/50 text-sm font-black">{currentLevel}</span>
            <span className="text-white/20 text-xs">→</span>
            <span className="text-[#F5C542] text-sm font-black">{nextLevel}</span>
          </div>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <span className="text-white/35 text-xs">{currentLabel}</span>
          <span className="text-white text-xs font-bold tabular-nums">{currentStat}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#F5C542]/60 text-xs">{improvedLabel}</span>
          <span className="text-[#F5C542] text-xs font-black tabular-nums">{improvedStat}</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs font-bold uppercase tracking-wider">Cost</span>
          <div className="flex items-center gap-1">
            <AXNIcon size={14} />
            <span className={`text-sm font-black tabular-nums ${canAfford ? "text-[#F5C542]" : "text-red-400/70"}`}>
              {cost} AXN
            </span>
          </div>
        </div>
      </div>

      {isMax ? (
        <div className="w-full h-12 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-white/25 text-sm font-black uppercase tracking-wider">Maximum Level Reached</span>
        </div>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={isPending || !canAfford}
          className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={canAfford ? {
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            color: "#fff",
            boxShadow: "0 0 20px rgba(59,130,246,0.25)",
          } : {
            background: "#1c1c1e",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <><AXNIcon size={22} /> {cost} AXN</>
          )}
        </button>
      )}

      <button
        onClick={onBack}
        className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 active:scale-[0.97] transition-transform"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        ← Back
      </button>
    </motion.div>
  );
}
