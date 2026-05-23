import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
const CUT_LG = 'polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)';
const BTN_CORNERS = [
  {top:'1px',left:'12px',width:'18px',height:'1.5px'},{top:'12px',left:'1px',width:'1.5px',height:'18px'},
  {top:'1px',right:'12px',width:'18px',height:'1.5px'},{top:'12px',right:'1px',width:'1.5px',height:'18px'},
  {bottom:'1px',left:'12px',width:'18px',height:'1.5px'},{bottom:'12px',left:'1px',width:'1.5px',height:'18px'},
  {bottom:'1px',right:'12px',width:'18px',height:'1.5px'},{bottom:'12px',right:'1px',width:'1.5px',height:'18px'},
] as const;
const QUEST_CORNERS = [
  {top:'2px',left:'15px',width:'24px',height:'2px'},{top:'15px',left:'2px',width:'2px',height:'24px'},
  {top:'2px',right:'15px',width:'24px',height:'2px'},{top:'15px',right:'2px',width:'2px',height:'24px'},
  {bottom:'2px',left:'15px',width:'24px',height:'2px'},{bottom:'15px',left:'2px',width:'2px',height:'24px'},
  {bottom:'2px',right:'15px',width:'24px',height:'2px'},{bottom:'15px',right:'2px',width:'2px',height:'24px'},
] as const;
const ANS_CORNERS = [
  {top:'1px',left:'11px',width:'16px',height:'1.5px'},{top:'11px',left:'1px',width:'1.5px',height:'16px'},
  {top:'1px',right:'11px',width:'16px',height:'1.5px'},{top:'11px',right:'1px',width:'1.5px',height:'16px'},
  {bottom:'1px',left:'11px',width:'16px',height:'1.5px'},{bottom:'11px',left:'1px',width:'1.5px',height:'16px'},
  {bottom:'1px',right:'11px',width:'16px',height:'1.5px'},{bottom:'11px',right:'1px',width:'1.5px',height:'16px'},
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
function correctSnd() { playTone(880, 0.07); setTimeout(() => playTone(1100, 0.1), 60); }
function wrongSnd() { playTone(200, 0.15, "sawtooth", 0.15); }
function vib(p: number | number[]) { try { navigator.vibrate?.(p); } catch {} }

/* ─── Dynamic coin data for question card decorations ─── */
const QUESTION_COINS = [
  { symbol: "₿", bg: "#f7931a", name: "BTC" },
  { symbol: "Ξ", bg: "#627eea", name: "ETH" },
  { symbol: "◎", bg: "#9945ff", name: "SOL" },
  { symbol: "Ð", bg: "#c2a633", name: "DOGE" },
  { symbol: "Ł", bg: "#345d9d", name: "LTC" },
  { symbol: "✕", bg: "#346aa9", name: "XRP" },
  { symbol: "▲", bg: "#c91017", name: "TRX" },
  { symbol: "B", bg: "#f3ba2f", name: "BNB" },
];

/* ─── Question generation — tracks recent to avoid repeats ─── */
interface Question { text: string; answer: number; choices: number[]; }

const recentQuestions: string[] = [];
const MAX_RECENT = 6;

function makeQuestion(): Question {
  let attempts = 0;
  while (attempts < 12) {
    attempts++;
    const ops = ["+", "-", "×", "÷"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 12) + 1;
    let b = Math.floor(Math.random() * 12) + 1;
    let answer = 0;
    let text = "";

    if (op === "+") { answer = a + b; text = `${a} + ${b}`; }
    else if (op === "-") { if (a < b) [a, b] = [b, a]; answer = a - b; text = `${a} − ${b}`; }
    else if (op === "×") { a = Math.floor(Math.random() * 9) + 1; b = Math.floor(Math.random() * 9) + 1; answer = a * b; text = `${a} × ${b}`; }
    else { b = Math.floor(Math.random() * 9) + 1; const q = Math.floor(Math.random() * 9) + 1; a = b * q; answer = q; text = `${a} ÷ ${b}`; }

    const key = `${text}=${answer}`;
    if (recentQuestions.includes(key) && attempts < 10) continue;

    recentQuestions.push(key);
    if (recentQuestions.length > MAX_RECENT) recentQuestions.shift();

    const set = new Set([answer]);
    const wrongSet: number[] = [];
    const offsets = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
    for (const d of offsets) {
      const w = answer + d;
      if (!set.has(w) && w > 0) { set.add(w); wrongSet.push(w); if (wrongSet.length === 3) break; }
    }
    while (wrongSet.length < 3) {
      const w = answer + Math.floor(Math.random() * 20) + 1;
      if (!set.has(w)) { set.add(w); wrongSet.push(w); }
    }
    const choices = [answer, ...wrongSet].sort(() => Math.random() - 0.5);
    return { text: `${text} = ?`, answer, choices };
  }
  // fallback
  return { text: "5 + 3 = ?", answer: 8, choices: [8, 6, 9, 11] };
}

const TOTAL_TIME = 60;
const REWARD_PER_CORRECT = 4;

/* ─── Animated Game Controller ─── */
function AnimatedGameController() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="cfCtrlGrad" x1="30" y1="58" x2="130" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id="cfGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <motion.g
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        <ellipse cx="80" cy="125" rx="38" ry="6" fill="rgba(124,58,237,0.18)" filter="url(#cfGlow)"/>
        <rect x="28" y="55" width="104" height="62" rx="20" fill="#1e1e2a"/>
        <rect x="28" y="55" width="104" height="62" rx="20" fill="url(#cfCtrlGrad)"/>
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
        <motion.circle cx="110" cy="70" r="7" fill="#ef4444" filter="url(#cfGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}/>
        <motion.circle cx="124" cy="79" r="7" fill="#3b82f6" filter="url(#cfGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.35 }}/>
        <motion.circle cx="110" cy="88" r="7" fill="#22c55e" filter="url(#cfGlow)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.7 }}/>
        <motion.circle cx="96" cy="79" r="7" fill="#f59e0b" filter="url(#cfGlow)"
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

/* ─── Top nav bar ─── */
function TopBar() {
  return (
    <div style={{
      padding: "12px 14px 10px",
      background: "#000000",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)", pointerEvents: "none" }} />
      <p style={{ color: "white", fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: 0.3 }}>Calculus Fest</p>
      <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, margin: 0 }}>Prove you are a calculus master</p>
    </div>
  );
}

