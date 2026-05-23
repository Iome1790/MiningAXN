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

/* ─── Audio — shared AudioContext singleton for reliable mobile playback ─── */
let _fsAudioCtx: AudioContext | null = null;
function getFsAudioCtx(): AudioContext {
  if (!_fsAudioCtx || _fsAudioCtx.state === "closed") {
    _fsAudioCtx = new AudioContext();
  }
  if (_fsAudioCtx.state === "suspended") {
    _fsAudioCtx.resume().catch(() => {});
  }
  return _fsAudioCtx;
}
function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.22) {
  try {
    const ctx = getFsAudioCtx();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch {}
}
function ding() { playTone(880, 0.12); setTimeout(() => playTone(1100, 0.13), 70); }
function buzz() { playTone(110, 0.15, "sawtooth", 0.18); }
function vib(p: number | number[]) { try { navigator.vibrate?.(p); } catch {} }

/* ─── Coins ─── */
const COINS = [
  { id: "BTC",  bg: "#f7931a", symbol: "₿",  fg: "#fff" },
  { id: "ETH",  bg: "#627eea", symbol: "Ξ",  fg: "#fff" },
  { id: "TRX",  bg: "#c91017", symbol: "▲",  fg: "#fff" },
  { id: "DOGE", bg: "#c2a633", symbol: "Ð",  fg: "#fff" },
  { id: "BNB",  bg: "#f3ba2f", symbol: "B",  fg: "#1a1200" },
  { id: "XRP",  bg: "#346aa9", symbol: "✕",  fg: "#fff" },
  { id: "LTC",  bg: "#345d9d", symbol: "Ł",  fg: "#fff" },
  { id: "SOL",  bg: "#9945ff", symbol: "◎",  fg: "#fff" },
];

function CoinBadge({ coinId, size }: { coinId: string; size: number }) {
  const coin = COINS.find(c => c.id === coinId) ?? COINS[0];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${coin.bg}ee, ${coin.bg}99)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 4px 20px ${coin.bg}55, 0 0 0 2px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
    }}>
      <span style={{ color: coin.fg, fontSize: size * 0.42, fontWeight: 900, lineHeight: 1 }}>{coin.symbol}</span>
    </div>
  );
}

