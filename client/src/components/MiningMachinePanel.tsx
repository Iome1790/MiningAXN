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

import miningSpeedImg from "@assets/mining-speed-nobg.png";
import cpuImg from "@assets/cpu-nobg.png";
import capacityImg from "@assets/capacity-nobg.png";
import batteryStripImg from "@assets/battery-strip-nobg.png";
import fanImg from "@assets/3a9ecce86c8b75945dc0097fe1ab901a_1778131665054.png";

/* ── Pixel Battery Sprite ──
   The strip has 7 batteries left→right:
   0: full green | 1: yellow | 2: orange | 3: red-orange
   4: gray/critical (!) | 5: green lightning | 6: green +/-
*/
function PixelBattery({ energyPct, isCharging }: { energyPct: number; isCharging: boolean }) {
  let idx: number;
  if (isCharging && energyPct === 0) idx = 5;
  else if (energyPct >= 80) idx = 0;
  else if (energyPct >= 55) idx = 1;
  else if (energyPct >= 35) idx = 2;
  else if (energyPct >= 15) idx = 3;
  else if (energyPct > 0)   idx = 4;
  else                       idx = 4;

  const posX = `${(idx / 6) * 100}%`;

  return (
    <motion.div
      key={idx}
      initial={{ scale: 0.85, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: 56,
        height: 56,
        backgroundImage: `url(${batteryStripImg})`,
        backgroundSize: "700% 100%",
        backgroundPositionX: posX,
        backgroundPositionY: "center",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    />
  );
}

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

/* ── Spinning CPU Cooler Fan ── */
function CoolerFan({ active, health }: { active: boolean; health: number }) {
  const glowColor = active ? "rgba(59,130,246,0.6)" : "rgba(100,100,120,0.3)";
  const fanColor = active ? "#3B82F6" : "#4a4a5a";
  const bladeColor = active ? "#60a5fa" : "#5a5a6a";
  const hubColor = active ? "#1d4ed8" : "#2a2a3a";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      {/* outer glow ring */}
      <div className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, filter: "blur(8px)" }} />

      {/* fan housing ring */}
      <div className="absolute inset-0 rounded-full"
        style={{
          border: `2px solid ${active ? "rgba(59,130,246,0.5)" : "rgba(80,80,100,0.4)"}`,
          background: "radial-gradient(circle, #0d0d18 60%, #111128 100%)",
          boxShadow: active ? "0 0 18px rgba(59,130,246,0.35), inset 0 0 12px rgba(0,0,0,0.8)" : "inset 0 0 12px rgba(0,0,0,0.8)",
        }} />

      {/* spinning fan blades */}
      <motion.svg
        viewBox="0 0 100 100"
        style={{ width: 90, height: 90, position: "absolute" }}
        animate={active ? { rotate: 360 } : { rotate: 0 }}
        transition={active
          ? { duration: 0.7, repeat: Infinity, ease: "linear" }
          : { duration: 1.5, ease: "easeOut" }
        }
      >
        {/* 4 blades */}
        {[0, 90, 180, 270].map((angle, i) => (
          <g key={i} transform={`rotate(${angle} 50 50)`}>
            <ellipse cx="50" cy="27" rx="14" ry="22"
              fill={bladeColor} opacity="0.85"
              style={{ filter: active ? `drop-shadow(0 0 4px ${fanColor})` : "none" }} />
            <ellipse cx="50" cy="27" rx="8" ry="14"
              fill={fanColor} opacity="0.5" />
          </g>
        ))}
        {/* center hub */}
        <circle cx="50" cy="50" r="12" fill={hubColor}
          stroke={active ? "#3B82F6" : "#3a3a4a"} strokeWidth="2"
          style={{ filter: active ? "drop-shadow(0 0 5px #3B82F6)" : "none" }} />
        <circle cx="50" cy="50" r="5" fill={active ? "#60a5fa" : "#4a4a5a"} />
        {/* hub cross */}
        <line x1="50" y1="42" x2="50" y2="58" stroke={active ? "#93c5fd" : "#6a6a7a"} strokeWidth="1.5" />
        <line x1="42" y1="50" x2="58" y2="50" stroke={active ? "#93c5fd" : "#6a6a7a"} strokeWidth="1.5" />
      </motion.svg>

      {/* health-based red warning flash */}
      {health <= 30 && health > 0 && (
        <motion.div className="absolute inset-0 rounded-full"
          style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)" }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }} />
      )}

      {/* active mining pulse */}
      {active && (
        <motion.div className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
      )}

      {/* base glow platform */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2"
        style={{ width: 70, height: 8, background: active ? "rgba(59,130,246,0.5)" : "rgba(60,60,80,0.3)", filter: "blur(8px)", borderRadius: "50%" }} />
    </div>
  );
}

