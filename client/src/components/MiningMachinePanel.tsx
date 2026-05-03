import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Shield, ShieldOff, Cpu, HardDrive, Activity,
  Wrench, Play, AlertTriangle, Loader2, ChevronRight, Settings
} from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import RepairPopup from "@/components/RepairPopup";
import AntivirusPopup, { AV_DURATION_MS } from "@/components/AntivirusPopup";
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

const AV_ACTIVE_KEY = "av_activated_at";
const AV_DURATION_SECONDS = AV_DURATION_MS / 1000;

function formatTime(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `[${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
}

function makelog(miningRate: number, mined: number): string {
  const r = Math.random();
  const ts = nowStamp();
  const temp = 55 + Math.floor(Math.random() * 15);
  const fan = 68 + Math.floor(Math.random() * 20);
  const pwr = 170 + Math.floor(Math.random() * 60);
  const mem = (39 + Math.random() * 3).toFixed(1);
  const hs = (miningRate * 3600 * 0.001 + Math.random() * 5).toFixed(2);
  const reward = (miningRate * (0.8 + Math.random() * 0.4)).toFixed(8);
  const shares = Math.floor(Math.random() * 20) + 1;
  const block = 850000 + Math.floor(Math.random() * 9999);
  if (r < 0.28) return `${ts} gpu[0,1]: ${temp}°C fan:${fan}% pwr:${pwr}W mem:${mem}GB`;
  if (r < 0.48) return `${ts} reward: +${reward} AXN pending`;
  if (r < 0.62) return `${ts} hashrate: ${hs} MH/s  shares:${shares}`;
  if (r < 0.72) return `${ts} REWARD_CALC: block=${block} | base=${mined.toFixed(4)} AXN`;
  if (r < 0.82) return `${ts} pool_fee: -${(miningRate * 0.005).toFixed(8)} AXN (0.5%)`;
  if (r < 0.90) return `${ts} your_share: ${(miningRate * 0.00001).toFixed(10)} AXN`;
  if (r < 0.95) return `${ts} payout_pending: +${mined.toFixed(8)} AXN`;
  return `${ts} stratum: accepted  diff=512K  ${hs}MH`;
}

function MiningTerminal({ isMining, miningRate, mined, machineStopped, noEnergy }: {
  isMining: boolean;
  miningRate: number;
  mined: number;
  machineStopped: boolean;
  noEnergy: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const logsRef = useRef<string[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth || 360;
    const H = canvas.offsetHeight || 130;
    canvas.width = W;
    canvas.height = H;
    const fontSize = 10;
    const cols = Math.floor(W / fontSize);
    const drops: number[] = Array.from({ length: cols }, () => Math.random() * -60);
    const chars = "01アイウエオカキクケコ$%#@&*!<>{}[]サシスセソタチツテト";
    let lastTs = 0;
    const INTERVAL = 50;
    const tick = (ts: number) => {
      if (ts - lastTs >= INTERVAL) {
        lastTs = ts;
        ctx.fillStyle = "rgba(4,4,4,0.22)";
        ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < drops.length; i++) {
          const ch = chars[Math.floor(Math.random() * chars.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;
          const rng = Math.random();
          ctx.fillStyle = machineStopped
            ? rng > 0.93 ? "#fff" : rng > 0.55 ? "#ef4444" : "#7f1d1d"
            : noEnergy
            ? rng > 0.93 ? "#fff" : rng > 0.55 ? "#F5C542" : "#78540a"
            : rng > 0.93 ? "#fff" : rng > 0.55 ? "#39ff14" : "#00960a";
          ctx.font = `${fontSize}px monospace`;
          ctx.fillText(ch, x, y);
          if (y > H && Math.random() > 0.975) drops[i] = 0;
          drops[i] += 0.5;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [machineStopped, noEnergy]);

  useEffect(() => {
    if (!isMining) return;
    const addLog = () => {
      const line = makelog(miningRate, mined);
      logsRef.current = [...logsRef.current.slice(-18), line];
      setLogs([...logsRef.current]);
    };
    addLog();
    const t = setInterval(addLog, 350 + Math.random() * 200);
    return () => clearInterval(t);
  }, [isMining, miningRate]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: 130 }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ display: "block" }} />
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.62)" }} />
      <div
        className="absolute inset-0 overflow-hidden px-2 py-1.5 flex flex-col justify-end"
        style={{ fontFamily: "monospace" }}
      >
        {machineStopped ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
              Machine stopped — repair required to resume mining
            </span>
          </div>
        ) : noEnergy ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Zap className="w-6 h-6 text-[#F5C542]" />
            <span style={{ color: "#F5C542", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
              Energy required — refill to continue mining
            </span>
          </div>
        ) : !isMining ? (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>— idle —</span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "9.5px", lineHeight: "1.45" }}>
              {logs.slice(-7).map((line, i) => {
                const isReward = line.includes("reward:");
                const isGpu = line.includes("gpu[");
                const isHash = line.includes("hashrate:");
                const color = isReward ? "#39ff14" : isGpu ? "#60a5fa" : isHash ? "#facc15" : "rgba(255,255,255,0.45)";
                return (
                  <div key={i} className="truncate" style={{ color }}>
                    {line}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "13px", lineHeight: "1.6", fontWeight: 900, color: "#39ff14", textShadow: "0 0 10px #39ff1488", marginTop: 2 }}>
              $ {mined.toFixed(4)} AXN ▋
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MiningMachinePanel() {
  const queryClient = useQueryClient();
  const [cpuCountdown, setCpuCountdown] = useState(0);
  const [repairOpen, setRepairOpen] = useState(false);
  const [antivirusOpen, setAntivirusOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);

  const { data: state } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    refetchInterval: 15000,
    retry: false,
  });

  useEffect(() => {
    if (!state) return;
    if (state.cpuRunning && state.cpuRemainingSeconds > 0) {
      setCpuCountdown(state.cpuRemainingSeconds);
    } else if (!state.cpuRunning) {
      setCpuCountdown(0);
    }
  }, [state?.cpuRemainingSeconds, state?.cpuRunning]);

  useEffect(() => {
    if (cpuCountdown <= 0) return;
    const t = setInterval(() => setCpuCountdown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [cpuCountdown > 0]);

  const [localMined, setLocalMined] = useState(0);
  useEffect(() => {
    if (state) setLocalMined(state.minedAxn);
  }, [state?.minedAxn]);

  useEffect(() => {
    if (!state?.cpuRunning || !state?.miningRate) return;
    if (state.machineHealth <= 0) return;
    const t = setInterval(() => {
      setLocalMined(prev => {
        if (prev >= state.capacity) return prev;
        return Math.min(prev + state.miningRate, state.capacity);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state?.cpuRunning, state?.miningRate, state?.capacity, state?.machineHealth]);

  const [avSecondsLeft, setAvSecondsLeft] = useState(0);
  const avIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAvCountdown = useCallback((activatedAt: number) => {
    if (avIntervalRef.current) clearInterval(avIntervalRef.current);
    const tick = () => {
      const elapsed = Math.floor((Date.now() - activatedAt) / 1000);
      const remaining = AV_DURATION_SECONDS - elapsed;
      if (remaining <= 0) {
        setAvSecondsLeft(0);
        if (avIntervalRef.current) clearInterval(avIntervalRef.current);
        antivirusDeactivateMutation.mutate();
      } else {
        setAvSecondsLeft(remaining);
      }
    };
    tick();
    avIntervalRef.current = setInterval(tick, 1000);
  }, []);

  const antivirusDeactivateMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/toggle-antivirus").then(r => r.json()),
    onSuccess: () => {
      localStorage.removeItem(AV_ACTIVE_KEY);
      if (avIntervalRef.current) clearInterval(avIntervalRef.current);
      setAvSecondsLeft(0);
      queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    },
    onError: () => {},
  });

  useEffect(() => {
    if (!state) return;
    if (state.antivirusActive) {
      const stored = localStorage.getItem(AV_ACTIVE_KEY);
      if (stored) {
        const activatedAt = parseInt(stored, 10);
        const elapsed = Math.floor((Date.now() - activatedAt) / 1000);
        if (elapsed < AV_DURATION_SECONDS) {
          startAvCountdown(activatedAt);
        } else {
          localStorage.removeItem(AV_ACTIVE_KEY);
          antivirusDeactivateMutation.mutate();
        }
      } else {
        const now = Date.now();
        localStorage.setItem(AV_ACTIVE_KEY, String(now));
        startAvCountdown(now);
      }
    } else {
      if (avIntervalRef.current) clearInterval(avIntervalRef.current);
      setAvSecondsLeft(0);
      localStorage.removeItem(AV_ACTIVE_KEY);
    }
  }, [state?.antivirusActive]);

  const invalidate = useCallback(() => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  }, [queryClient]);

  const startCpuMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/start-cpu").then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message, "success"); invalidate(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/claim").then(r => r.json()),
    onSuccess: (d) => {
      showNotification(`+${d.amount?.toFixed(2)} AXN collected!`, "success");
      setLocalMined(0);
      invalidate();
    },
    onError: (e: any) => showNotification(e.message || "Nothing to collect", "error"),
  });

  if (!state) {
    return (
      <div className="w-full space-y-3">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-1">AXN Mining Machine</p>
        <div className="bg-[#000000] border border-[#1c1c1e] rounded-2xl overflow-hidden animate-pulse">
          <div className="h-[130px] bg-white/[0.02]" />
          <div className="px-4 py-4 space-y-3">
            <div className="h-2 bg-white/[0.04] rounded-full" />
            <div className="grid grid-cols-3 gap-2">
              {[0,1,2].map(i => <div key={i} className="h-14 bg-white/[0.04] rounded-xl" />)}
            </div>
            <div className="h-12 bg-white/[0.04] rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-11 bg-white/[0.04] rounded-xl" />
              <div className="h-11 bg-white/[0.04] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const capacityPct = Math.min(100, (localMined / state.capacity) * 100);
  const healthColor = state.machineHealth > 60 ? "#22c55e" : state.machineHealth > 30 ? "#f59e0b" : "#ef4444";
  const canClaim = localMined >= 0.01;
  const machineStopped = state.machineHealth <= 0;
  const noEnergy = !state.hasEnergy && !state.cpuRunning;

  const energyPct = state.cpuRunning
    ? Math.max(0, Math.round((cpuCountdown / state.cpuDurationSec) * 100))
    : state.hasEnergy ? 100 : 0;

  const isMining = state.cpuRunning && state.machineHealth > 0;

  return (
    <div className="w-full space-y-3">
      <p className="text-center text-[10px] font-black uppercase tracking-[0.15em] text-white/30 mb-1">AXN Mining Machine</p>

      <div className="bg-[#000000] border border-[#1c1c1e] rounded-2xl overflow-hidden">

        {/* Antivirus Status Bar — only protects balance */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[#1c1c1e]">
          {state.antivirusActive ? (
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 text-[11px] font-black uppercase tracking-wider">
                Antivirus active — balance protected
              </span>
              {avSecondsLeft > 0 && (
                <span className="text-green-400/50 text-[10px] tabular-nums">({formatTime(avSecondsLeft)})</span>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAntivirusOpen(true)}
              className="flex items-center gap-2 active:scale-95 transition-transform"
            >
              <ShieldOff className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="text-red-400 text-[11px] font-black uppercase tracking-wider">
                No antivirus — balance at risk
              </span>
            </button>
          )}
        </div>

        {/* Level Labels Row */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-b border-[#1c1c1e]">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-[#F5C542]/60" />
            <span className="text-[#F5C542]/70 text-[10px] font-bold uppercase tracking-wide">Mining</span>
            <span className="text-[#F5C542] text-[10px] font-black tabular-nums">Lv.{state.miningLevel}</span>
          </div>
          <span className="text-white/10 text-xs">|</span>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-blue-400/60" />
            <span className="text-blue-400/70 text-[10px] font-bold uppercase tracking-wide">Capacity</span>
            <span className="text-blue-400 text-[10px] font-black tabular-nums">Lv.{state.capacityLevel}</span>
          </div>
          <span className="text-white/10 text-xs">|</span>
          <div className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-purple-400/60" />
            <span className="text-purple-400/70 text-[10px] font-bold uppercase tracking-wide">CPU</span>
            <span className="text-purple-400 text-[10px] font-black tabular-nums">Lv.{state.cpuLevel}</span>
          </div>
        </div>

        {/* Matrix Terminal */}
        <div className="px-3 pt-3 pb-2">
          <MiningTerminal
            isMining={isMining}
            miningRate={state.miningRate}
            mined={localMined}
            machineStopped={machineStopped}
            noEnergy={noEnergy && !machineStopped}
          />
        </div>

        <div className="border-t border-[#1c1c1e] mx-4" />

        <div className="px-4 py-4">

          {/* Capacity Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-[#F5C542]" />
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Capacity</span>
              </div>
              <span className="text-white/60 text-[10px] font-black tabular-nums">
                {localMined.toFixed(2)} / {state.capacity} AXN
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: capacityPct > 90 ? '#ef4444' : 'linear-gradient(90deg,#F5C542,#d4920a)' }}
                animate={{ width: `${capacityPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#1c1c1e] rounded-xl p-2.5 text-center">
              <Activity className="w-3.5 h-3.5 text-[#F5C542] mx-auto mb-1" />
              <p className="text-white text-xs font-black tabular-nums">{state.miningRate}/s</p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">Rate</p>
            </div>
            <div className="bg-[#1c1c1e] rounded-xl p-2.5 text-center">
              <Cpu className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
              <p className={`text-xs font-black tabular-nums ${state.cpuRunning ? 'text-blue-300' : 'text-white/40'}`}>
                {state.cpuRunning ? formatTime(cpuCountdown) : 'Idle'}
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">CPU</p>
            </div>
            {/* Health — always decreases naturally, unrelated to antivirus */}
            <button
              onClick={() => setRepairOpen(true)}
              className="bg-[#1c1c1e] rounded-xl p-2.5 text-center active:scale-95 transition-transform"
            >
              <Wrench className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: healthColor }} />
              <p className="text-xs font-black tabular-nums" style={{ color: healthColor }}>
                {state.machineHealth}%
              </p>
              <p className="text-white/30 text-[9px] uppercase tracking-wide mt-0.5">Health</p>
              <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${state.machineHealth}%`, background: healthColor }}
                />
              </div>
            </button>
          </div>

          {/* Energy Bar */}
          <div
            className="flex items-center gap-3 bg-[#1c1c1e] rounded-xl px-3 py-2.5 mb-4 cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => { if (!state.cpuRunning && !state.hasEnergy) setEnergyOpen(true); }}
          >
            <div className="flex items-center gap-1.5 flex-1">
              <Zap
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: energyPct > 60 ? '#F5C542' : energyPct > 20 ? '#f59e0b' : energyPct > 0 ? '#ef4444' : 'rgba(255,255,255,0.15)' }}
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Energy</span>
                  <span
                    className="text-[10px] font-black tabular-nums"
                    style={{ color: energyPct > 60 ? '#F5C542' : energyPct > 20 ? '#f59e0b' : energyPct > 0 ? '#ef4444' : '#f87171' }}
                  >
                    {energyPct}%
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${energyPct}%` }}
                    transition={{ duration: 0.8, ease: "linear" }}
                    style={{
                      background: energyPct > 60
                        ? 'linear-gradient(90deg,#F5C542,#d4920a)'
                        : energyPct > 20
                        ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                        : energyPct > 0
                        ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                        : 'rgba(239,68,68,0.3)',
                    }}
                  />
                </div>
                <p className="text-white/25 text-[9px] mt-1">
                  {state.cpuRunning
                    ? `⚡ Mining — ${energyPct}% remaining`
                    : energyPct === 100
                    ? '⚡ Full — Ready to mine'
                    : '🪫 Empty — Tap to refill'}
                </p>
              </div>
            </div>
            {!state.cpuRunning && !state.hasEnergy && (
              <button
                onClick={(e) => { e.stopPropagation(); setEnergyOpen(true); }}
                className="flex-shrink-0 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider text-black active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#F5C542,#d4920a)' }}
              >
                Refill
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (!state.hasEnergy && !state.cpuRunning && state.machineHealth > 0) {
                    setEnergyOpen(true);
                    return;
                  }
                  startCpuMutation.mutate();
                }}
                disabled={
                  startCpuMutation.isPending ||
                  state.cpuRunning ||
                  state.machineHealth <= 0
                }
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  !state.cpuRunning && state.machineHealth > 0
                    ? state.hasEnergy
                      ? { background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#fff', boxShadow: '0 0 14px rgba(59,130,246,0.3)' }
                      : { background: 'linear-gradient(135deg,#F5C542,#d4920a)', color: '#000' }
                    : { background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.25)' }
                }
              >
                {startCpuMutation.isPending ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : state.cpuRunning ? (
                  <><Cpu className="w-3.5 h-3.5" /> Running</>
                ) : !state.hasEnergy && state.machineHealth > 0 ? (
                  <><Zap className="w-3.5 h-3.5" /> Refill Energy</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> Start Mining</>
                )}
              </button>

              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || !canClaim}
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                style={canClaim ? {
                  background: 'linear-gradient(135deg,#F5C542,#d4920a)',
                  color: '#000',
                  boxShadow: '0 0 14px rgba(245,197,66,0.3)',
                } : {
                  background: '#1c1c1e',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.25)',
                }}
              >
                {claimMutation.isPending ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : '⬇ Collect AXN'}
              </button>
            </div>

            {/* Secondary: Repair / Antivirus / Upgrade — original card list style */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#141414' }}>
              <button
                onClick={() => setRepairOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-white/50" />
                  <span className="text-white text-sm font-semibold">Repair</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-xs tabular-nums">{state.repairCost} AXN</span>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </button>
              <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <button
                onClick={() => setAntivirusOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5" style={{ color: state.antivirusActive ? '#22c55e' : '#ef4444' }} />
                  <span className="text-white text-sm font-semibold">Antivirus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: state.antivirusActive ? '#22c55e' : '#ef4444' }}>
                    {state.antivirusActive ? 'Active' : 'Off'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </button>
              <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <button
                onClick={() => setUpgradeOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 active:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5" style={{ color: '#F5C542' }} />
                  <span className="text-white text-sm font-semibold">Upgrade Machine</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {repairOpen && (
        <RepairPopup
          repairCost={state.repairCost}
          machineHealth={state.machineHealth}
          balance={state.balance}
          onClose={() => setRepairOpen(false)}
        />
      )}
      {antivirusOpen && (
        <AntivirusPopup
          antivirusCost={state.antivirusCost}
          antivirusActive={state.antivirusActive}
          balance={state.balance}
          onClose={() => setAntivirusOpen(false)}
        />
      )}
      {upgradeOpen && (
        <UpgradeMachinePopup onClose={() => setUpgradeOpen(false)} />
      )}
      {energyOpen && (
        <EnergyPopup
          energyCost={state.energyCost}
          balance={state.balance}
          onClose={() => setEnergyOpen(false)}
        />
      )}
    </div>
  );
}
