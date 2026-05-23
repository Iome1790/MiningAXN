import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AXNIcon } from "@/components/AXNIcon";

declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
  }
}

const CUT_SM = 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)';
const BTN_CORNERS = [
  {top:'1px',left:'12px',width:'18px',height:'1.5px'},{top:'12px',left:'1px',width:'1.5px',height:'18px'},
  {top:'1px',right:'12px',width:'18px',height:'1.5px'},{top:'12px',right:'1px',width:'1.5px',height:'18px'},
  {bottom:'1px',left:'12px',width:'18px',height:'1.5px'},{bottom:'12px',left:'1px',width:'1.5px',height:'18px'},
  {bottom:'1px',right:'12px',width:'18px',height:'1.5px'},{bottom:'12px',right:'1px',width:'1.5px',height:'18px'},
] as const;

/* ─── Audio ─── */
function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
    setTimeout(() => ctx.close(), dur * 1000 + 100);
  } catch {}
}
function slideTick() { playTone(600, 0.06, "sine", 0.13); }
function solveChime() { [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => playTone(f, 0.1), i * 55)); }
function vib(p: number | number[]) { try { navigator.vibrate?.(p); } catch {} }

/* ─── Tile colors — vivid, unique per tile number ─── */
const TILE_PALETTES = [
  { bg: "linear-gradient(135deg,#f7931a,#e07c10)", text: "#fff", shadow: "rgba(247,147,26,0.4)" },
  { bg: "linear-gradient(135deg,#627eea,#4a65d6)", text: "#fff", shadow: "rgba(98,126,234,0.4)" },
  { bg: "linear-gradient(135deg,#c91017,#a50d13)", text: "#fff", shadow: "rgba(201,16,23,0.4)" },
  { bg: "linear-gradient(135deg,#22c55e,#16a34a)", text: "#fff", shadow: "rgba(34,197,94,0.4)" },
  { bg: "linear-gradient(135deg,#9945ff,#7c3aed)", text: "#fff", shadow: "rgba(153,69,255,0.4)" },
  { bg: "linear-gradient(135deg,#06b6d4,#0891b2)", text: "#fff", shadow: "rgba(6,182,212,0.4)" },
  { bg: "linear-gradient(135deg,#f59e0b,#d97706)", text: "#1a1200", shadow: "rgba(245,158,11,0.4)" },
  { bg: "linear-gradient(135deg,#ec4899,#db2777)", text: "#fff", shadow: "rgba(236,72,153,0.4)" },
  { bg: "linear-gradient(135deg,#14b8a6,#0d9488)", text: "#fff", shadow: "rgba(20,184,166,0.4)" },
  { bg: "linear-gradient(135deg,#f97316,#ea580c)", text: "#fff", shadow: "rgba(249,115,22,0.4)" },
  { bg: "linear-gradient(135deg,#3b82f6,#2563eb)", text: "#fff", shadow: "rgba(59,130,246,0.4)" },
  { bg: "linear-gradient(135deg,#a3e635,#84cc16)", text: "#1a2200", shadow: "rgba(163,230,53,0.4)" },
];

const COIN_SYMBOLS = ["₿","Ξ","◎","Ð","Ł","✕","▲","B"];

/* ─── Puzzle sequence ─── */
const PUZZLE_SEQ = [
  { rows: 2, cols: 2, shuffleMoves: 18 },
  { rows: 2, cols: 2, shuffleMoves: 22 },
  { rows: 2, cols: 2, shuffleMoves: 25 },
  { rows: 2, cols: 3, shuffleMoves: 40 },
  { rows: 2, cols: 3, shuffleMoves: 45 },
  { rows: 2, cols: 3, shuffleMoves: 50 },
];

const TOTAL_TIME = 90;
const REWARD_PER_SOLVE = 10;

type Tiles = (number | null)[];

function getNeighbors(idx: number, rows: number, cols: number): number[] {
  const res: number[] = [];
  const r = Math.floor(idx / cols), c = idx % cols;
  if (r > 0) res.push(idx - cols);
  if (r < rows - 1) res.push(idx + cols);
  if (c > 0) res.push(idx - 1);
  if (c < cols - 1) res.push(idx + 1);
  return res;
}

function makeSolved(rows: number, cols: number): Tiles {
  const tiles: Tiles = [];
  for (let i = 0; i < rows * cols - 1; i++) tiles.push(i);
  tiles.push(null);
  return tiles;
}