/* ── Terminal logs panel ── */
const LOG_LINES = [
  { prefix: "[SYS]", text: "Axionet miner v2.4.1 online", color: "#22c55e" },
  { prefix: "[CPU]", text: "Cores allocated: 4 / 8", color: "#60a5fa" },
  { prefix: "[NET]", text: "Node connected: axn.pool:3333", color: "#60a5fa" },
  { prefix: "[MNR]", text: "Mining algorithm: AXN-PoW", color: "#a78bfa" },
  { prefix: "[MNR]", text: "Share submitted: accepted ✓", color: "#22c55e" },
  { prefix: "[MNR]", text: "Hashrate: 48.3 MH/s", color: "#f59e0b" },
  { prefix: "[CPU]", text: "Temp: 67°C  Fan: 2800 RPM", color: "#60a5fa" },
  { prefix: "[MNR]", text: "Block #4821938 found!", color: "#22c55e" },
  { prefix: "[NET]", text: "Ping: 12ms  Difficulty: 4.2K", color: "#60a5fa" },
  { prefix: "[MNR]", text: "Hashrate: 51.7 MH/s", color: "#f59e0b" },
  { prefix: "[SYS]", text: "Memory OK — 512 MB used", color: "#a78bfa" },
  { prefix: "[MNR]", text: "Share submitted: accepted ✓", color: "#22c55e" },
];

const IDLE_LINES = [
  { prefix: "[SYS]", text: "Miner standby mode", color: "#6b7280" },
  { prefix: "[CPU]", text: "Waiting for energy...", color: "#6b7280" },
  { prefix: "[NET]", text: "Pool connected, idle", color: "#6b7280" },
];

const STOPPED_LINES = [
  { prefix: "[ERR]", text: "Machine health critical!", color: "#ef4444" },
  { prefix: "[SYS]", text: "Mining halted — repair needed", color: "#ef4444" },
  { prefix: "[CPU]", text: "Fan stopped. Overheating risk.", color: "#f59e0b" },
];