function CardBack({ size }: { size: number }) {
  const m = Math.max(7, Math.round(size * 0.09));
  const cw = Math.max(9, Math.round(size * 0.15));
  const corners = [
    { top: m, left: m, borderRight: "none" as const, borderBottom: "none" as const, borderRadius: "3px 0 0 0" },
    { top: m, right: m, borderLeft: "none" as const, borderBottom: "none" as const, borderRadius: "0 3px 0 0" },
    { bottom: m, left: m, borderRight: "none" as const, borderTop: "none" as const, borderRadius: "0 0 0 3px" },
    { bottom: m, right: m, borderLeft: "none" as const, borderTop: "none" as const, borderRadius: "0 0 3px 0" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {corners.map((s, i) => (
        <div key={i} style={{ position: "absolute", width: cw, height: cw, border: "2px solid rgba(255,255,255,0.3)", ...s }} />
      ))}
      {/* AXN logo — ensure visibility with chrome style */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: size * 0.62, height: size * 0.62,
        background: "radial-gradient(circle at 40% 35%, rgba(230,126,0,0.25), rgba(230,126,0,0.08))",
        borderRadius: "50%",
        boxShadow: "0 0 16px rgba(230,126,0,0.4), 0 0 0 1px rgba(230,126,0,0.2)",
      }}>
        <img
          src="/axn-coin.jpg"
          alt="AXN"
          style={{
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: "50%",
            objectFit: "cover",
            filter: "drop-shadow(0 0 6px rgba(230,126,0,0.8)) brightness(1.15)",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Round sequence ─── */
const ROUND_SEQ = [
  { totalCards: 4,  pairs: 2, hasWild: false },
  { totalCards: 4,  pairs: 2, hasWild: false },
  { totalCards: 4,  pairs: 2, hasWild: false },
  { totalCards: 9,  pairs: 4, hasWild: true  },
  { totalCards: 9,  pairs: 4, hasWild: true  },
  { totalCards: 9,  pairs: 4, hasWild: true  },
  { totalCards: 16, pairs: 8, hasWild: false },
  { totalCards: 16, pairs: 8, hasWild: false },
  { totalCards: 16, pairs: 8, hasWild: false },
];

const TOTAL_TIME = 60;

interface Card {
  id: number;
  coinId: string;
  flipped: boolean;
  matched: boolean;
  wild: boolean;
  shake: boolean;
  glow: boolean;
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function makeCards(totalCards: number, pairs: number, hasWild: boolean): Card[] {
  const available = shuffle(COINS).slice(0, pairs);
  let entries: { coinId: string; wild: boolean }[] = [];
  available.forEach(c => { entries.push({ coinId: c.id, wild: false }); entries.push({ coinId: c.id, wild: false }); });
  while (entries.length < totalCards) entries.push({ coinId: available[0].id, wild: true });
  entries = shuffle(entries.slice(0, totalCards));
  return entries.map((e, i) => ({ id: i, coinId: e.coinId, wild: e.wild, flipped: false, matched: false, shake: false, glow: false }));
}

function getGrid(total: number) {
  if (total === 4)  return { cols: 2, rows: 2 };
  if (total === 9)  return { cols: 3, rows: 3 };
  return { cols: 4, rows: 4 };
}

/* ─── Animated Game Controller (replaces megaphone) ─── */
function AnimatedGameController() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="fsCtrlGrad" x1="30" y1="58" x2="130" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </linearGradient>
        <filter id="fsGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <motion.g
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        {/* Shadow glow under controller */}
        <ellipse cx="80" cy="125" rx="38" ry="6" fill="rgba(230,126,0,0.18)" filter="url(#fsGlow)"/>
        {/* Controller body */}
        <rect x="28" y="55" width="104" height="62" rx="20" fill="#1e1e2a"/>
        <rect x="28" y="55" width="104" height="62" rx="20" fill="url(#fsCtrlGrad)"/>
        <rect x="28" y="55" width="104" height="62" rx="20" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"/>
        {/* Chrome top highlight */}
        <path d="M48 57 Q80 54 112 57" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Left grip */}
        <rect x="28" y="88" width="22" height="32" rx="11" fill="#181820"/>
        <rect x="28" y="88" width="22" height="32" rx="11" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
        {/* Right grip */}
        <rect x="110" y="88" width="22" height="32" rx="11" fill="#181820"/>
        <rect x="110" y="88" width="22" height="32" rx="11" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none"/>
        {/* Left joystick */}
        <circle cx="56" cy="95" r="11" fill="#2a2a38"/>
        <circle cx="56" cy="95" r="7" fill="#333344"/>
        <circle cx="56" cy="95" r="3.5" fill="#444458"/>
        {/* D-pad */}
        <rect x="42" y="72" width="7" height="20" rx="2.5" fill="rgba(255,255,255,0.2)"/>
        <rect x="36" y="78" width="19" height="7" rx="2.5" fill="rgba(255,255,255,0.2)"/>
        {/* Right joystick */}
        <circle cx="100" cy="83" r="9" fill="#2a2a38"/>
        <circle cx="100" cy="83" r="5.5" fill="#333344"/>
        <circle cx="100" cy="83" r="2.5" fill="#444458"/>
        {/* Buttons */}
        <motion.circle cx="110" cy="70" r="7" fill="#ef4444" filter="url(#fsGlow)"
          animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
        />
        <motion.circle cx="124" cy="79" r="7" fill="#3b82f6" filter="url(#fsGlow)"
          animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.35 }}
        />
        <motion.circle cx="110" cy="88" r="7" fill="#22c55e" filter="url(#fsGlow)"
          animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.7 }}
        />
        <motion.circle cx="96" cy="79" r="7" fill="#f59e0b" filter="url(#fsGlow)"
          animate={{ scale: [1, 1.15, 1], opacity: [1, 0.8, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 1.05 }}
        />
        {/* Button symbols */}
        <text x="110" y="73.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">✕</text>
        <text x="124" y="82.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">○</text>
        <text x="110" y="91.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">△</text>
        <text x="96" y="82.5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="7" fontWeight="900">□</text>
        {/* Center button */}
        <circle cx="80" cy="86" r="9" fill="#1a1a28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <circle cx="80" cy="86" r="6" fill="#222230"/>
        {/* Start/Select */}
        <rect x="67" y="71" width="7" height="4" rx="2" fill="rgba(255,255,255,0.18)"/>
        <rect x="86" y="71" width="7" height="4" rx="2" fill="rgba(255,255,255,0.18)"/>
        {/* Pulse ring on red button */}
        <motion.circle cx="110" cy="70" fill="none" stroke="#ef4444" strokeWidth="1"
          initial={{ r: 9, opacity: 0.5 }}
          animate={{ r: [9, 14, 9], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
        />
      </motion.g>
    </svg>
  );
}

/* ─── Instruction demo cards ─── */
function DemoCard({ coinId, bad }: { coinId: string; bad?: boolean }) {
  const coin = COINS.find(c => c.id === coinId) ?? COINS[0];
  return (
    <div style={{ width: 68, height: 88, borderRadius: 10, background: "#1e1e1e", border: "2px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: coin.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: coin.fg, fontSize: 18, fontWeight: 900 }}>{coin.symbol}</span>
      </div>
      {bad !== undefined && (
        <div style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: bad ? "#ef4444" : "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{bad ? "✕" : "✓"}</span>
        </div>
      )}
    </div>
  );
}

const CUT_SM = 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)';
const BTN_CORNERS = [
  {top:'1px',left:'12px',width:'18px',height:'1.5px'},{top:'12px',left:'1px',width:'1.5px',height:'18px'},
  {top:'1px',right:'12px',width:'18px',height:'1.5px'},{top:'12px',right:'1px',width:'1.5px',height:'18px'},
  {bottom:'1px',left:'12px',width:'18px',height:'1.5px'},{bottom:'12px',left:'1px',width:'1.5px',height:'18px'},
  {bottom:'1px',right:'12px',width:'18px',height:'1.5px'},{bottom:'12px',right:'1px',width:'1.5px',height:'18px'},
] as const;

/* ─── Top nav bar ─── */
function TopBar() {
  return (
    <div style={{
      padding: "12px 14px 10px",
      background: "linear-gradient(180deg, #1a1a1e 0%, #141416 100%)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
      position: "relative",
    }}>
      {/* Chrome shimmer */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)", pointerEvents: "none" }} />
      <p style={{ color: "white", fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: 0.3 }}>Flip Axionet</p>
      <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, margin: 0 }}>Match cards to earn some AXN</p>
    </div>
  );
}

