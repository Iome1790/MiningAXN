import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronRight, Wrench, Gift } from "lucide-react";
import { useAdFlow } from "@/hooks/useAdFlow";
import { RiPlayFill, RiToolsFill, RiCpuFill, RiDatabase2Fill } from "react-icons/ri";
import { BsLightningChargeFill } from "react-icons/bs";
import { FaBug } from "react-icons/fa";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import RepairPopup from "@/components/RepairPopup";
import AntivirusPopup from "@/components/AntivirusPopup";
import UpgradeMachinePopup from "@/components/UpgradeMachinePopup";
import EnergyPopup from "@/components/EnergyPopup";

interface MachineState {
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRate: number;
  capacity: number;
  cpuDurationSec: number;
  minedAxn: number;
  cpuRunning: boolean;
  cpuRemainingSeconds: number;
  hasEnergy: boolean;
  antivirusActive: boolean;
  avSecondsLeft: number;
  machineHealth: number;
  energyCost: number;
  repairCost: number;
  antivirusCost: number;
  upgMining: number;
  upgCapacity: number;
  upgCpu: number;
  isMaxLevel: boolean;
  balance: number;
  pendingVirusDamage: number;
  nextVirusIn: number;
}

interface MiningMachinePanelProps {
  onWalletOpen?: () => void;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ── Mini sine-wave chart (right side of mining card) ── */
function MiniWaveform({ active }: { active: boolean }) {
  const p1 = "M0,14 C18,4 36,24 54,14 C72,4 90,24 108,14 C126,4 144,24 162,14 C180,4 198,24 216,14 C234,4 252,24 270,14 C288,4 306,24 320,14";
  const p2 = "M0,14 C18,24 36,4 54,14 C72,24 90,4 108,14 C126,24 144,4 162,14 C180,24 198,4 216,14 C234,24 252,4 270,14 C288,24 306,4 320,14";
  return (
    <div className="w-full overflow-hidden" style={{ height: 28 }}>
      <svg viewBox="0 0 320 28" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wg" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="wg2" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <motion.path d={p2} fill="none" stroke="url(#wg2)" strokeWidth="1.5" strokeLinecap="round"
          animate={active ? { d: [p2, p1, p2] } : {}}
          transition={active ? { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 } : {}}
          opacity={active ? 0.7 : 0.15} />
        <motion.path d={p1} fill="none" stroke="url(#wg)" strokeWidth="2" strokeLinecap="round"
          animate={active ? { d: [p1, p2, p1] } : {}}
          transition={active ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : {}}
          opacity={active ? 0.95 : 0.2} />
      </svg>
    </div>
  );
}

/* ── Pixel-art heart (full / half / empty) ── */
function PixelHeart({ type, isLow }: { type: "full" | "half" | "empty"; isLow: boolean }) {
  const red = isLow ? "#bb1111" : "#cc2222";
  const hi  = "#ff7777";
  const dark = "#1c1010";
  // heart shape rects on a 9×8 grid
  const shape = [
    {x:1,y:0,w:2,h:1},{x:5,y:0,w:2,h:1},
    {x:0,y:1,w:9,h:3},
    {x:1,y:4,w:7,h:1},
    {x:2,y:5,w:5,h:1},
    {x:3,y:6,w:3,h:1},
    {x:4,y:7,w:1,h:1},
  ];
  // left-side rects for half heart (x < 4.5)
  const halfRed = [
    {x:1,y:0,w:2,h:1},
    {x:0,y:1,w:4,h:3},
    {x:1,y:4,w:3,h:1},
    {x:2,y:5,w:2,h:1},
    {x:3,y:6,w:1,h:1},
  ];
  return (
    <svg width="17" height="17" viewBox="0 0 9 8" style={{ imageRendering: "pixelated", flexShrink: 0 }}>
      {/* base: dark fill for empty/half, red for full */}
      {shape.map((r,i) => <rect key={i} {...r} fill={type === "full" ? red : dark} />)}
      {/* half: paint left side red */}
      {type === "half" && halfRed.map((r,i) => <rect key={i} {...r} fill={red} />)}
      {/* highlight on filled areas */}
      {type !== "empty" && <><rect x="1" y="0" width="1" height="1" fill={hi} /><rect x="0" y="1" width="1" height="1" fill={hi} /></>}
      {type === "half"  && <><rect x="1" y="0" width="1" height="1" fill={hi} /><rect x="0" y="1" width="1" height="1" fill={hi} /></>}
    </svg>
  );
}

export default function MiningMachinePanel({ onWalletOpen }: MiningMachinePanelProps) {
  const queryClient = useQueryClient();
  const { showMonetagAd } = useAdFlow();
  const [cpuCountdown, setCpuCountdown] = useState(0);
  const [repairOpen, setRepairOpen] = useState(false);
  const [antivirusOpen, setAntivirusOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [adRunning, setAdRunning] = useState(false);

  const { data: state } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    refetchInterval: 15000,
    staleTime: 14000,
    retry: false,
  });

  useEffect(() => {
    if (!state) return;
    if (state.cpuRunning && state.cpuRemainingSeconds > 0) setCpuCountdown(state.cpuRemainingSeconds);
    else if (!state.cpuRunning) setCpuCountdown(0);
  }, [state?.cpuRemainingSeconds, state?.cpuRunning]);

  useEffect(() => {
    if (cpuCountdown <= 0) return;
    const t = setInterval(() => setCpuCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [cpuCountdown > 0]);

  const [localMined, setLocalMined] = useState(0);
  useEffect(() => { if (state) setLocalMined(state.minedAxn); }, [state?.minedAxn]);

  useEffect(() => {
    if (!state?.cpuRunning || !state?.miningRate || state.machineHealth <= 0) return;
    const t = setInterval(() => {
      setLocalMined(prev => Math.min(prev + state.miningRate, state.capacity));
    }, 1000);
    return () => clearInterval(t);
  }, [state?.cpuRunning, state?.miningRate, state?.capacity, state?.machineHealth]);

  const [avSecondsLeft, setAvSecondsLeft] = useState(0);
  const avIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const avBaseRef = useRef<{ fetchedAt: number; serverSeconds: number } | null>(null);

  useEffect(() => {
    if (!state) return;
    if (state.antivirusActive && state.avSecondsLeft > 0) {
      avBaseRef.current = { fetchedAt: Date.now(), serverSeconds: state.avSecondsLeft };
      setAvSecondsLeft(state.avSecondsLeft);
      if (avIntervalRef.current) clearInterval(avIntervalRef.current);
      avIntervalRef.current = setInterval(() => {
        if (!avBaseRef.current) return;
        const remaining = Math.max(0, avBaseRef.current.serverSeconds - Math.floor((Date.now() - avBaseRef.current.fetchedAt) / 1000));
        setAvSecondsLeft(remaining);
        if (remaining <= 0 && avIntervalRef.current) { clearInterval(avIntervalRef.current); avIntervalRef.current = null; }
      }, 1000);
    } else {
      if (avIntervalRef.current) { clearInterval(avIntervalRef.current); avIntervalRef.current = null; }
      avBaseRef.current = null;
      setAvSecondsLeft(0);
    }
    return () => { if (avIntervalRef.current) { clearInterval(avIntervalRef.current); avIntervalRef.current = null; } };
  }, [state?.antivirusActive, state?.avSecondsLeft]);

  const invalidate = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const patchState = useCallback((patch: Partial<MachineState>) => {
    queryClient.setQueryData<MachineState>(["/api/axn-mining/state"], old => old ? { ...old, ...patch } : old);
  }, [queryClient]);

  const startCpuMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/start-cpu").then(r => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      patchState({ cpuRunning: true, hasEnergy: false, cpuRemainingSeconds: state?.cpuDurationSec ?? 0 });
      invalidate();
    },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/claim").then(r => r.json()),
    onSuccess: (d) => {
      showNotification(`+${d.amount?.toFixed(2)} AXN collected!`, "success");
      setLocalMined(0);
      patchState({ minedAxn: 0 });
      invalidate();
    },
    onError: (e: any) => showNotification(e.message || "Nothing to collect", "error"),
  });