function shufflePuzzle(tiles: Tiles, rows: number, cols: number, moves: number): Tiles {
  let t = [...tiles];
  let blankIdx = t.indexOf(null);
  let lastMoved = -1;
  for (let i = 0; i < moves; i++) {
    const neighbors = getNeighbors(blankIdx, rows, cols).filter(n => n !== lastMoved);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [t[blankIdx], t[pick]] = [t[pick], t[blankIdx]];
    lastMoved = blankIdx;
    blankIdx = pick;
  }
  return t;
}

function isSolved(tiles: Tiles): boolean {
  for (let i = 0; i < tiles.length - 1; i++) if (tiles[i] !== i) return false;
  return tiles[tiles.length - 1] === null;
}

/* ─── Animated Game Controller ─── */
function AnimatedGameController() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="ssCtrlGrad" x1="30" y1="58" x2="130" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id="ssGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <motion.g
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <ellipse cx="80" cy="125" rx="38" ry="6" fill="rgba(6,182,212,0.15)" filter="url(#ssGlow)"/>
        <rect x="28" y="55" width="104" height="62" rx="20" fill="#1e1e2a"/>
        <rect x="28" y="55" width="104" height="62" rx="20" fill="url(#ssCtrlGrad)"/>
        <rect x="28" y="55" width="104" height="62" rx="20" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"/>
        <path d="M48 57 Q80 54 112 57" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <rect x="28" y="88" width="22" height="32" rx="11" fill="#181820"/>
        <rect x="110" y="88" width="22" height="32" rx="11" fill="#181820"/>
        <circle cx="56" cy="95" r="11" fill="#2a2a38"/>
        <circle cx="56" cy="95" r="7" fill="#333344"/>
        <circle cx="56" cy="95" r="3.5" fill="#444458"/>
        <rect x="42" y="72" width="7" height="20" rx="2.5" fill="rgba(255,255,255,0.2)"/>
        <rect x="36" y="78" width="19" height="7" rx="2.5" fill="rgba(255,255,255,0.2)"/>
        <circle cx="100" cy="83" r="9" fill="#2a2a38"/>
        <circle cx="100" cy="83" r="5.5" fill="#333344"/>
        <circle cx="100" cy="83" r="2.5" fill="#444458"/>
        <motion.circle cx="110" cy="70" r="7" fill="#ef4444" filter="url(#ssGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}/>
        <motion.circle cx="124" cy="79" r="7" fill="#3b82f6" filter="url(#ssGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.35 }}/>
        <motion.circle cx="110" cy="88" r="7" fill="#22c55e" filter="url(#ssGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.7 }}/>
        <motion.circle cx="96" cy="79" r="7" fill="#f59e0b" filter="url(#ssGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 1.05 }}/>
        <text x="110" y="73.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">✕</text>
        <text x="124" y="82.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">○</text>
        <text x="110" y="91.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">△</text>
        <text x="96" y="82.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">□</text>
        <circle cx="80" cy="86" r="9" fill="#1a1a28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <circle cx="80" cy="86" r="6" fill="#222230"/>
        <rect x="67" y="71" width="7" height="4" rx="2" fill="rgba(255,255,255,0.18)"/>
        <rect x="86" y="71" width="7" height="4" rx="2" fill="rgba(255,255,255,0.18)"/>
        <motion.circle cx="110" cy="70" fill="none" stroke="#ef4444" strokeWidth="1"
          initial={{ r: 9, opacity: 0.5 }}
          animate={{ r: [9, 14, 9], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}/>
      </motion.g>
    </svg>
  );
}

/* ─── Demo grid ─── */
function DemoGrid({ solved, color }: { solved: boolean; color: string }) {
  const tiles = solved ? [0, 1, 2, null] : [0, 2, null, 1];
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 3, width: 88, height: 88 }}>
        {tiles.map((v, i) => (
          <div key={i} style={{
            borderRadius: 6,
            background: v !== null ? color : "transparent",
            border: v !== null ? "none" : "1.5px dashed rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {v !== null && <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: 900 }}>{v + 1}</span>}
          </div>
        ))}
      </div>
      {solved && (
        <div style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>✓</span>
        </div>
      )}
    </div>
  );
}