/* ─── Floating popup ─── */
interface Popup { id: number; text: string; x: number; y: number; }

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
              <linearGradient id="fsBadgeGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a"/><stop offset="60%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
              <linearGradient id="fsBadgeInner" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#b45309"/>
              </linearGradient>
            </defs>
            <circle cx="140" cy="78" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="132" cy="108" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="110" cy="130" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="80" cy="138" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="50" cy="130" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="28" cy="108" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="20" cy="78" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="28" cy="48" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="50" cy="26" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="80" cy="18" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="110" cy="26" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="132" cy="48" r="14" fill="url(#fsBadgeGold)"/>
            <circle cx="80" cy="78" r="54" fill="url(#fsBadgeGold)"/>
            <circle cx="80" cy="78" r="42" fill="url(#fsBadgeInner)"/>
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
        style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textAlign: "center", margin: "0 0 8px", lineHeight: 1.5 }}
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

      {/* Claim button */}
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
              position: "relative",
              width: "100%",
              padding: "16px 0",
              clipPath: CUT_SM,
              background: claimState === "loading"
                ? "rgba(230,126,0,0.4)"
                : "linear-gradient(90deg,#e67e00,#f59e0b)",
              border: "none",
              color: "white",
              fontSize: 16,
              fontWeight: 800,
              cursor: claimState === "loading" ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              letterSpacing: 0.3,
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
          <div style={{ position:"relative", width: "100%", padding: "16px 0", clipPath: CUT_SM, background: "rgba(34,197,94,0.18)", color: "#22c55e", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(34,197,94,0.55)", borderRadius:1, ...s }} />)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style={{position:"relative",zIndex:1}}>Reward Claimed!</span>
          </div>
        )}
      </motion.div>

      {/* Home + Replay — only after claim */}
      {claimState === "done" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", gap: 16 }}
        >
          <button
            onClick={onHome}
            style={{ position:"relative", width: 58, height: 58, clipPath: CUT_SM, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}
          >
            {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.25)", borderRadius:1, ...s }} />)}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"relative",zIndex:1}}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button
            onClick={onPlayAgain}
            style={{ position:"relative", width: 58, height: 58, clipPath: CUT_SM, background: "linear-gradient(135deg,#e67e00,#f59e0b)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}
          >
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

export default function FlipSense() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  type Phase = "intro" | "sheet" | "countdown" | "playing" | "over" | "done" | "results";
  const [phase, setPhase] = useState<Phase>("intro");
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [countVal, setCountVal] = useState(3);

  const [roundIdx, setRoundIdx] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState(0);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardSent = useRef(false);
  const adShown = useRef(false);

  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("hs_flip") || "0"));
  useEffect(() => {
    if (phase === "results" || phase === "over" || phase === "done") {
      setHighScore(prev => {
        const next = Math.max(prev, score);
        if (next > prev) localStorage.setItem("hs_flip", String(next));
        return next;
      });
    }
  }, [phase]);

  const currentRound = ROUND_SEQ[roundIdx] ?? ROUND_SEQ[ROUND_SEQ.length - 1];

  const startRound = useCallback((idx: number) => {
    const r = ROUND_SEQ[idx] ?? ROUND_SEQ[ROUND_SEQ.length - 1];
    setCards(makeCards(r.totalCards, r.pairs, r.hasWild));
    setFlippedIds([]);
    setLocked(false);
  }, []);

  const startGame = useCallback(() => {
    setRoundIdx(0);
    setScore(0);
    setTimeLeft(TOTAL_TIME);
    rewardSent.current = false;
    adShown.current = false;
    startRound(0);
    setCountVal(3);
    setPhase("countdown");
  }, [startRound]);

  /* countdown */
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countVal <= 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCountVal(v => v - 1), 900);
    return () => clearTimeout(t);
  }, [phase, countVal]);

  /* timer */
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

  /* ad + results (reward only on claim) */
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
    if (!isDevMode && typeof window.show_10401872 === "function") {
      try { await window.show_10401872({ type: "interstitial" }); } catch {}
    }
    if (score > 0) {
      rewardSent.current = true;
      await apiRequest("POST", "/api/game/flip-sense/reward", { score });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [score, qc]);

  const showPopup = useCallback((text: string, cardEl?: HTMLElement) => {
    const x = cardEl ? cardEl.getBoundingClientRect().left + cardEl.offsetWidth / 2 : window.innerWidth / 2;
    const y = cardEl ? cardEl.getBoundingClientRect().top + cardEl.offsetHeight / 2 : window.innerHeight / 2;
    const id = popupId + 1;
    setPopupId(id);
    setPopups(p => [...p, { id, text, x, y }]);
    setTimeout(() => setPopups(p => p.filter(pp => pp.id !== id)), 900);
  }, [popupId]);

  const handleCardClick = useCallback((cardId: number, el?: HTMLElement) => {
    if (locked || phase !== "playing") return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    if (card.wild) {
      if (!muted) ding();
      vib([30, 20, 40]);
      const gain = 4;
      setScore(s => s + gain);
      showPopup(`+${gain} AXN`);
      setCards(cs => cs.map(c => c.id === cardId ? { ...c, matched: true, glow: true } : c));
      return;
    }

    const newFlipped = [...flippedIds, cardId];
    setCards(cs => cs.map(c => c.id === cardId ? { ...c, flipped: true } : c));
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [a, b] = newFlipped.map(id => cards.find(c => c.id === id)!);
      if (a.coinId === b.coinId) {
        if (!muted) ding();
        vib([30, 20, 40]);
        const gain = 4;
        setScore(s => s + gain);
        showPopup(`+${gain} AXN`);
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, matched: true, glow: true } : c));
        setFlippedIds([]);
        setLocked(false);

        setTimeout(() => {
          setCards(cs => {
            const allMatched = cs.every(c => c.matched || c.wild);
            if (allMatched) {
              const nextIdx = roundIdx + 1;
              if (nextIdx >= ROUND_SEQ.length) {
                setPhase("done");
              } else {
                setRoundIdx(nextIdx);
                startRound(nextIdx);
              }
            }
            return cs;
          });
        }, 350);
      } else {
        if (!muted) buzz();
        vib(60);
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, shake: true } : c));
        setTimeout(() => {
          setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false, shake: false } : c));
          setFlippedIds([]);
          setLocked(false);
        }, 700);
      }
    }
  }, [cards, flippedIds, locked, phase, muted, roundIdx, showPopup, startRound]);

  const { cols } = getGrid(currentRound.totalCards);
  const timerPct = timeLeft / TOTAL_TIME;

  /* ─── RESULTS screen ─── */
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

  /* ─── INTRO screen ─── */
  if (phase === "intro" || phase === "sheet") {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column" }}>
        <TopBar />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <AnimatedGameController />
          <p style={{ color: "white", fontSize: 16, textAlign: "center", marginTop: 20, lineHeight: 1.55, fontWeight: 500 }}>
            You are about to start the match.<br/>As soon as you are ready,<br/>click the start button!
          </p>
          {highScore > 0 && (
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "8px 20px" }}>
              <span style={{ fontSize: 17 }}>🏆</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600 }}>Best: <span style={{ color: "#f59e0b", fontWeight: 900 }}>{highScore} AXN</span></span>
            </div>
          )}
        </div>
        <div style={{ padding: "0 24px 36px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {/* Sound button — circular gaming style */}
            <button onClick={() => setMuted(m => !m)} style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              touchAction: "manipulation",
            }}>
              {muted
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            {/* Help button — circular gaming style */}
            <button onClick={() => setPhase("sheet")} style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
              cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              touchAction: "manipulation",
            }}>
              <span style={{ color: "white", fontSize: 17, fontWeight: 800, fontFamily: "monospace" }}>?</span>
            </button>
          </div>
          <button onClick={async () => {
            const isDevMode = import.meta.env.DEV || import.meta.env.MODE === "development";
            if (!isDevMode && typeof window.show_10401872 === "function") {
              try { await window.show_10401872({ type: "interstitial" }); } catch {}
            }
            startGame();
          }} style={{ position: "relative", width: "100%", padding: "16px 0", clipPath: CUT_SM, background: "linear-gradient(90deg,#e67e00,#f59e0b)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5, touchAction: "manipulation" }}>
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
                <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Flip Axionet</p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>You have 60 seconds to flip cards...</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 }}>
                  <DemoCard coinId="BTC" bad={true} />
                  <DemoCard coinId="ETH" bad={true} />
                </div>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 18px" }}>
                  Your goal is to find the matching card pairs and complete the board.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                  <DemoCard coinId="BTC" bad={false} />
                  <DemoCard coinId="BTC" bad={false} />
                </div>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                  Each matched pair earns you +4 AXN.<br/>The more you match, the more you earn!
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

  /* ─── PLAYING / OVER / DONE ─── */
  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar />

      {/* Score + time row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AXNIcon size={24} />
          <span style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
        </div>
        <span style={{ color: "white", fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Timer progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", flexShrink: 0, margin: "0 0 4px" }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#e67e00" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2, boxShadow: timerPct > 0.4 ? "0 0 8px rgba(230,126,0,0.5)" : "0 0 8px rgba(239,68,68,0.5)" }}
        />
      </div>

      {/* Round dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 6 }}>
        {ROUND_SEQ.map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < roundIdx ? "#22c55e" : i === roundIdx ? "#f59e0b" : "rgba(255,255,255,0.12)", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Card grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 14px 155px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: cols === 4 ? 10 : cols === 3 ? 12 : 16,
          width: "100%",
          maxWidth: 400,
        }}>
          {cards.map(card => {
            const coin = COINS.find(c => c.id === card.coinId) ?? COINS[0];
            const symSize = cols === 4 ? 26 : cols === 3 ? 36 : 52;
            const nameSize = cols === 4 ? 8 : cols === 3 ? 10 : 13;
            const accentColor = card.matched ? "#22c55e" : coin.bg;
            const bracketBorder = card.matched ? "rgba(34,197,94,0.6)" : `${coin.bg}88`;

            return (
              <motion.div
                key={card.id}
                animate={card.shake ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  aspectRatio: "3/4",
                  perspective: 600,
                  cursor: card.matched ? "default" : "pointer",
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  userSelect: "none",
                }}
                onClick={(e) => handleCardClick(card.id, e.currentTarget as HTMLElement)}
              >
                {/* Outer glow/border wrapper */}
                <div style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  background: card.matched ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.16)",
                  padding: 2,
                  boxShadow: card.glow
                    ? `0 0 24px ${COINS.find(c => c.id === card.coinId)?.bg ?? "#fff"}66, 0 4px 16px rgba(0,0,0,0.6)`
                    : "0 4px 16px rgba(0,0,0,0.55)",
                  transition: "background 0.3s, box-shadow 0.3s",
                }}>
                  <motion.div
                    animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
                    transition={{ duration: 0.2, type: "tween", ease: "easeInOut" }}
                    style={{
                      width: "100%", height: "100%", position: "relative",
                      transformStyle: "preserve-3d",
                      borderRadius: 10,
                    }}
                  >
                    {/* Back face */}
                    <div style={{
                      position: "absolute", inset: 0,
                      borderRadius: 10,
                      background: "linear-gradient(145deg, #1e1e2a, #141420)",
                      WebkitBackfaceVisibility: "hidden",
                      backfaceVisibility: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      <CardBack size={cols === 4 ? 56 : cols === 3 ? 74 : 106} />
                    </div>
                    {/* Front face */}
                    <div style={{
                      position: "absolute", inset: 0,
                      borderRadius: 10,
                      background: card.matched
                        ? "linear-gradient(160deg, #0a2214 0%, #061509 100%)"
                        : `linear-gradient(160deg, ${coin.bg}30 0%, ${coin.bg}0c 60%, #0e0e18 100%)`,
                      WebkitBackfaceVisibility: "hidden",
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                      gap: 4,
                    }}>
                      {/* Top accent bar */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, opacity: 0.9 }} />
                      {/* Corner L-brackets */}
                      {[
                        { top: 5, left: 5, borderRight: "none" as const, borderBottom: "none" as const, borderRadius: "3px 0 0 0" },
                        { top: 5, right: 5, borderLeft: "none" as const, borderBottom: "none" as const, borderRadius: "0 3px 0 0" },
                        { bottom: 5, left: 5, borderRight: "none" as const, borderTop: "none" as const, borderRadius: "0 0 0 3px" },
                        { bottom: 5, right: 5, borderLeft: "none" as const, borderTop: "none" as const, borderRadius: "0 0 3px 0" },
                      ].map((s, i) => (
                        <div key={i} style={{ position: "absolute", width: 10, height: 10, border: `1.5px solid ${bracketBorder}`, ...s }} />
                      ))}
                      {/* Big symbol */}
                      <span style={{
                        fontSize: symSize, fontWeight: 900, lineHeight: 1,
                        color: accentColor,
                        textShadow: `0 0 20px ${accentColor}77`,
                        position: "relative", zIndex: 1,
                      }}>{coin.symbol}</span>
                      {/* Coin name tag */}
                      <span style={{
                        fontSize: nameSize, fontWeight: 800, letterSpacing: 1.5,
                        color: card.matched ? "rgba(34,197,94,0.8)" : "rgba(255,255,255,0.6)",
                        textTransform: "uppercase", position: "relative", zIndex: 1,
                        background: `${accentColor}20`,
                        padding: "1px 5px",
                        borderRadius: 2,
                      }}>{coin.id}</span>
                      {/* Wild star */}
                      {card.wild && (
                        <div style={{ position: "absolute", top: 5, right: 7, fontSize: cols === 4 ? 10 : 13, fontWeight: 900, color: "#fbbf24" }}>★</div>
                      )}
                      {/* Match checkmark */}
                      {card.matched && (
                        <div style={{ position: "absolute", bottom: 5, right: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating popups */}
      {popups.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -55, opacity: 0 }}
          transition={{ duration: 0.85 }}
          style={{ position: "fixed", left: p.x, top: p.y, transform: "translateX(-50%)", pointerEvents: "none", zIndex: 100, color: "#fbbf24", fontWeight: 900, fontSize: 17, textShadow: "0 2px 8px rgba(0,0,0,0.7)", whiteSpace: "nowrap" }}
        >
          {p.text}
        </motion.div>
      ))}

      {/* Bottom controls during game */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, padding: "20px 20px 28px", background: "linear-gradient(0deg,rgba(13,13,15,1) 60%,rgba(13,13,15,0) 100%)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setMuted(m => !m)} style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)",
            cursor: "pointer", width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "manipulation",
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
            display: "flex", alignItems: "center", justifyContent: "center",
            touchAction: "manipulation",
          }}>
            <span style={{ color: "white", fontSize: 17, fontWeight: 800, fontFamily: "monospace" }}>?</span>
          </button>
        </div>
        <button onClick={() => setLocation("/game")} style={{ position: "relative", width: "100%", padding: "13px 0", clipPath: CUT_SM, background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, touchAction: "manipulation" }}>
          {BTN_CORNERS.map((s,i) => <div key={i} style={{ position:"absolute", background:"rgba(255,255,255,0.2)", borderRadius:1, ...s }} />)}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      {/* Help overlay during game */}
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
              <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Flip Axionet</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>You have 60 seconds to flip cards...</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 }}>
                <DemoCard coinId="BTC" bad={true} />
                <DemoCard coinId="ETH" bad={true} />
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 18px" }}>
                Your goal is to find the matching card pairs and complete the board.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                <DemoCard coinId="BTC" bad={false} />
                <DemoCard coinId="BTC" bad={false} />
              </div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                Each matched pair earns you +4 AXN.<br/>The more you match, the more you earn!
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
