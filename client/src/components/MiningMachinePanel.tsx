import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronRight, Wrench, Gift, ShieldCheck, ShieldOff, Wallet } from "lucide-react";
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

const fanImg = "/fan-image.png";

/* ── Pixel Battery ──
   Vertical pixel-art battery (AA style) with 5 stacked segments,
   terminal cap on top, glow + charge bolt animation.
   Green (full) → Orange (mid) → Red (low) → Dark (empty)
*/
function PixelBattery({ energyPct, isCharging }: { energyPct: number; isCharging: boolean }) {
  const [blink, setBlink] = useState(false);

  const isEmpty = energyPct <= 0;
  const isLow   = energyPct > 0 && energyPct <= 25;
  const isMid   = energyPct > 25 && energyPct <= 60;

  const fillColor = isEmpty ? "#252525" : isLow ? "#ef4444" : isMid ? "#f97316" : "#22c55e";
  const glowColor = isEmpty ? "transparent" : isLow ? "rgba(239,68,68,0.5)" : isMid ? "rgba(249,115,22,0.5)" : "rgba(34,197,94,0.5)";
  const shellColor = isEmpty ? "#2a2a2a" : isLow ? "#450a0a" : isMid ? "#431407" : "#052e16";
  const rimColor   = isEmpty ? "#3a3a3a" : isLow ? "#991b1b" : isMid ? "#9a3412" : "#166534";

  const filledSegs = isEmpty ? 0 : Math.max(1, Math.ceil((energyPct / 100) * 5));

  // blink when low
  useEffect(() => {
    if (!isLow) { setBlink(false); return; }
    const t = setInterval(() => setBlink(p => !p), 500);
    return () => clearInterval(t);
  }, [isLow]);

  const segOpacity = (i: number) => {
    if (i >= filledSegs) return 0;
    if (isLow && blink) return 0.35;
    return 1;
  };

  return (
    <div style={{ position: "relative", width: 32, height: 68, flexShrink: 0 }}>

      {/* ambient glow behind battery */}
      <motion.div
        animate={!isEmpty ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.05 }}
        transition={{ duration: isCharging ? 0.75 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: -8,
          borderRadius: 12,
          background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(7px)",
          pointerEvents: "none",
        }}
      />

      <svg width="32" height="68" viewBox="0 0 32 68"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}>

        {/* ── terminal cap (top nub) ── */}
        <rect x="10" y="0" width="12" height="6" rx="2"
          fill={isEmpty ? "#222" : fillColor}
          stroke={rimColor} strokeWidth="1.5" />

        {/* ── battery shell ── */}
        <rect x="2" y="5" width="28" height="62" rx="4"
          fill={shellColor} stroke={rimColor} strokeWidth="2" />

        {/* top gloss */}
        <rect x="5" y="7" width="22" height="3" rx="1.5"
          fill="rgba(255,255,255,0.12)" />

        {/* ── 5 fill segments (bottom→top = index 0→4) ── */}
        {[0,1,2,3,4].map(i => {
          const segY = 56 - i * 11; // bottom-up
          return (
            <g key={i}>
              {/* slot outline */}
              <rect x="6" y={segY} width="20" height="9" rx="1.5"
                fill="rgba(0,0,0,0.3)"
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
              {/* filled block */}
              <rect x="6" y={segY} width="20" height="9" rx="1.5"
                fill={fillColor}
                opacity={segOpacity(i)} />
              {/* shine on top of filled block */}
              {i < filledSegs && (
                <rect x="8" y={segY + 1} width="6" height="3" rx="1"
                  fill="rgba(255,255,255,0.3)"
                  opacity={segOpacity(i)} />
              )}
            </g>
          );
        })}

        {/* ── charging bolt (center, when active) ── */}
        {isCharging && !isEmpty && (
          <motion.polygon
            points="18,18 12,34 17,34 14,50 22,32 17,32"
            fill="rgba(255,255,255,0.9)"
            style={{ filter: `drop-shadow(0 0 4px ${fillColor})` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* bottom rounded cap */}
        <rect x="2" y="62" width="28" height="5" rx="3"
          fill={isEmpty ? "#1a1a1a" : fillColor} opacity="0.6" />
      </svg>

      {/* LOW / EMPTY label */}
      {(isLow || isEmpty) && (
        <div style={{
          position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)",
          background: isEmpty ? "#111" : "#3f0808",
          border: `1px solid ${isEmpty ? "#444" : "#dc2626"}`,
          borderRadius: 3, padding: "1px 4px", whiteSpace: "nowrap",
        }}>
          <span style={{
            fontFamily: "monospace", fontSize: 7, fontWeight: 900,
            color: isEmpty ? "#555" : "#fca5a5", letterSpacing: 0.5,
          }}>{isEmpty ? "DEAD" : "LOW"}</span>
        </div>
      )}
    </div>
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
  onInviteOpen?: () => void;
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
        {/* HEALTH label */}
        <span style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9, fontWeight: 900, color: "#22c55e",
          letterSpacing: 1, lineHeight: 1,
          textShadow: "0 0 4px #22c55e",
          imageRendering: "pixelated",
        }}>HEALTH</span>
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