/* ─── Top nav bar ─── */
function TopBar() {
  return (
    <div style={{
      padding: "12px 14px 10px",
      background: "linear-gradient(180deg,#1a1a1e 0%,#141416 100%)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)", pointerEvents: "none" }} />
      <p style={{ color: "white", fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: 0.3 }}>Sliding Axionet</p>
      <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, margin: 0 }}>Slide tiles and finish the puzzle</p>
    </div>
  );
}

interface Popup { id: number; text: string; }

/* ─── Results screen ─── */
function ResultsScreen({ score, onPlayAgain, onHome, onClaim }: {
  score: number; onPlayAgain: () => void; onHome: () => void; onClaim: () => Promise<void>;
}) {
  const [claimState, setClaimState] = useState<"idle" | "loading" | "done">("idle");

  const handleClaim = async () => {
    if (claimState !== "idle") return;
    setClaimState("loading");
    try {
      await onClaim();
      setClaimState("done");
    } catch {
      setClaimState("idle");
    }
  };

  const CONFETTI = [
    { x: -90, y: -65, color: "#22d3ee", w: 10, h: 7, rot: 140, d: 0.28 },
    { x: 65, y: -85, color: "#f59e0b", w: 8, h: 8, rot: 220, d: 0.38 },
    { x: 105, y: -35, color: "#ef4444", w: 12, h: 6, rot: 180, d: 0.24 },
    { x: -110, y: 8, color: "#3b82f6", w: 9, h: 9, rot: -80, d: 0.33 },
    { x: -65, y: 85, color: "#a855f7", w: 7, h: 11, rot: 100, d: 0.42 },
    { x: 95, y: 75, color: "#22c55e", w: 10, h: 6, rot: -150, d: 0.20 },
    { x: -125, y: -42, color: "#f97316", w: 8, h: 8, rot: 240, d: 0.46 },
    { x: 125, y: 52, color: "#ec4899", w: 11, h: 7, rot: -200, d: 0.36 },
    { x: 32, y: 105, color: "#facc15", w: 9, h: 6, rot: 300, d: 0.26 },
    { x: -28, y: -105, color: "#34d399", w: 7, h: 10, rot: -120, d: 0.44 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0d0d0f 0%,#111114 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", overflow: "hidden" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {CONFETTI.map((c, i) => (
          <motion.div key={i}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x: c.x, y: c.y, opacity: 0, rotate: c.rot }}
            transition={{ duration: 1.3, delay: c.d, ease: "easeOut" }}
            style={{ position: "absolute", width: c.w, height: c.h, background: c.color, borderRadius: 2, pointerEvents: "none", zIndex: 2 }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 14, stiffness: 180, delay: 0.1 }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <svg width="160" height="200" viewBox="0 0 160 200" fill="none">
            <defs>
              <linearGradient id="ssBadgeGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a"/><stop offset="60%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
              <linearGradient id="ssBadgeInner" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#b45309"/>
              </linearGradient>
            </defs>
            <circle cx="140" cy="78" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="132" cy="108" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="110" cy="130" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="80" cy="138" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="50" cy="130" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="28" cy="108" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="20" cy="78" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="28" cy="48" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="50" cy="26" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="80" cy="18" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="110" cy="26" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="132" cy="48" r="14" fill="url(#ssBadgeGold)"/>
            <circle cx="80" cy="78" r="54" fill="url(#ssBadgeGold)"/>
            <circle cx="80" cy="78" r="42" fill="url(#ssBadgeInner)"/>
            <path d="M54 54 Q80 42 106 54" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <polyline points="62,78 75,93 102,65" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M63,132 L55,176 L80,160 L80,132 Z" fill="#dc2626"/>
            <path d="M97,132 L105,176 L80,160 L80,132 Z" fill="#ef4444"/>
            <rect x="57" y="128" width="46" height="14" rx="4" fill="#b91c1c"/>
          </svg>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ color: "white", fontSize: 64, fontWeight: 900, margin: "4px 0 4px", letterSpacing: -2, lineHeight: 1 }}
      >
        {score}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center", margin: "0 0 8px" }}
      >
        AXN earned this game
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", margin: "0 0 28px" }}
      >
        {claimState === "done" ? "✓ Reward added to your balance!" : "Watch an ad to claim your AXN reward"}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ width: "100%", maxWidth: 300, marginBottom: 20 }}
      >
        {claimState !== "done" ? (
          <button
            onClick={handleClaim}
            disabled={claimState === "loading"}
            style={{
              position: "relative", width: "100%", padding: "16px 0", clipPath: CUT_SM,
              background: claimState === "loading" ? "rgba(6,182,212,0.4)" : "linear-gradient(90deg,#0891b2,#06b6d4)",
              border: "none", color: "white", fontSize: 16, fontWeight: 800,
              cursor: claimState === "loading" ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3,
              touchAction: "manipulation",
            }}
          >
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.45)", borderRadius:1, ...s }} />)}
            {claimState === "loading" ? (
              <>
                <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{position:"relative",zIndex:1}}
                  animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </motion.svg>
                <span style={{position:"relative",zIndex:1}}>Claiming...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{position:"relative",zIndex:1}}>
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
                <span style={{position:"relative",zIndex:1}}>Claim Reward</span>
              </>
            )}
          </button>
        ) : (
          <div style={{ position:"relative", width:"100%", padding:"16px 0", clipPath: CUT_SM, background:"rgba(34,197,94,0.18)", color:"#22c55e", fontSize:16, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(34,197,94,0.55)", borderRadius:1, ...s }} />)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{position:"relative",zIndex:1}}>Reward Claimed!</span>
          </div>
        )}
      </motion.div>

      {claimState === "done" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 16 }}>
          <button onClick={onHome} style={{ position:"relative", width:58, height:58, clipPath:CUT_SM, background:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.25)", borderRadius:1, ...s }} />)}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button onClick={onPlayAgain} style={{ position:"relative", width:58, height:58, clipPath:CUT_SM, background:"linear-gradient(135deg,#0891b2,#06b6d4)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.4)", borderRadius:1, ...s }} />)}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function SlidingSense() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  type Phase = "intro" | "sheet" | "countdown" | "playing" | "over" | "done" | "results";
  const [phase, setPhase] = useState<Phase>("intro");
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [countVal, setCountVal] = useState(3);

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [tiles, setTiles] = useState<Tiles>([]);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardSent = useRef(false);
  const adShown = useRef(false);

  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("hs_sliding") || "0"));
  useEffect(() => {
    if (phase === "results" || phase === "over" || phase === "done") {
      setHighScore(prev => {
        const next = Math.max(prev, score);
        if (next > prev) localStorage.setItem("hs_sliding", String(next));
        return next;
      });
    }
  }, [phase]);

  const currentPuzzle = PUZZLE_SEQ[puzzleIdx] ?? PUZZLE_SEQ[PUZZLE_SEQ.length - 1];

  const loadPuzzle = useCallback((idx: number) => {
    const p = PUZZLE_SEQ[idx] ?? PUZZLE_SEQ[PUZZLE_SEQ.length - 1];
    const solved = makeSolved(p.rows, p.cols);
    setTiles(shufflePuzzle(solved, p.rows, p.cols, p.shuffleMoves));
  }, []);

  const startGame = useCallback(() => {
    setPuzzleIdx(0);
    setScore(0);
    setTimeLeft(TOTAL_TIME);
    rewardSent.current = false;
    adShown.current = false;
    loadPuzzle(0);
    setCountVal(3);
    setPhase("countdown");
  }, [loadPuzzle]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countVal <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountVal(v => v - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countVal]);

  useEffect(() => {
    if (phase !== "playing") { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setPhase("over"); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if ((phase === "over" || phase === "done") && !adShown.current) {
      adShown.current = true;
      const goToResults = () => setPhase("results");
      const isDevMode = import.meta.env.DEV || import.meta.env.MODE === "development";
      if (!isDevMode && typeof window.show_10401872 === "function") {
        window.show_10401872({ type: "interstitial" }).then(goToResults).catch(goToResults);
      } else {
        setTimeout(goToResults, 300);
      }
    }
  }, [phase]);

  const handleClaim = useCallback(async () => {
    if (rewardSent.current) return;
    const isDevMode = import.meta.env.DEV || import.meta.env.MODE === "development";
    if (!isDevMode && typeof (window as any).Adsgram !== "undefined") {
      try { await (window as any).Adsgram.init({ blockId: "int-29765" }).show(); } catch {}
    }
    if (score > 0) {
      rewardSent.current = true;
      await apiRequest("POST", "/api/game/sliding-sense/reward", { score });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [score, qc]);

  const showPopup = useCallback((text: string) => {
    const id = popupId + 1;
    setPopupId(id);
    setPopups(p => [...p, { id, text }]);
    setTimeout(() => setPopups(p => p.filter(pp => pp.id !== id)), 1000);
  }, [popupId]);

  const handleTileTap = useCallback((idx: number) => {
    if (phase !== "playing") return;
    const { rows, cols } = currentPuzzle;
    const blankIdx = tiles.indexOf(null);
    if (!getNeighbors(blankIdx, rows, cols).includes(idx)) return;
    if (!muted) slideTick();
    vib(20);
    const next = [...tiles];
    [next[blankIdx], next[idx]] = [next[idx], next[blankIdx]];
    setTiles(next);

    if (isSolved(next)) {
      const gain = REWARD_PER_SOLVE;
      setScore(s => s + gain);
      if (!muted) solveChime();
      vib([40, 30, 60]);
      showPopup(`+${gain} AXN`);

      const nextIdx = puzzleIdx + 1;
      if (nextIdx >= PUZZLE_SEQ.length) {
        setTimeout(() => setPhase("done"), 700);
      } else {
        setTimeout(() => {
          setPuzzleIdx(nextIdx);
          loadPuzzle(nextIdx);
        }, 600);
      }
    }
  }, [phase, tiles, currentPuzzle, muted, puzzleIdx, showPopup, loadPuzzle]);

  const { rows, cols } = currentPuzzle;
  const timerPct = timeLeft / TOTAL_TIME;

  const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
  const GRID_W = Math.min(screenW - 20, 440);
  const GAP = 6;
  const tileSize = Math.floor((GRID_W - GAP * (cols - 1)) / cols);

  /* ─── RESULTS ─── */
  if (phase === "results") {
    return (
      <ResultsScreen
        score={score}
        onHome={() => setLocation("/game")}
        onPlayAgain={() => { adShown.current = false; rewardSent.current = false; startGame(); }}
        onClaim={handleClaim}
      />
    );
  }

  /* ─── INTRO ─── */
  if (phase === "intro" || phase === "sheet") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0d0d0f 0%,#111114 100%)", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <AnimatedGameController />
          <p style={{ color: "white", fontSize: 16, textAlign: "center", marginTop: 20, lineHeight: 1.55, fontWeight: 500 }}>
            You are about to start the puzzle.<br/>As soon as you are ready,<br/>click the start button!
          </p>
          {highScore > 0 && (
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 12, padding: "8px 20px" }}>
              <span style={{ fontSize: 17 }}>🏆</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600 }}>Best: <span style={{ color: "#06b6d4", fontWeight: 900 }}>{highScore} AXN</span></span>
            </div>
          )}
        </div>
        <div style={{ padding: "0 24px 36px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setMuted(m => !m)} style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation",
            }}>
              {muted
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <button onClick={() => setPhase("sheet")} style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation",
            }}>
              <span style={{ color: "white", fontSize: 17, fontWeight: 800, fontFamily: "monospace" }}>?</span>
            </button>
          </div>
          <button onClick={startGame} style={{ position: "relative", width: "100%", padding: "16px 0", clipPath: CUT_SM, background: "linear-gradient(90deg,#0891b2,#06b6d4)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5, touchAction: "manipulation" }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.55)", borderRadius:1, ...s }} />)}
            START GAME
          </button>
          <button onClick={() => setLocation("/game")} style={{ position: "relative", width: "100%", padding: "15px 0", clipPath: CUT_SM, background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, touchAction: "manipulation" }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.2)", borderRadius:1, ...s }} />)}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>

        <AnimatePresence>
          {phase === "sheet" && (
            <>
              <div onClick={() => setPhase("intro")} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 49 }} />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1a1a1e", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
                <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Sliding Axionet</p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 22px" }}>You have 90 seconds to slide tiles...</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <DemoGrid solved={false} color="#0891b2"/>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Scrambled</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <DemoGrid solved={true} color="#06b6d4"/>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Solved</span>
                  </div>
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                  Your goal is to slide the tiles and fix the puzzle.
                </p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                  Each solved puzzle earns +{REWARD_PER_SOLVE} AXN!
                </p>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ─── COUNTDOWN ─── */
  if (phase === "countdown") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0d0d0f 0%,#111114 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={countVal}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{ fontSize: countVal === 0 ? 52 : 100, fontWeight: 900, color: "white", textAlign: "center" }}
          >
            {countVal === 0 ? "GO!" : countVal}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /* ─── PLAYING ─── */
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0d0d0f 0%,#111114 100%)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar />

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AXNIcon size={24} />
          <span style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
        </div>
        <span style={{ color: "white", fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Timer bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", flexShrink: 0, margin: "0 0 4px" }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#06b6d4" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2, boxShadow: "0 0 8px currentColor" }}
        />
      </div>

      {/* Puzzle dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 6 }}>
        {PUZZLE_SEQ.map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < puzzleIdx ? "#22c55e" : i === puzzleIdx ? "#06b6d4" : "rgba(255,255,255,0.12)", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Puzzle grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 0 130px" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`, gridTemplateRows: `repeat(${rows}, ${tileSize}px)`, gap: GAP }}>
          {tiles.map((v, i) => {
            const palette = v !== null ? TILE_PALETTES[v % TILE_PALETTES.length] : null;
            const symbol = v !== null ? COIN_SYMBOLS[v % COIN_SYMBOLS.length] : null;
            const fontSize = Math.max(14, Math.floor(tileSize * 0.28));
            const numSize = Math.max(11, Math.floor(tileSize * 0.2));

            return (
              <motion.div
                layout
                key={v === null ? "blank" : v}
                transition={{ type: "spring", stiffness: 600, damping: 38 }}
                onClick={() => v !== null && handleTileTap(i)}
                style={{
                  width: tileSize, height: tileSize,
                  position: "relative",
                  borderRadius: 12,
                  background: v !== null ? "transparent" : "rgba(255,255,255,0.03)",
                  border: v !== null ? "none" : "2px dashed rgba(255,255,255,0.08)",
                  cursor: v !== null ? "pointer" : "default",
                  userSelect: "none",
                  boxSizing: "border-box" as const,
                  touchAction: "manipulation",
                  overflow: "hidden",
                }}
              >
                {v !== null && palette && (
                  <div style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 11,
                    background: palette.bg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    boxShadow: `0 4px 16px ${palette.shadow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Chrome highlight */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(180deg, rgba(255,255,255,0.15), transparent)", borderRadius: "11px 11px 0 0", pointerEvents: "none" }} />
                    {/* Coin symbol */}
                    <span style={{ color: palette.text, fontSize, fontWeight: 900, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.3)", position: "relative", zIndex: 1 }}>{symbol}</span>
                    {/* Tile number */}
                    <span style={{ color: palette.text, fontSize: numSize, fontWeight: 700, opacity: 0.75, lineHeight: 1, position: "relative", zIndex: 1 }}>{v + 1}</span>
                    {/* Corner dots */}
                    <div style={{ position: "absolute", top: 5, left: 5, width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                    <div style={{ position: "absolute", bottom: 5, right: 5, width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating popups */}
      <AnimatePresence>
        {popups.map(p => (
          <motion.div
            key={p.id}
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -60, opacity: 0, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            style={{ position: "fixed", bottom: 120, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 100, color: "#fbbf24", fontWeight: 900, fontSize: 18, textShadow: "0 2px 8px rgba(0,0,0,0.7)", whiteSpace: "nowrap" }}
          >
            {p.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bottom controls */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, padding: "20px 20px 28px", background: "linear-gradient(0deg,rgba(13,13,15,1) 60%,rgba(13,13,15,0) 100%)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setMuted(m => !m)} style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
            cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation",
          }}>
            {muted
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            }
          </button>
          <button onClick={() => setShowHelp(true)} style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
            cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation",
          }}>
            <span style={{ color: "white", fontSize: 17, fontWeight: 800, fontFamily: "monospace" }}>?</span>
          </button>
        </div>
        <button onClick={() => setLocation("/game")} style={{ width: "100%", padding: "13px 0", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, touchAction: "manipulation" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      {/* Help overlay */}
      <AnimatePresence>
        {showHelp && (
          <>
            <div onClick={() => setShowHelp(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1a1a1e", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
              <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Sliding Axionet</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 22px" }}>You have 90 seconds to slide tiles...</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <DemoGrid solved={false} color="#0891b2"/>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Scrambled</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <DemoGrid solved={true} color="#06b6d4"/>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Solved</span>
                </div>
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                Your goal is to slide the tiles and fix the puzzle.
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                Each solved puzzle earns +{REWARD_PER_SOLVE} AXN!
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