function TerminalLog({ isMining, stopped }: { isMining: boolean; stopped: boolean }) {
  const [visibleLines, setVisibleLines] = useState<typeof LOG_LINES>([]);
  const [lineIdx, setLineIdx] = useState(0);

  const pool = stopped ? STOPPED_LINES : isMining ? LOG_LINES : IDLE_LINES;

  useEffect(() => {
    setVisibleLines([pool[0]]);
    setLineIdx(1);
  }, [isMining, stopped]);

  useEffect(() => {
    if (!isMining && !stopped) return;
    const t = setInterval(() => {
      setVisibleLines(prev => [...prev, pool[lineIdx % pool.length]].slice(-4));
      setLineIdx(i => i + 1);
    }, isMining ? 1400 : 3000);
    return () => clearInterval(t);
  }, [isMining, stopped, lineIdx]);

  return (
    <div style={{ fontFamily: "'Courier New', monospace" }}>
      {visibleLines.map((line, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: i === visibleLines.length - 1 ? 1 : 0.38, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex", gap: 4, lineHeight: "12px", marginBottom: 1 }}>
          <span style={{ color: line.color, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{line.prefix}</span>
          <span style={{ color: "rgba(200,200,210,0.7)", fontSize: 9 }}>{line.text}</span>
        </motion.div>
      ))}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        style={{ color: "#22c55e", fontSize: 9 }}>▋</motion.span>
    </div>
  );
}

/* ── Pixel HP Bar (heart + HP label + bar) ── */
function PixelHPBar({ health, onClick }: { health: number; onClick: () => void }) {
  const isLow = health <= 30;
  const isDead = health <= 0;
  const heartColor = isDead ? "#555" : isLow ? "#cc0000" : "#dd2222";
  const heartHi = isDead ? "#777" : "#ff6666";
  const barFill = isDead ? "#333" : isLow ? "#cc0000" : "#cc1111";
  const pct = Math.max(0, Math.min(100, health));

  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 active:opacity-70"
      animate={isLow && !isDead ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
      transition={isLow && !isDead ? { duration: 0.7, repeat: Infinity } : {}}
    >
      {/* Pixel heart SVG */}
      <svg width="22" height="20" viewBox="0 0 11 10" style={{ imageRendering: "pixelated", flexShrink: 0 }}>
        {/* heart shape */}
        <rect x="1" y="0" width="3" height="1" fill={heartColor}/>
        <rect x="6" y="0" width="3" height="1" fill={heartColor}/>
        <rect x="0" y="1" width="11" height="4" fill={heartColor}/>
        <rect x="1" y="5" width="9" height="1" fill={heartColor}/>
        <rect x="2" y="6" width="7" height="1" fill={heartColor}/>
        <rect x="3" y="7" width="5" height="1" fill={heartColor}/>
        <rect x="4" y="8" width="3" height="1" fill={heartColor}/>
        <rect x="5" y="9" width="1" height="1" fill={heartColor}/>
        {/* highlight */}
        <rect x="1" y="0" width="2" height="1" fill={heartHi} opacity="0.7"/>
        <rect x="0" y="1" width="2" height="2" fill={heartHi} opacity="0.5"/>
      </svg>

      {/* HP bar */}
      <div className="flex flex-col gap-0.5">
        {/* HP label */}
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9, fontWeight: 900, color: "#22c55e",
          letterSpacing: 1, lineHeight: 1,
          textShadow: "0 0 4px #22c55e",
          imageRendering: "pixelated",
        }}>HP</span>
        {/* bar track */}
        <div style={{
          width: 90, height: 10,
          background: "#1a1a1a",
          border: "1.5px solid #333",
          imageRendering: "pixelated",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* filled portion — chunky pixel segments */}
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "absolute", top: 0, left: 0,
              height: "100%",
              background: barFill,
              boxShadow: `inset 0 2px 0 rgba(255,100,100,0.4), inset 0 -2px 0 rgba(0,0,0,0.4)`,
            }}
          />
          {/* pixel grid lines */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${(i + 1) * 10}%`, width: 1,
              background: "rgba(0,0,0,0.35)",
            }} />
          ))}
          {/* empty portion shimmer */}
          <div style={{
            position: "absolute", top: 0, right: 0,
            height: "100%", width: `${100 - pct}%`,
            background: "rgba(80,80,80,0.25)",
          }} />
        </div>
        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", lineHeight: 1 }}>
          {health}/100
        </span>
      </div>
    </motion.button>
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
  const canClaim = localMined >= 0.01;
  const machineStopped = state.machineHealth <= 0;
  const noEnergy = !state.hasEnergy && !state.cpuRunning;
  const isMining = state.cpuRunning && state.machineHealth > 0;

  const energyPct = state.cpuRunning
    ? Math.max(0, Math.round((cpuCountdown / state.cpuDurationSec) * 100))
    : state.hasEnergy ? 100 : 0;

  const minedUsd = (localMined * 0.00014).toFixed(4);

  const dotColor = machineStopped ? "#ef4444" : isMining ? "#22c55e" : "#f59e0b";

  const nextMiningRate = (state.miningRate * 1.5).toFixed(4);
  const nextCapacity = (state.capacity * 2).toFixed(0);
  const nextCpuSec = Math.round(state.cpuDurationSec * 1.5);

  const card = { background: "rgba(12,12,16,0.97)", border: "1px solid rgba(255,255,255,0.08)" } as React.CSSProperties;
  const dim = "rgba(255,255,255,0.06)";

  return (
    <>
      <div className="w-full px-3 space-y-2 pb-24">

        {/* ── 1. MINING MACHINE CARD ── */}
        <div className="rounded-2xl overflow-hidden" style={card}>

          {/* Top: Left machine illustration | Right: health + terminal */}
          <div className="flex">

            {/* LEFT — mining machine box (original) */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center p-3 pb-4"
              style={{ width: 152 }}>
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

                  {/* fan grille dot grid */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 120 120">
                    {Array.from({ length: 8 }).map((_, row) =>
                      Array.from({ length: 8 }).map((_, col) => (
                        <circle key={`${row}-${col}`}
                          cx={10 + col * 14} cy={10 + row * 14}
                          r="2" fill="rgba(100,160,255,0.7)" />
                      ))
                    )}
                  </svg>

                  {/* dark panel overlay lower half */}
                  <div className="absolute bottom-0 left-0 right-0"
                    style={{ height: 48, background: "linear-gradient(to top,#0a0a12,transparent)" }} />

                  {/* edge LEDs */}
                  <div className="absolute top-0 left-4 right-4 h-px"
                    style={{ background: "linear-gradient(90deg,transparent,#3B82F6,transparent)", boxShadow: "0 0 6px #3B82F6" }} />
                  <div className="absolute bottom-0 left-4 right-4 h-px"
                    style={{ background: "linear-gradient(90deg,transparent,#6366f1,transparent)", boxShadow: "0 0 6px #6366f1" }} />
                  <div className="absolute left-0 top-4 bottom-4 w-px"
                    style={{ background: "linear-gradient(180deg,transparent,#3B82F6,transparent)" }} />
                  <div className="absolute right-0 top-4 bottom-4 w-px"
                    style={{ background: "linear-gradient(180deg,transparent,#3B82F6,transparent)" }} />

                  {/* corner screws */}
                  {(["top-2 left-2","top-2 right-2","bottom-2 left-2","bottom-2 right-2"] as const).map((pos, i) => (
                    <div key={i} className={`absolute ${pos} w-3 h-3 rounded-full flex items-center justify-center`}
                      style={{ background: "#1a1a24", border: "1px solid rgba(59,130,246,0.5)", boxShadow: "0 0 4px rgba(59,130,246,0.3)" }}>
                      <div className="w-1 h-px bg-blue-400/60 rotate-45 absolute" />
                      <div className="w-1 h-px bg-blue-400/60 -rotate-45 absolute" />
                    </div>
                  ))}

                  {/* center — AXN logo with purple glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative flex items-center justify-center" style={{ width: 56, height: 56 }}>
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

                {/* blue base glow */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                  style={{ width: 80, height: 10, background: "rgba(59,130,246,0.55)", filter: "blur(10px)", borderRadius: "50%" }} />
              </div>
            </div>

            {/* RIGHT — HP bar + terminal logs */}
            <div className="flex-1 flex flex-col justify-center gap-2 py-2.5 pr-3 min-w-0">

              {/* Pixel HP bar */}
              <PixelHPBar health={state.machineHealth} onClick={() => setRepairOpen(true)} />

              {/* Repair button if stopped */}
              {machineStopped && (
                <button onClick={() => setRepairOpen(true)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 active:scale-95 transition-transform w-fit"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <Wrench className="w-3 h-3 text-red-400" />
                  <span className="text-red-400 text-[9px] font-bold">Repair Now</span>
                </button>
              )}

              {/* Terminal log — no box */}
              <TerminalLog isMining={isMining} stopped={machineStopped} />
            </div>
          </div>

          {/* Stats row — 3 columns */}
          <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${dim}` }}>

            {/* Mining Speed */}
            <div className="px-2 py-2 flex items-center gap-1.5" style={{ borderRight: `1px solid ${dim}` }}>
              <img src={miningSpeedImg} alt="Speed" className="flex-shrink-0"
                style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }} />
              <div className="min-w-0">
                <span className="text-white/35 text-[8px] font-semibold uppercase block leading-none mb-0.5">Speed</span>
                <span className="text-white font-black text-[11px] tabular-nums block leading-none">
                  {state.miningRate}<span className="text-white/30 text-[8px] font-normal">/s</span>
                </span>
              </div>
            </div>

            {/* CPU */}
            <div className="px-2 py-2 flex items-center gap-1.5" style={{ borderRight: `1px solid ${dim}` }}>
              <img src={cpuImg} alt="CPU" className="flex-shrink-0"
                style={{ width: 32, height: 32, objectFit: "contain" }} />
              <div className="min-w-0">
                <span className="text-white/35 text-[8px] font-semibold uppercase block leading-none mb-0.5">CPU</span>
                <span className="font-black text-[11px] tabular-nums block leading-none"
                  style={{ color: isMining ? "#22c55e" : "rgba(255,255,255,0.35)" }}>
                  {isMining ? "Active" : state.cpuRunning ? formatTime(cpuCountdown) : "Idle"}
                </span>
              </div>
            </div>

            {/* Capacity */}
            <div className="px-2 py-2 flex items-center gap-1.5">
              <img src={capacityImg} alt="Cap" className="flex-shrink-0"
                style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain" }} />
              <div className="min-w-0 flex-1">
                <span className="text-white/35 text-[8px] font-semibold uppercase block leading-none mb-0.5">Cap</span>
                <span className="text-white font-black text-[10px] tabular-nums block leading-none">
                  {localMined.toFixed(1)}<span className="text-white/30 text-[8px] font-normal">/{state.capacity}</span>
                </span>
                <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
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
          <div className="relative flex-shrink-0" style={{ width: 76, height: 76 }}>
            <motion.img
              src="/piggy-bank-icon.png" alt="Collectable AXN"
              style={{ width: 76, height: 76, objectFit: "contain" }}
              animate={isMining ? { y: [0, -5, 0, -3, 0] } : { y: 0 }}
              transition={isMining ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            />
            {isMining && [0, 1, 2, 3].map((i) => (
              <motion.div key={i}
                style={{
                  position: "absolute", top: 4,
                  left: 28 + (i % 2 === 0 ? -6 : 6),
                  width: 8, height: 8, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #ffe066, #f59e0b, #b45309)",
                  boxShadow: "0 0 4px rgba(245,158,11,0.8)", pointerEvents: "none",
                }}
                animate={{ y: [0, -38, -50], opacity: [0, 1, 0], scale: [0.6, 1, 0.7] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: "easeOut" }}
              />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-[10px] font-semibold leading-none mb-0.5">Collectable AXN</p>
            <div className="flex items-baseline gap-1">
              <span className="text-white font-black text-xl tabular-nums leading-tight">{localMined.toFixed(2)}</span>
              <span className="font-black text-sm leading-tight" style={{ color: "#3B82F6" }}>AXN</span>
            </div>
            <p className="text-white/25 text-[10px] leading-none mt-0.5">≈ ${minedUsd} USD</p>
          </div>
          <button
            onClick={handleCollect}
            disabled={!canClaim || claimMutation.isPending}
            className="h-10 px-3.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all active:scale-95 disabled:opacity-40 flex-shrink-0 flex items-center justify-center gap-1.5"
            style={canClaim
              ? { background: "linear-gradient(135deg,#3B82F6,#2563EB)", color: "#fff", boxShadow: "0 4px 14px rgba(59,130,246,0.4)", minWidth: 80 }
              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)", minWidth: 80 }}>
            {claimMutation.isPending
              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <><Gift className="w-3.5 h-3.5" /><span>CLAIM</span></>}
          </button>
        </div>

        {/* ── 4. ENERGY SECTION ── */}
        <div className="rounded-2xl px-3.5 py-3" style={card}>
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
          <div className="flex items-center gap-3">
            {/* Pixel battery sprite */}
            <PixelBattery energyPct={energyPct} isCharging={state.cpuRunning} />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-baseline gap-1">
                <span className="font-black text-2xl tabular-nums leading-none"
                  style={{ color: energyPct > 50 ? "#60a5fa" : energyPct > 20 ? "#f59e0b" : "#ef4444" }}>
                  {energyPct}%
                </span>
                <span className="text-white/30 text-[10px]">energy</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: energyPct > 50 ? "linear-gradient(90deg,#3B82F6,#8B5CF6)" : energyPct > 20 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "#ef4444" }}
                  animate={{ width: `${energyPct}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          </div>
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

      </div>

      {/* ── FIXED BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30"
        style={{
          background: "linear-gradient(to top, #0B0B0D 70%, transparent)",
          paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
        }}>
        <div className="max-w-md mx-auto px-3 pt-2 pb-1 flex gap-2">

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
              : state.cpuRunning ? <RiCpuFill className="w-4 h-4 text-white/50" />
              : noEnergy ? <BsLightningChargeFill className="w-4 h-4 text-white" />
              : <RiPlayFill className="w-[18px] h-[18px] text-white" />}
            <span className="font-black text-[11px] uppercase tracking-widest text-white whitespace-nowrap">
              {state.cpuRunning ? "Running" : noEnergy ? "Recharge" : "Start Mining"}
            </span>
          </button>

          <button onClick={() => setAntivirusOpen(true)}
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
                style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>OFF</span>
            )}
          </button>

          <button onClick={() => setRepairOpen(true)}
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

      {repairOpen && <RepairPopup repairCost={state.repairCost} machineHealth={state.machineHealth} balance={state.balance} onClose={() => setRepairOpen(false)} />}
      {antivirusOpen && <AntivirusPopup antivirusCost={state.antivirusCost} antivirusActive={state.antivirusActive} balance={state.balance} miningLevel={state.miningLevel} onClose={() => setAntivirusOpen(false)} />}
      {upgradeOpen && <UpgradeMachinePopup onClose={() => setUpgradeOpen(false)} />}
      {energyOpen && <EnergyPopup energyCost={state.energyCost} balance={state.balance} onClose={() => setEnergyOpen(false)} />}
    </>
  );
}