const BANNERS = ["/banner-1.png", "/banner-2.png"];

const BANNER_CHANNEL_URL = "https://t.me/LightningSatoshi";

function BannerCarousel({ onInviteOpen }: { onInviteOpen?: () => void }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % BANNERS.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  function handleTap(index: number) {
    if (index === 0) {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(BANNER_CHANNEL_URL);
      } else {
        window.open(BANNER_CHANNEL_URL, "_blank");
      }
    } else if (index === 1) {
      onInviteOpen?.();
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "clamp(90px, 18svh, 140px)", borderRadius: 12, overflow: "hidden", marginTop: "clamp(4px, 1svh, 8px)", flexShrink: 0 }}>
      {BANNERS.map((src, i) => (
        <motion.img
          key={src}
          src={src}
          alt={`banner-${i + 1}`}
          onClick={() => handleTap(i)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", borderRadius: 12, cursor: "pointer" }}
          initial={false}
          animate={{ opacity: i === current ? 1 : 0, scale: i === current ? 1 : 1.02 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
      ))}
      {/* dot indicators */}
      <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, zIndex: 10, pointerEvents: "none" }}>
        {BANNERS.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === current ? 16 : 6, background: i === current ? "#3B82F6" : "rgba(255,255,255,0.35)" }}
            transition={{ duration: 0.3 }}
            style={{ height: 4, borderRadius: 2 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function MiningMachinePanel({ onWalletOpen, onInviteOpen }: MiningMachinePanelProps) {
  const queryClient = useQueryClient();
  const { showMonetagAd } = useAdFlow();
  const [cpuCountdown, setCpuCountdown] = useState(0);
  const [repairOpen, setRepairOpen] = useState(false);
  const [antivirusOpen, setAntivirusOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeType, setUpgradeType] = useState<null | "mining" | "cpu" | "capacity">(null);
  const [energyOpen, setEnergyOpen] = useState(false);
  const [adRunning, setAdRunning] = useState(false);

  // ── Uptime tracking ──
  const sessionStartRef = useRef(Date.now());
  const [uptimeDisplay, setUptimeDisplay] = useState("0m");
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      setUptimeDisplay(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Network quality ──
  const [networkQuality, setNetworkQuality] = useState<"Weak" | "Stable" | "Excellent">("Stable");
  useEffect(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      const map: Record<string, "Weak" | "Stable" | "Excellent"> = {
        "slow-2g": "Weak", "2g": "Weak", "3g": "Stable", "4g": "Excellent", "5g": "Excellent",
      };
      setNetworkQuality(map[conn.effectiveType] ?? "Stable");
      const handler = () => setNetworkQuality(map[conn.effectiveType] ?? "Stable");
      conn.addEventListener("change", handler);
      return () => conn.removeEventListener("change", handler);
    }
  }, []);

  // ── Simulated temperature — updated after state loads ──
  const [temperature, setTemperature] = useState(38);
  const cpuActiveRef = useRef(false);

  const { data: state } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    refetchInterval: 15000,
    staleTime: 14000,
    retry: false,
    placeholderData: (prev) => prev,
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
      const duration = state?.cpuDurationSec ?? 0;
      setCpuCountdown(duration);
      patchState({ cpuRunning: true, hasEnergy: false, cpuRemainingSeconds: duration });
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

  // Keep cpuActiveRef in sync and update simulated temperature
  if (cpuActiveRef.current !== isMining) {
    cpuActiveRef.current = isMining;
    setTemperature(isMining ? 44 + Math.floor(Math.random() * 5) : 38 + Math.floor(Math.random() * 3));
  }

  const dotColor = machineStopped ? "#ef4444" : isMining ? "#22c55e" : "#f59e0b";

  // Efficiency: ratio of current mining rate fill vs capacity utilization
  const efficiencyPct = Math.min(100, Math.round(
    isMining ? 70 + (state.miningLevel / 25) * 25 : 40 + (state.miningLevel / 25) * 20
  ));

  const nextMiningRate = (state.miningRate * 1.5).toFixed(4);
  const nextCapacity = (state.capacity * 2).toFixed(0);
  const nextCpuSec = Math.round(state.cpuDurationSec * 1.5);

  const card = { background: "rgba(12,12,16,0.97)", border: "1px solid rgba(255,255,255,0.08)" } as React.CSSProperties;
  const dim = "rgba(255,255,255,0.06)";

  return (
    <>
      <div className="w-full px-3 pt-2 flex flex-col" style={{ height: "100%", overflow: "hidden", paddingBottom: "calc(env(safe-area-inset-bottom) + 115px)" }}>

        {/* ── COLLECTABLE AMOUNT ── */}
        <div className="flex flex-col items-center" style={{ paddingBottom: "clamp(2px, 0.8svh, 8px)" }}>
          <p className="text-white/50 font-semibold uppercase tracking-widest leading-none" style={{ fontSize: "clamp(7px, 1.5svh, 9px)" }}>Collectable</p>
          <div className="flex items-baseline gap-1">
            <span className="text-white font-black tabular-nums leading-tight" style={{ fontSize: "clamp(16px, 3.5svh, 22px)" }}>{localMined.toFixed(2)}</span>
            <span className="font-black leading-tight" style={{ color: "#3B82F6", fontSize: "clamp(10px, 2svh, 14px)" }}>AXN</span>
          </div>
          <p className="text-white/25" style={{ fontSize: "clamp(6px, 1.2svh, 8px)", marginTop: 1 }}>≈ ${minedUsd} USD</p>
          <div className="flex items-center gap-1" style={{ marginTop: 1 }}>
            <span className="font-bold tabular-nums" style={{ fontSize: "clamp(7px, 1.5svh, 10px)", color: isMining ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
              {isMining ? `+${state.miningRate} AXN/s` : "0.00 AXN/s"}
            </span>
            {isMining && <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />}
          </div>
        </div>

        {/* ── 3-COLUMN: Left buttons | Machine | Right stats ── */}
        <div style={{ display: "flex", alignItems: "stretch", gap: "clamp(4px, 1.5vw, 10px)", flex: "1 1 0", minHeight: 0, padding: "0 2px" }}>

          {/* LEFT — Repair, Antivirus, Energy */}
          <div style={{ width: "clamp(42px, 11vw, 54px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(4px, 1.2svh, 10px)" }}>
            {(() => {
              const iw = "clamp(42px, 11vw, 54px)";
              const ih = "clamp(56px, 13svh, 72px)";
              return (<>
                <button onClick={() => setRepairOpen(true)}
                  className="relative flex flex-col items-center gap-0 active:scale-95 transition-transform">
                  <div className="relative" style={{ width: iw, height: ih }}>
                    <img src="/icon-repair.png" alt="Repair" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    {state.machineHealth < 100 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-black text-[7px] text-white"
                        style={{ background: "linear-gradient(135deg,#8B5CF6,#6d28d9)" }}>{state.machineHealth}</span>
                    )}
                  </div>
                  <span className="text-white/50 font-bold uppercase tracking-wide" style={{ fontSize: "clamp(6px, 1.2svh, 8px)" }}>REPAIR</span>
                </button>
                <button onClick={() => setAntivirusOpen(true)}
                  className="relative flex flex-col items-center gap-0 active:scale-95 transition-transform">
                  <div className="relative" style={{ width: iw, height: ih }}>
                    <img src="/icon-antivirus.png" alt="Antivirus" style={{ width: "100%", height: "100%", objectFit: "contain", filter: state.antivirusActive ? "none" : "grayscale(0.5) brightness(0.7)" }} />
                    {!state.antivirusActive && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-black text-[7px] text-white"
                        style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>OFF</span>
                    )}
                  </div>
                  <span className="text-white/50 font-bold uppercase tracking-wide" style={{ fontSize: "clamp(6px, 1.2svh, 8px)" }}>ANTIVIRUS</span>
                </button>
                <button onClick={() => setEnergyOpen(true)}
                  className="flex flex-col items-center gap-0 active:scale-95 transition-transform">
                  <img src="/icon-energy.png" alt="Energy" style={{ width: iw, height: ih, objectFit: "contain" }} />
                  <span className="text-white/50 font-bold uppercase tracking-wide" style={{ fontSize: "clamp(6px, 1.2svh, 8px)" }}>ENERGY</span>
                </button>
              </>);
            })()}
          </div>

          {/* CENTER — Machine image */}
          <div className="relative flex items-end justify-center" style={{ flex: "1 1 0", minWidth: 0, minHeight: 0 }}>
            <motion.img
              src="/axn-character.png"
              alt="Mining Machine"
              loading="eager"
              fetchPriority="high"
              style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", position: "relative", filter: "drop-shadow(0 0 28px rgba(59,130,246,0.9)) drop-shadow(0 0 8px rgba(0,180,255,0.6))", transform: "scale(1.18)", transformOrigin: "center bottom" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3 }}
            />
            {isMining && [
              { left: "30%", top: "8%",  delay: 0,    color: "#93c5fd" },
              { left: "65%", top: "14%", delay: 0.25, color: "#60a5fa" },
              { left: "50%", top: "28%", delay: 0.5,  color: "#38bdf8" },
              { left: "20%", top: "38%", delay: 0.15, color: "#93c5fd" },
              { left: "75%", top: "32%", delay: 0.4,  color: "#7dd3fc" },
              { left: "38%", top: "52%", delay: 0.6,  color: "#60a5fa" },
              { left: "62%", top: "58%", delay: 0.8,  color: "#38bdf8" },
              { left: "48%", top: "72%", delay: 0.35, color: "#93c5fd" },
            ].map((p, i) => (
              <motion.div key={i}
                style={{ position: "absolute", top: p.top, left: p.left, width: 8, height: 8, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${p.color}, #3b82f6, #1d4ed8)`, boxShadow: "0 0 8px rgba(59,130,246,0.95)", pointerEvents: "none" }}
                animate={{ y: [0, -40, -55], opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: p.delay, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* RIGHT — Speed, CPU, Capacity */}
          {(() => {
            const rsz = "clamp(52px, 13svh, 68px)";
            return (
              <div style={{ width: "clamp(56px, 14vw, 72px)", display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(6px, 1.5svh, 16px)" }}>
                <button onClick={() => setUpgradeType("mining")}
                  className="flex flex-col items-center gap-0 active:scale-95 transition-transform">
                  <img src="/axn-icon-speed.png" alt="Speed" className="object-contain" style={{ imageRendering: "pixelated", width: rsz, height: rsz }} />
                  <span className="font-black" style={{ fontSize: "clamp(6px, 1.2svh, 8px)", color: "#c084fc" }}>Lv.{state.miningLevel}</span>
                </button>
                <button onClick={() => setUpgradeType("cpu")}
                  className="flex flex-col items-center gap-0 active:scale-95 transition-transform">
                  <img src="/axn-icon-cpu.png" alt="CPU" className="object-contain" style={{ imageRendering: "pixelated", width: rsz, height: rsz }} />
                  <span className="font-black text-blue-300" style={{ fontSize: "clamp(6px, 1.2svh, 8px)" }}>Lv.{state.cpuLevel}</span>
                </button>
                <button onClick={() => setUpgradeType("capacity")}
                  className="flex flex-col items-center gap-0 active:scale-95 transition-transform">
                  <img src="/axn-icon-capacity.png" alt="Cap" className="object-contain" style={{ imageRendering: "pixelated", width: rsz, height: rsz }} />
                  <span className="font-black text-amber-300" style={{ fontSize: "clamp(6px, 1.2svh, 8px)" }}>Lv.{state.capacityLevel}</span>
                </button>
              </div>
            );
          })()}

        </div>

        {/* ── BANNER CAROUSEL ── */}
        <div
          ref={(el) => {
            if (!el) return;
            const update = () => {
              const rect = el.getBoundingClientRect();
              const fromBottom = window.innerHeight - rect.bottom;
              document.documentElement.style.setProperty('--char-ground-bottom', `${Math.max(0, fromBottom)}px`);
            };
            update();
            const ro = new ResizeObserver(update);
            ro.observe(el);
            window.addEventListener('resize', update);
          }}
        >
          <BannerCarousel onInviteOpen={onInviteOpen} />
        </div>

      </div>

      {/* ── FIXED BOTTOM NAV ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(6,6,10,0.97)", borderTop: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", paddingTop: 7, paddingBottom: "max(calc(env(safe-area-inset-bottom) + 18px), 22px)", paddingLeft: 12, paddingRight: 12 }}>

        {/* Health + Energy bars */}
        <div className="flex flex-col gap-1 mb-2.5">
          {(() => {
            const hp = Math.max(0, Math.min(100, state.machineHealth));
            return (
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "'Courier New',monospace", fontSize: 8, fontWeight: 900, color: "#cc1111", letterSpacing: 1, width: 38, flexShrink: 0, textShadow: "0 0 4px #cc1111" }}>HEALTH</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden relative" style={{ background: "#1a1a1a", border: "1.5px solid #333" }}>
                  <motion.div className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${hp}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ background: hp > 50 ? "#cc1111" : hp > 20 ? "#990000" : "#550000", boxShadow: "inset 0 1px 0 rgba(255,100,100,0.3)" }} />
                </div>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", width: 34, flexShrink: 0, textAlign: "right" }}>{hp}/100</span>
              </div>
            );
          })()}
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Courier New',monospace", fontSize: 8, fontWeight: 900, color: "#F5C542", letterSpacing: 1, width: 38, flexShrink: 0, textShadow: "0 0 4px #F5C542" }}>ENERGY</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden relative" style={{ background: "#1a1a1a", border: "1.5px solid #333" }}>
              <motion.div className="absolute inset-y-0 left-0 rounded-full"
                animate={{ width: `${energyPct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ background: energyPct > 50 ? "#f5c542" : energyPct > 20 ? "#e07b00" : "#cc1111", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" }} />
            </div>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", width: 34, flexShrink: 0, textAlign: "right" }}>{energyPct}%</span>
          </div>
        </div>

        {/* Pill buttons row */}
        <div className="flex gap-2.5">

          {/* LEFT pill — Start / Mining+timer / Claim */}
          <button
            onClick={() => {
              if (!state.cpuRunning && !canClaim) {
                if (state.machineHealth <= 0) { setRepairOpen(true); showNotification("Machine needs repair before mining!", "error"); return; }
                if (!state.hasEnergy) { setEnergyOpen(true); showNotification("Refill energy to start mining!", "warning"); return; }
                handleStartMining();
              } else if (canClaim) {
                handleCollect();
              }
            }}
            disabled={claimMutation.isPending || startCpuMutation.isPending || (state.cpuRunning && !canClaim && !canClaim)}
            className="flex-1 active:scale-95 transition-all disabled:opacity-40"
            style={{ height: 56, borderRadius: 28, background: "rgba(22,24,36,0.98)", border: "1.5px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", paddingLeft: 20, paddingRight: 16 }}>
            {(claimMutation.isPending || startCpuMutation.isPending)
              ? <div className="w-full flex items-center justify-center"><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
              : state.cpuRunning
              ? <>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>Farming</span>
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>{localMined.toFixed(3)}</span>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#1a3a6b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src="/axn-logo.svg" alt="AXN" style={{ width: 14, height: 14, objectFit: "contain" }} />
                    </div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontFamily: "monospace", fontWeight: 600, marginTop: 1 }}>
                    {String(Math.floor(cpuCountdown / 3600)).padStart(2,"0")}:{String(Math.floor((cpuCountdown % 3600) / 60)).padStart(2,"0")}:{String(cpuCountdown % 60).padStart(2,"0")}
                  </div>
                </>
              : canClaim
              ? <div className="flex items-center gap-2 w-full justify-center">
                  <div style={{ width: 20, height: 20, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#1a3a6b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/axn-logo.svg" alt="AXN" style={{ width: 15, height: 15, objectFit: "contain" }} />
                  </div>
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: "0.02em" }}>Claim</span>
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 900 }}>{localMined.toFixed(3)}</span>
                </div>
              : <div className="w-full flex items-center justify-center">
                  <span style={{ color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: "0.06em" }}>START MINING</span>
                </div>
            }
          </button>

          {/* RIGHT pill — Withdraw (blue) */}
          <button
            onClick={onWalletOpen}
            className="active:scale-95 transition-all"
            style={{ height: 56, borderRadius: 28, background: "linear-gradient(135deg,#1d8ef0,#0d6fcb)", minWidth: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingInline: 16 }}>
            <div className="flex items-center gap-1.5">
              <img src="/money-icon-nobg.png" alt="Withdraw" style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "pixelated", filter: "brightness(0) invert(1)" }} />
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: "0.05em" }}>WITHDRAW</span>
            </div>
          </button>

        </div>
      </div>

      {repairOpen && <RepairPopup repairCost={state.repairCost} machineHealth={state.machineHealth} balance={state.balance} onClose={() => setRepairOpen(false)} />}
      {antivirusOpen && <AntivirusPopup antivirusCost={state.antivirusCost} antivirusActive={state.antivirusActive} balance={state.balance} miningLevel={state.miningLevel} onClose={() => setAntivirusOpen(false)} />}
      {upgradeOpen && <UpgradeMachinePopup onClose={() => setUpgradeOpen(false)} />}
      {upgradeType && <UpgradeMachinePopup initialSubView={upgradeType} onClose={() => setUpgradeType(null)} />}
      {energyOpen && <EnergyPopup energyCost={state.energyCost} balance={state.balance} onClose={() => setEnergyOpen(false)} />}
    </>
  );
}