  const handleStartMining = useCallback(async () => {
    if (adRunning || startCpuMutation.isPending) return;
    setAdRunning(true);
    try { await showMonetagAd(); } catch {}
    setAdRunning(false);
    startCpuMutation.mutate();
  }, [adRunning, startCpuMutation, showMonetagAd]);

  const handleCollect = useCallback(async () => {
    if (adRunning || claimMutation.isPending) return;
    setAdRunning(true);
    try { await showMonetagAd(); } catch {}
    setAdRunning(false);
    claimMutation.mutate();
  }, [adRunning, claimMutation, showMonetagAd]);

  /* ── Loading skeleton ── */
  if (!state) {
    return (
      <div className="w-full px-3 space-y-2 pb-24">
        {[72, 210, 82, 78, 170].map((h, i) => (
          <div key={i} className="w-full rounded-2xl animate-pulse"
            style={{ height: h, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    );
  }

  /* ── Derived state ── */
  const capacityPct = Math.min(100, (localMined / state.capacity) * 100);
  const healthColor = state.machineHealth > 60 ? "#22c55e" : state.machineHealth > 30 ? "#f59e0b" : "#ef4444";
  const canClaim = localMined >= 0.01;
  const machineStopped = state.machineHealth <= 0;
  const noEnergy = !state.hasEnergy && !state.cpuRunning;
  const isMining = state.cpuRunning && state.machineHealth > 0;

  const energyPct = state.cpuRunning
    ? Math.max(0, Math.round((cpuCountdown / state.cpuDurationSec) * 100))
    : state.hasEnergy ? 100 : 0;

  const minedUsd = (localMined * 0.00014).toFixed(4);

  const statusText = machineStopped ? "Stopped" : isMining ? "Your machine is mining" : noEnergy ? "No Energy" : "Idle";
  const statusDesc = machineStopped
    ? "Repair required to resume mining."
    : isMining ? "Machine is running. Keep it powered."
    : noEnergy ? "Refill energy to continue mining."
    : "Start your CPU to begin earning.";
  const dotColor = machineStopped ? "#ef4444" : isMining ? "#22c55e" : "#f59e0b";

  const nextMiningRate = (state.miningRate * 1.5).toFixed(4);
  const nextCapacity = (state.capacity * 2).toFixed(0);
  const nextCpuSec = Math.round(state.cpuDurationSec * 1.5);

  const card = { background: "rgba(12,12,16,0.97)", border: "1px solid rgba(255,255,255,0.08)" } as React.CSSProperties;
  const dim = "rgba(255,255,255,0.06)";

  return (
    <>
      {/* ═══════════════════════════════════════════
          SCROLLABLE CONTENT
      ═══════════════════════════════════════════ */}
      <div className="w-full px-3 space-y-2 pb-24">

        {/* ── 1. MINING MACHINE CARD ── */}
        <div className="rounded-2xl overflow-hidden" style={card}>

          {/* Top: Left cube illustration | Right: status + waveform */}
          <div className="flex">

            {/* LEFT — mining machine illustration */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center p-3 pb-4"
              style={{ width: 152 }}>
              {/* outer glow ring */}
              <div className="relative flex items-center justify-center">
                {/* blue outer glow */}
                <div className="absolute rounded-2xl"
                  style={{ inset: -6, background: "radial-gradient(ellipse,rgba(59,130,246,0.18) 0%,transparent 72%)", filter: "blur(6px)" }} />

                {/* main machine body */}
                <div className="relative rounded-2xl overflow-hidden"
                  style={{
                    width: 120, height: 120,
                    background: "linear-gradient(160deg,#111118 0%,#0a0a0f 55%,#0d0d18 100%)",
                    border: "1.5px solid rgba(59,130,246,0.28)",
                    boxShadow: "0 0 24px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}>

                  {/* fan grille — top half (dot grid) */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 120 120">
                    {Array.from({ length: 8 }).map((_, row) =>
                      Array.from({ length: 8 }).map((_, col) => (
                        <circle key={`${row}-${col}`}
                          cx={10 + col * 14} cy={10 + row * 14}
                          r="2" fill="rgba(100,160,255,0.7)" />
                      ))
                    )}
                  </svg>

                  {/* dark panel overlay (lower half) */}
                  <div className="absolute bottom-0 left-0 right-0"
                    style={{ height: 48, background: "linear-gradient(to top,#0a0a12,transparent)" }} />

                  {/* blue edge LED — top */}
                  <div className="absolute top-0 left-4 right-4 h-px"
                    style={{ background: "linear-gradient(90deg,transparent,#3B82F6,transparent)", boxShadow: "0 0 6px #3B82F6" }} />
                  {/* blue edge LED — bottom */}
                  <div className="absolute bottom-0 left-4 right-4 h-px"
                    style={{ background: "linear-gradient(90deg,transparent,#6366f1,transparent)", boxShadow: "0 0 6px #6366f1" }} />
                  {/* blue edge LED — left */}
                  <div className="absolute left-0 top-4 bottom-4 w-px"
                    style={{ background: "linear-gradient(180deg,transparent,#3B82F6,transparent)" }} />
                  {/* blue edge LED — right */}
                  <div className="absolute right-0 top-4 bottom-4 w-px"
                    style={{ background: "linear-gradient(180deg,transparent,#3B82F6,transparent)" }} />

                  {/* corner screws */}
                  {[["top-2 left-2"],["top-2 right-2"],["bottom-2 left-2"],["bottom-2 right-2"]].map(([pos], i) => (
                    <div key={i} className={`absolute ${pos} w-3 h-3 rounded-full flex items-center justify-center`}
                      style={{ background: "#1a1a24", border: "1px solid rgba(59,130,246,0.5)", boxShadow: "0 0 4px rgba(59,130,246,0.3)" }}>
                      <div className="w-1 h-px bg-blue-400/60 rotate-45 absolute" />
                      <div className="w-1 h-px bg-blue-400/60 -rotate-45 absolute" />
                    </div>
                  ))}

                  {/* center AXN logo with purple glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative flex items-center justify-center"
                      style={{ width: 56, height: 56 }}>
                      {/* purple glow circle */}
                      <div className="absolute inset-0 rounded-full"
                        style={{ background: "radial-gradient(circle,rgba(139,92,246,0.45) 0%,transparent 70%)", filter: "blur(6px)" }} />
                      <img src="/axionet-logo-nobg.png"
                        className="relative w-14 h-14 object-contain"
                        style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.9)) drop-shadow(0 0 16px rgba(59,130,246,0.5))" }}
                        alt="AXN" />
                    </div>
                  </div>

                  {/* active mining pulse overlay */}
                  {isMining && (
                    <motion.div className="absolute inset-0 rounded-2xl"
                      style={{ background: "radial-gradient(circle at 50% 50%,rgba(59,130,246,0.08),transparent 60%)" }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                  )}
                </div>

                {/* blue base glow platform */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                  style={{ width: 80, height: 10, background: "rgba(59,130,246,0.55)", filter: "blur(10px)", borderRadius: "50%" }} />
              </div>
            </div>

            {/* RIGHT — status + waveform */}
            <div className="flex-1 flex flex-col justify-between py-3 pr-3 min-w-0">
              <div>
                {/* Status badge */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <motion.span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: dotColor, boxShadow: `0 0 5px ${dotColor}` }}
                    animate={isMining ? { opacity: [1, 0.3, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }} />
                  <span className="text-white/40 text-[10px] font-semibold">Mining Status</span>
                </div>
                {/* Status text */}
                <p className="text-white font-black text-[20px] leading-tight mb-1 truncate">{statusText}</p>
                <p className="text-white/35 text-[10px] leading-snug">{statusDesc}</p>

                {/* Health bar (compact, when stopped show repair btn) */}
                {machineStopped ? (
                  <button onClick={() => setRepairOpen(true)}
                    className="mt-2 flex items-center gap-1 rounded-lg px-2.5 py-1.5 active:scale-95 transition-transform"
                    style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <Wrench className="w-3 h-3 text-red-400" />
                    <span className="text-red-400 text-[10px] font-bold">Repair Now</span>
                  </button>
                ) : (
                  <motion.button
                    onClick={() => setRepairOpen(true)}
                    className="mt-2 flex items-center gap-[3px] active:opacity-70 transition-opacity"
                    animate={state.machineHealth <= 30 ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
                    transition={state.machineHealth <= 30 ? { duration: 0.65, repeat: Infinity, ease: "easeInOut" } : {}}
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const halfHearts = Math.round(state.machineHealth / 10);
                      const isFull = halfHearts >= (i + 1) * 2;
                      const isHalf = !isFull && halfHearts >= i * 2 + 1;
                      const isLow = state.machineHealth <= 30;
                      return (
                        <PixelHeart
                          key={i}
                          type={isFull ? "full" : isHalf ? "half" : "empty"}
                          isLow={isLow}
                        />
                      );
                    })}
                  </motion.button>
                )}
              </div>

              {/* Waveform */}
              <div className="mt-2">
                <MiniWaveform active={isMining} />
              </div>
            </div>
          </div>

          {/* Stats row — 3 columns */}
          <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${dim}` }}>
            {/* Mining Speed */}
            <div className="px-2.5 py-3 flex items-center gap-2.5" style={{ borderRight: `1px solid ${dim}` }}>
              <img src="/mining-speed-icon.png" alt="Mining Speed" className="flex-shrink-0"
                style={{ width: 38, height: 38, imageRendering: "pixelated", objectFit: "contain" }} />
              <div className="min-w-0">
                <span className="text-white/35 text-[9px] font-semibold uppercase block leading-none mb-1 truncate">Mining Speed</span>
                <span className="text-white font-black text-sm tabular-nums block leading-none">
                  {state.miningRate}<span className="text-white/30 text-[9px] font-normal"> AXN/s</span>
                </span>
              </div>
            </div>

            {/* CPU Status */}
            <div className="px-2.5 py-3 flex items-center gap-2.5" style={{ borderRight: `1px solid ${dim}` }}>
              <img src="/cpu-status-icon.png" alt="CPU Status" className="flex-shrink-0"
                style={{ width: 38, height: 38, imageRendering: "pixelated", objectFit: "contain" }} />
              <div className="min-w-0">
                <span className="text-white/35 text-[9px] font-semibold uppercase block leading-none mb-1 truncate">CPU Status</span>
                <span className="font-black text-sm tabular-nums block leading-none" style={{ color: isMining ? "#22c55e" : "rgba(255,255,255,0.35)" }}>
                  {isMining ? "Active" : state.cpuRunning ? formatTime(cpuCountdown) : "Idle"}
                </span>
              </div>
            </div>

            {/* Capacity */}
            <div className="px-2.5 py-3 flex items-center gap-2.5">
              <img src="/capacity-icon.png" alt="Capacity" className="flex-shrink-0"
                style={{ width: 38, height: 38, imageRendering: "pixelated", objectFit: "contain" }} />
              <div className="min-w-0 flex-1">
                <span className="text-white/35 text-[9px] font-semibold uppercase block leading-none mb-1 truncate">Capacity</span>
                <span className="text-white font-black text-xs tabular-nums block leading-none">
                  {localMined.toFixed(2)}<span className="text-white/30 text-[9px] font-normal">/{state.capacity}</span>
                </span>
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: capacityPct > 90 ? "#ef4444" : "linear-gradient(90deg,#3B82F6,#8B5CF6)" }}
                    animate={{ width: `${capacityPct}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. COLLECT CARD ── */}
        <div className="rounded-2xl py-1.5 px-3.5 flex items-center gap-3" style={card}>
          {/* Piggy bank icon */}
          <img src="/piggy-bank-icon.png" alt="Collectable AXN"
            className="flex-shrink-0"
            style={{ width: 76, height: 76, objectFit: "contain" }} />
          {/* Amount */}
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-[10px] font-semibold leading-none mb-0.5">Collectable AXN</p>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-black text-xl tabular-nums leading-tight">{localMined.toFixed(2)}</span>
              <span className="font-black text-sm leading-tight" style={{ color: "#3B82F6" }}>AXN</span>
            </div>
            <p className="text-white/25 text-[10px] leading-none mt-0.5">≈ ${minedUsd} USD</p>
          </div>
          {/* CLAIM button */}
          <button
            onClick={handleCollect}
            disabled={!canClaim || claimMutation.isPending}
            className="h-10 px-3.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all active:scale-95 disabled:opacity-40 flex-shrink-0 flex items-center justify-center gap-1.5"
            style={canClaim
              ? { background: "linear-gradient(135deg,#3B82F6,#2563EB)", color: "#fff", boxShadow: "0 4px 14px rgba(59,130,246,0.4)", minWidth: 80 }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)", minWidth: 80 }}>
            {claimMutation.isPending
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <>
                  <Gift className="w-3.5 h-3.5" />
                  <span>CLAIM</span>
                </>}
          </button>
        </div>

        {/* ── 4. ENERGY SECTION ── */}
        <div className="rounded-2xl px-3.5 py-3" style={card}>
          {/* Row 1: label + refill timer */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <BsLightningChargeFill style={{ color: "#F5C542", width: 14, height: 14 }} />
              <span className="text-white font-semibold text-sm">Energy</span>
            </div>
            {state.cpuRunning && cpuCountdown > 0 ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-white/30 text-[10px]">Refill in</span>
                <span className="text-white/50 text-[10px] tabular-nums font-bold">{formatTime(cpuCountdown)}</span>
              </div>
            ) : !state.hasEnergy && !state.cpuRunning ? (
              <button onClick={() => setEnergyOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg active:scale-95 transition-transform"
                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <BsLightningChargeFill style={{ color: "#60a5fa", width: 10, height: 10 }} />
                <span className="text-blue-400 text-[10px] font-bold">Refill</span>
              </button>
            ) : null}
          </div>
          {/* Row 2: percentage + progress bar */}
          <div className="flex items-center gap-2.5">
            <span className="font-black text-2xl tabular-nums w-14 flex-shrink-0 leading-none"
              style={{ color: energyPct > 50 ? "#60a5fa" : energyPct > 20 ? "#f59e0b" : "#ef4444" }}>
              {energyPct}%
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: energyPct > 50 ? "linear-gradient(90deg,#3B82F6,#8B5CF6)" : energyPct > 20 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "#ef4444" }}
                animate={{ width: `${energyPct}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
          {/* Antivirus status */}
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${dim}` }}>
            <FaBug style={{ color: state.antivirusActive ? "#4ade80" : "#f87171", width: 11, height: 11, flexShrink: 0 }} />
            {state.antivirusActive ? (
              <span className="text-green-400 text-[10px] font-medium">
                Antivirus active{avSecondsLeft > 0 && <span className="text-green-400/50 ml-1">({formatTime(avSecondsLeft)})</span>}
              </span>
            ) : (
              <button onClick={() => setAntivirusOpen(true)} className="text-red-400 text-[10px] font-medium active:opacity-70">
                No antivirus — tap to protect
              </button>
            )}
          </div>
        </div>

        {/* ── 5. UPGRADE MACHINE ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-black text-[11px] uppercase tracking-[0.14em]">Upgrade Machine</span>
            <button onClick={() => setUpgradeOpen(true)} className="flex items-center gap-0.5 active:opacity-70 transition-opacity">
              <span className="text-white/35 text-xs">View All</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/25" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Mining Speed */}
            <div className="rounded-2xl p-2.5 flex flex-col gap-1.5" style={card}>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/55 text-[9px] leading-none">Mining Speed</p>
                  <p className="text-purple-400 font-black text-[10px] leading-tight">Lv. {state.miningLevel}</p>
                </div>
              </div>
              <p className="text-white/30 text-[9px] tabular-nums leading-none">{state.miningRate} → {nextMiningRate} AXN/s</p>
              <div className="flex items-center justify-between">
                <button onClick={() => setUpgradeOpen(true)} disabled={state.isMaxLevel}
                  className="rounded-lg px-2 py-1 text-white/55 text-[9px] font-bold active:scale-95 transition-transform disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                  {state.isMaxLevel ? "Max" : "Upgrade"}
                </button>
                {!state.isMaxLevel && (
                  <div className="flex items-center gap-0.5">
                    <img src="/axn-logo.svg" className="w-2.5 h-2.5" alt="" />
                    <span className="text-white/40 text-[9px] font-bold">{state.upgMining}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CPU Time */}
            <div className="rounded-2xl p-2.5 flex flex-col gap-1.5" style={card}>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <RiCpuFill style={{ color: "#a78bfa", width: 16, height: 16 }} />
                </div>
                <div>
                  <p className="text-white/55 text-[9px] leading-none">CPU Time</p>
                  <p className="text-purple-400 font-black text-[10px] leading-tight">Lv. {state.cpuLevel}</p>
                </div>
              </div>
              <p className="text-white/30 text-[9px] tabular-nums leading-none">{formatTime(state.cpuDurationSec)} → {formatTime(nextCpuSec)}</p>
              <div className="flex items-center justify-between">
                <button onClick={() => setUpgradeOpen(true)} disabled={state.isMaxLevel}
                  className="rounded-lg px-2 py-1 text-white/55 text-[9px] font-bold active:scale-95 transition-transform disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                  {state.isMaxLevel ? "Max" : "Upgrade"}
                </button>
                {!state.isMaxLevel && (
                  <div className="flex items-center gap-0.5">
                    <img src="/axn-logo.svg" className="w-2.5 h-2.5" alt="" />
                    <span className="text-white/40 text-[9px] font-bold">{state.upgCpu}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Capacity */}
            <div className="rounded-2xl p-2.5 flex flex-col gap-1.5" style={card}>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.25)" }}>
                  <RiDatabase2Fill style={{ color: "#a78bfa", width: 16, height: 16 }} />
                </div>
                <div>
                  <p className="text-white/55 text-[9px] leading-none">Capacity</p>
                  <p className="text-purple-400 font-black text-[10px] leading-tight">Lv. {state.capacityLevel}</p>
                </div>
              </div>
              <p className="text-white/30 text-[9px] tabular-nums leading-none">{state.capacity} → {nextCapacity} AXN</p>
              <div className="flex items-center justify-between">
                <button onClick={() => setUpgradeOpen(true)} disabled={state.isMaxLevel}
                  className="rounded-lg px-2 py-1 text-white/55 text-[9px] font-bold active:scale-95 transition-transform disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
                  {state.isMaxLevel ? "Max" : "Upgrade"}
                </button>
                {!state.isMaxLevel && (
                  <div className="flex items-center gap-0.5">
                    <img src="/axn-logo.svg" className="w-2.5 h-2.5" alt="" />
                    <span className="text-white/40 text-[9px] font-bold">{state.upgCapacity}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>{/* end scroll content */}

      {/* ═══════════════════════════════════════════
          FIXED BOTTOM ACTION BAR — always visible
      ═══════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-30"
        style={{
          background: "linear-gradient(to top, #0B0B0D 70%, transparent)",
          paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
        }}>
        <div className="max-w-md mx-auto px-3 pt-2 pb-1 flex gap-2">

          {/* START MINING — wider, ~42% */}
          <button
            onClick={() => {
              if (!state.hasEnergy && !state.cpuRunning && state.machineHealth > 0) { setEnergyOpen(true); return; }
              handleStartMining();
            }}
            disabled={startCpuMutation.isPending || state.cpuRunning || state.machineHealth <= 0}
            className="h-[52px] rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 flex-[1.5]"
            style={!state.cpuRunning && state.machineHealth > 0
              ? { background: "linear-gradient(135deg,#3B82F6,#1d4ed8)", boxShadow: "0 4px 18px rgba(59,130,246,0.45)" }
              : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {startCpuMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : state.cpuRunning
              ? <RiCpuFill className="w-4 h-4 text-white/50" />
              : noEnergy
              ? <BsLightningChargeFill className="w-4 h-4 text-white" />
              : <RiPlayFill className="w-[18px] h-[18px] text-white" />}
            <span className="font-black text-[11px] uppercase tracking-widest text-white whitespace-nowrap">
              {state.cpuRunning ? "Running" : noEnergy ? "Recharge" : "Start Mining"}
            </span>
          </button>

          {/* ANTIVIRUS — flex-1 */}
          <button
            onClick={() => setAntivirusOpen(true)}
            className="h-[52px] rounded-2xl flex items-center justify-center gap-1.5 relative transition-all active:scale-[0.97] flex-1"
            style={state.antivirusActive
              ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)" }
              : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <FaBug className="w-[14px] h-[14px]" style={{ color: state.antivirusActive ? "#4ade80" : "rgba(255,255,255,0.45)" }} />
            <span className="font-black text-[11px] uppercase tracking-widest whitespace-nowrap"
              style={{ color: state.antivirusActive ? "#4ade80" : "rgba(255,255,255,0.7)" }}>
              {state.antivirusActive ? "Active" : "Antivirus"}
            </span>
            {!state.antivirusActive && (
              <span className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-black text-[9px] text-white"
                style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
                OFF
              </span>
            )}
          </button>

          {/* REPAIR — flex-1 */}
          <button
            onClick={() => setRepairOpen(true)}
            className="h-[52px] rounded-2xl flex items-center justify-center gap-1.5 relative transition-all active:scale-[0.97] flex-1"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <RiToolsFill className="w-[15px] h-[15px] text-white/55" />
            <span className="font-black text-[11px] uppercase tracking-widest text-white/70">Repair</span>
            {state.machineHealth < 100 && (
              <span className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-black text-[9px] text-white"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#6d28d9)" }}>
                {state.machineHealth}
              </span>
            )}
          </button>

        </div>
      </div>

      {/* ── Popups ── */}
      {repairOpen && <RepairPopup repairCost={state.repairCost} machineHealth={state.machineHealth} balance={state.balance} onClose={() => setRepairOpen(false)} />}
      {antivirusOpen && <AntivirusPopup antivirusCost={state.antivirusCost} antivirusActive={state.antivirusActive} balance={state.balance} miningLevel={state.miningLevel} onClose={() => setAntivirusOpen(false)} />}
      {upgradeOpen && <UpgradeMachinePopup onClose={() => setUpgradeOpen(false)} />}
      {energyOpen && <EnergyPopup energyCost={state.energyCost} balance={state.balance} onClose={() => setEnergyOpen(false)} />}
    </>
  );
}