/* ─── Cooldown Spinner ─── */
function CooldownSpinner() {
  return (
    <div style={{ position: "absolute", right: 12, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
      <motion.svg
        width="30" height="30" viewBox="0 0 30 30"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="15" cy="15" r="11" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="3"/>
        <path
          d="M 15 4 A 11 11 0 0 1 26 15"
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="15" cy="4" r="2" fill="#ef4444"/>
      </motion.svg>
    </div>
  );
}

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
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", overflow: "hidden" }}>
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
              <linearGradient id="cfBadgeGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a"/><stop offset="60%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
              <linearGradient id="cfBadgeInner" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#b45309"/>
              </linearGradient>
            </defs>
            <circle cx="140" cy="78" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="132" cy="108" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="110" cy="130" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="80" cy="138" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="50" cy="130" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="28" cy="108" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="20" cy="78" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="28" cy="48" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="50" cy="26" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="80" cy="18" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="110" cy="26" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="132" cy="48" r="14" fill="url(#cfBadgeGold)"/>
            <circle cx="80" cy="78" r="54" fill="url(#cfBadgeGold)"/>
            <circle cx="80" cy="78" r="42" fill="url(#cfBadgeInner)"/>
            <path d="M54 54 Q80 42 106 54" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" fill="none"/>
            <polyline points="62,78 75,93 102,65" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M63,132 L55,176 L80,160 L80,132 Z" fill="#dc2626"/>
            <path d="M97,132 L105,176 L80,160 L80,132 Z" fill="#ef4444"/>
            <rect x="57" y="128" width="46" height="14" rx="4" fill="#b91c1c"/>
          </svg>
        </motion.div>
      </div>

      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        style={{ color: "white", fontSize: 64, fontWeight: 900, margin: "4px 0 4px", letterSpacing: -2, lineHeight: 1 }}>
        {score}
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center", margin: "0 0 8px" }}>
        AXN earned this game
      </motion.p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
        style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", margin: "0 0 28px" }}>
        {claimState === "done" ? "✓ Reward added to your balance!" : "Watch an ad to claim your AXN reward"}
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        style={{ width: "100%", maxWidth: 300, marginBottom: 20 }}>
        {claimState !== "done" ? (
          <button onClick={handleClaim} disabled={claimState === "loading"} style={{
            position: "relative", width: "100%", padding: "16px 0", clipPath: CUT_SM,
            background: claimState === "loading" ? "rgba(124,58,237,0.4)" : "linear-gradient(90deg,#7c3aed,#9945ff)",
            border: "none", color: "white", fontSize: 16, fontWeight: 800,
            cursor: claimState === "loading" ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.3,
            touchAction: "manipulation",
          }}>
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
          <div style={{ position:"relative", width:"100%", padding:"16px 0", clipPath:CUT_SM, background:"rgba(34,197,94,0.18)", color:"#22c55e", fontSize:16, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(34,197,94,0.55)", borderRadius:1, ...s }} />)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{position:"relative",zIndex:1}}>Reward Claimed!</span>
          </div>
        )}
      </motion.div>

      {claimState === "done" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 16 }}>
          <button onClick={onHome} style={{ position:"relative", width:58, height:58, clipPath:CUT_SM, background:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.25)", borderRadius:1, ...s }} />)}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button onClick={onPlayAgain} style={{ position:"relative", width:58, height:58, clipPath:CUT_SM, background:"linear-gradient(135deg,#7c3aed,#9945ff)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.4)", borderRadius:1, ...s }} />)}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function CalculusFest() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  type Phase = "intro" | "sheet" | "countdown" | "playing" | "over" | "results";
  const [phase, setPhase] = useState<Phase>("intro");
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [countVal, setCountVal] = useState(3);

  const [question, setQuestion] = useState<Question>(makeQuestion);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [popupText, setPopupText] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardSent = useRef(false);
  const adShown = useRef(false);
  const [wrongCooldown, setWrongCooldown] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeCooldown = useRef(false);

  // Dynamic coin pair for each question — changes with every new question
  const [coinPair, setCoinPair] = useState(() => {
    const shuffled = [...QUESTION_COINS].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
  });

  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("hs_calculus") || "0"));
  useEffect(() => {
    if (phase === "results" || phase === "over") {
      setHighScore(prev => {
        const next = Math.max(prev, score);
        if (next > prev) localStorage.setItem("hs_calculus", String(next));
        return next;
      });
    }
  }, [phase]);

  const newQuestion = useCallback(() => {
    setQuestion(makeQuestion());
    setFeedback(null);
    setChosenIdx(null);
    // Pick new dynamic coin pair — avoid same pair as before
    setCoinPair(prev => {
      let shuffled = [...QUESTION_COINS].sort(() => Math.random() - 0.5);
      // Avoid same pair
      if (shuffled[0].name === prev[0].name && shuffled[1].name === prev[1].name) {
        shuffled = [...shuffled.slice(2), ...shuffled.slice(0, 2)];
      }
      return [shuffled[0], shuffled[1]];
    });
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setTimeLeft(TOTAL_TIME);
    rewardSent.current = false;
    adShown.current = false;
    newQuestion();
    setCountVal(3);
    setPhase("countdown");
  }, [newQuestion]);

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
    if (phase !== "playing") {
      if (cooldownRef.current) { clearInterval(cooldownRef.current); cooldownRef.current = null; }
      activeCooldown.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "over" && !adShown.current) {
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
    if (!isDevMode && typeof window.show_10401872 === "function") {
      try { await window.show_10401872({ type: "interstitial" }); } catch {}
    }
    if (score > 0) {
      rewardSent.current = true;
      await apiRequest("POST", "/api/game/calculus-fest/reward", { score });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [score, qc]);

  const handleAnswer = useCallback((choice: number, idx: number) => {
    if (feedback !== null || phase !== "playing" || activeCooldown.current) return;
    const isCorrect = choice === question.answer;
    setChosenIdx(idx);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      if (!muted) correctSnd();
      vib([30, 20, 40]);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setScore(s => s + REWARD_PER_CORRECT);
      setPopupText(`+${REWARD_PER_CORRECT} AXN`);
      setTimeout(() => setPopupText(null), 900);
      setTimeout(newQuestion, 500);
    } else {
      if (!muted) wrongSnd();
      vib(60);
      setStreak(0);
      setWrongIdx(idx);
      setWrongCooldown(3);
      activeCooldown.current = true;
      let count = 3;
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      cooldownRef.current = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          activeCooldown.current = false;
          setWrongCooldown(0);
          setWrongIdx(null);
          newQuestion();
        } else {
          setWrongCooldown(count);
        }
      }, 1000);
    }
  }, [feedback, phase, question, muted, streak, newQuestion]);

  const timerPct = timeLeft / TOTAL_TIME;

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
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <AnimatedGameController />
          <p style={{ color: "white", fontSize: 16, textAlign: "center", marginTop: 20, lineHeight: 1.55, fontWeight: 500 }}>
            You are about to start the quiz.<br/>As soon as you are ready,<br/>click the start button!
          </p>
          {highScore > 0 && (
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, background: "rgba(153,69,255,0.08)", border: "1px solid rgba(153,69,255,0.25)", borderRadius: 12, padding: "8px 20px" }}>
              <span style={{ fontSize: 17 }}>🏆</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600 }}>Best: <span style={{ color: "#9945ff", fontWeight: 900 }}>{highScore} AXN</span></span>
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
          <button onClick={startGame} style={{ position: "relative", width: "100%", padding: "16px 0", clipPath: CUT_SM, background: "linear-gradient(90deg,#7c3aed,#9945ff)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5, touchAction: "manipulation" }}>
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
                style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#000000", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
                <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Calculus Fest</p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>You have 60 seconds to solve math problems</p>
                <div style={{ background: "#12121e", borderRadius: 14, padding: "18px", marginBottom: 16 }}>
                  <p style={{ color: "#a78bfa", fontSize: 28, fontWeight: 900, textAlign: "center", margin: "0 0 14px" }}>7 × 8 = ?</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[42, 56, 63, 49].map((v, i) => (
                      <div key={i} style={{ padding: "10px 8px", borderRadius: 10, background: v === 56 ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)", border: `1px solid ${v === 56 ? "#22c55e" : "rgba(255,255,255,0.1)"}`, textAlign: "center" }}>
                        <span style={{ color: v === 56 ? "#22c55e" : "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                  Tap the correct answer.<br/>Each correct answer earns +{REWARD_PER_CORRECT} AXN!
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
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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

  /* ─── PLAYING / OVER ─── */
  return (
    <div style={{ height: "100dvh", background: "#000000", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar />

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 2px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AXNIcon size={22} />
          <span style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
          {streak >= 3 && <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>🔥 ×{streak}</span>}
        </div>
        <span style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Timer bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#7c3aed" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2, boxShadow: "0 0 8px currentColor" }}
        />
      </div>

      {/* Question card */}
      <div style={{ padding: "10px 14px 8px", flexShrink: 0 }}>
        <div style={{ position: "relative", clipPath: CUT_LG, background: "linear-gradient(145deg,#1c1c30,#12121e)", padding: "5vw 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          {QUEST_CORNERS.map((s, ci) => (
            <div key={ci} style={{ position: "absolute", background: "rgba(124,58,237,0.75)", borderRadius: 1, ...s }} />
          ))}
          {/* Dynamic coin — top right (changes each question) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={coinPair[0].name}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute", top: 12, right: 12,
                width: 46, height: 46, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${coinPair[0].bg}ee, ${coinPair[0].bg}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 16px ${coinPair[0].bg}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            >
              <span style={{ color: "white", fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{coinPair[0].symbol}</span>
            </motion.div>
          </AnimatePresence>
          {/* Dynamic coin — bottom left (changes each question) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={coinPair[1].name + "bl"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              style={{
                position: "absolute", bottom: 12, left: 12,
                width: 42, height: 42, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${coinPair[1].bg}ee, ${coinPair[1].bg}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 4px 16px ${coinPair[1].bg}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            >
              <span style={{ color: "white", fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{coinPair[1].symbol}</span>
            </motion.div>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={question.text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              style={{ color: "white", fontSize: "clamp(30px, 9vw, 50px)", fontWeight: 900, textAlign: "center", margin: 0, letterSpacing: -2, position: "relative", zIndex: 1 }}
            >
              {question.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Answer buttons */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "4px 14px 6px", gap: 8, minHeight: 0 }}>
        {question.choices.map((choice, idx) => {
          const isChosen = chosenIdx === idx;
          const isWrongChosen = wrongIdx === idx;
          const isCorrectChoice = choice === question.answer;
          const isCoolingDown = wrongCooldown > 0;

          let bg = "rgba(255,255,255,0.07)";
          let accentColor = "rgba(255,255,255,0.22)";
          let color = "rgba(255,255,255,0.92)";

          if (isWrongChosen) {
            bg = "rgba(239,68,68,0.18)"; accentColor = "rgba(239,68,68,0.7)"; color = "#ef4444";
          } else if (isChosen && feedback === "correct") {
            bg = "rgba(34,197,94,0.18)"; accentColor = "rgba(34,197,94,0.7)"; color = "#22c55e";
          } else if (isCorrectChoice && isCoolingDown) {
            bg = "rgba(34,197,94,0.09)"; accentColor = "rgba(34,197,94,0.35)"; color = "rgba(34,197,94,0.65)";
          }

          return (
            <motion.button
              key={idx}
              whileTap={isCoolingDown || feedback !== null ? {} : { scale: 0.985 }}
              onClick={() => handleAnswer(choice, idx)}
              style={{
                position: "relative", flex: 1, width: "100%", clipPath: CUT_SM,
                background: bg, border: "none", color,
                fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 900,
                cursor: isCoolingDown || feedback !== null ? "default" : "pointer",
                transition: "background 0.15s, color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
                touchAction: "manipulation",
              }}
            >
              {ANS_CORNERS.map((s, ci) => (
                <div key={ci} style={{ position: "absolute", background: accentColor, borderRadius: 1, ...s }} />
              ))}
              {/* Wrong X badge */}
              {isWrongChosen && (
                <div style={{ position: "absolute", left: 16, width: 26, height: 26, clipPath: "circle(50%)", background: "rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
              )}
              <span style={{ position: "relative", zIndex: 1 }}>{choice}</span>
              {/* Animated spinner cooldown (replaces numeric text) */}
              {isWrongChosen && wrongCooldown > 0 && <CooldownSpinner />}
            </motion.button>
          );
        })}
      </div>

      {/* Bottom controls */}
      <div style={{ padding: "4px 14px 20px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setMuted(m => !m)} style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
            cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation",
          }}>
            {muted
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
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
        <button onClick={() => setLocation("/game")} style={{ position: "relative", width: "100%", padding: "13px 0", clipPath: CUT_SM, background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, touchAction: "manipulation" }}>
          {BTN_CORNERS.map((s, i) => <div key={i} style={{ position: "absolute", background: "rgba(255,255,255,0.2)", borderRadius: 1, ...s }} />)}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      {/* Floating popup */}
      <AnimatePresence>
        {popupText && (
          <motion.div
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -60, opacity: 0, scale: 1.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            style={{ position: "fixed", top: "45%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 100, color: "#fbbf24", fontWeight: 900, fontSize: 20, textShadow: "0 2px 8px rgba(0,0,0,0.7)", whiteSpace: "nowrap" }}
          >
            {popupText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help overlay */}
      <AnimatePresence>
        {showHelp && (
          <>
            <div onClick={() => setShowHelp(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 49 }} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#000000", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto", clipPath: "polygon(0% 22px,22px 0%,calc(100% - 22px) 0%,100% 22px,100% 100%,0% 100%)" }}
            >
              <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)", margin: "8px auto 18px" }}/>
              <p style={{ color: "white", fontSize: 17, fontWeight: 700, textAlign: "center", margin: "0 0 6px" }}>Calculus Fest</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 18px" }}>Solve math problems before time runs out</p>
              <div style={{ position: "relative", clipPath: CUT_LG, background: "#12121e", padding: "16px", marginBottom: 14 }}>
                {QUEST_CORNERS.map((s, ci) => <div key={ci} style={{ position: "absolute", background: "rgba(124,58,237,0.5)", borderRadius: 1, ...s }} />)}
                <p style={{ color: "#a78bfa", fontSize: 26, fontWeight: 900, textAlign: "center", margin: "0 0 12px", position: "relative", zIndex: 1 }}>7 × 8 = ?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[42, 56, 63, 49].map((v, i) => (
                    <div key={i} style={{ position: "relative", clipPath: CUT_SM, background: v === 56 ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)", padding: "9px 12px", textAlign: "center" }}>
                      {ANS_CORNERS.map((s, ci) => <div key={ci} style={{ position: "absolute", background: v === 56 ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.15)", borderRadius: 1, ...s }} />)}
                      <span style={{ color: v === 56 ? "#22c55e" : "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 700, position: "relative", zIndex: 1 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Tap the correct answer. Each correct answer earns +{REWARD_PER_CORRECT} AXN!
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
