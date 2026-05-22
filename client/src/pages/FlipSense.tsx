import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/* ─── Audio ─── */
function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.18) {
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
function ding() { playTone(880, 0.1); setTimeout(() => playTone(1100, 0.1), 70); }
function buzz() { playTone(110, 0.12, "sawtooth", 0.14); }
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
      background: coin.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 4px 18px ${coin.bg}66, 0 0 0 3px rgba(255,255,255,0.12)`,
    }}>
      <span style={{ color: coin.fg, fontSize: size * 0.4, fontWeight: 900, lineHeight: 1 }}>{coin.symbol}</span>
    </div>
  );
}

function CardBack({ size }: { size: number }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1e1e" }}>
      <div style={{ width: size * 0.52, height: size * 0.52, borderRadius: "50%", background: "linear-gradient(135deg,#2a2a2a,#111)", border: "2px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: size * 0.22, fontWeight: 900 }}>AXN</span>
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

/* ─── Megaphone SVG ─── */
function MegaphoneIllustration() {
  return (
    <svg width="160" height="140" viewBox="0 0 160 140" fill="none">
      <rect x="46" y="52" width="32" height="38" rx="5" fill="#8a9199"/>
      <path d="M78 46 L132 22 L132 118 L78 94 Z" fill="#6e7680"/>
      <path d="M78 46 L132 22 L132 38 L78 60 Z" fill="#5b7de8"/>
      <rect x="48" y="60" width="28" height="4" rx="2" fill="#6e7680"/>
      <rect x="48" y="68" width="28" height="4" rx="2" fill="#6e7680"/>
      <rect x="48" y="76" width="28" height="4" rx="2" fill="#6e7680"/>
      <rect x="58" y="90" width="12" height="22" rx="5" fill="#8a9199"/>
      <circle cx="132" cy="70" r="10" fill="none" stroke="#5b7de8" strokeWidth="3"/>
      <path d="M138 64 L144 56" stroke="#5b7de8" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M142 71 L150 71" stroke="#5b7de8" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M138 77 L144 84" stroke="#5b7de8" strokeWidth="2.5" strokeLinecap="round"/>
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

/* ─── Top nav bar ─── */
function TopBar({ onBack, muted, onMute, onHelp }: { onBack: () => void; muted: boolean; onMute: () => void; onHelp: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 14px 10px", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: 0, display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Flip Sense</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, margin: 0 }}>Match cards to earn some AXN</p>
      </div>
      <button onClick={onMute} style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {muted
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        }
      </button>
      <button onClick={onHelp} style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "white", fontSize: 15, fontWeight: 700 }}>?</span>
      </button>
    </div>
  );
}

/* ─── Floating popup ─── */
interface Popup { id: number; text: string; x: number; y: number; }

export default function FlipSense() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  type Phase = "intro" | "sheet" | "countdown" | "playing" | "over" | "done";
  const [phase, setPhase] = useState<Phase>("intro");
  const [muted, setMuted] = useState(false);
  const [countVal, setCountVal] = useState(3);

  /* game state */
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

  const currentRound = ROUND_SEQ[roundIdx] ?? ROUND_SEQ[ROUND_SEQ.length - 1];

  /* start a round */
  const startRound = useCallback((idx: number) => {
    const r = ROUND_SEQ[idx] ?? ROUND_SEQ[ROUND_SEQ.length - 1];
    setCards(makeCards(r.totalCards, r.pairs, r.hasWild));
    setFlippedIds([]);
    setLocked(false);
  }, []);

  /* begin countdown then play */
  const startGame = useCallback(() => {
    setRoundIdx(0);
    setScore(0);
    setTimeLeft(TOTAL_TIME);
    rewardSent.current = false;
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
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("over");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  /* send reward when game ends */
  useEffect(() => {
    if ((phase === "over" || phase === "done") && !rewardSent.current && score > 0) {
      rewardSent.current = true;
      apiRequest("POST", "/api/game/flip-sense/reward", { score })
        .then(() => qc.invalidateQueries({ queryKey: ["/api/auth/user"] }))
        .catch(() => {});
    }
  }, [phase, score, qc]);

  /* show popup */
  const showPopup = useCallback((text: string, cardEl?: HTMLElement) => {
    const x = cardEl ? cardEl.getBoundingClientRect().left + cardEl.offsetWidth / 2 : window.innerWidth / 2;
    const y = cardEl ? cardEl.getBoundingClientRect().top + cardEl.offsetHeight / 2 : window.innerHeight / 2;
    const id = popupId + 1;
    setPopupId(id);
    setPopups(p => [...p, { id, text, x, y }]);
    setTimeout(() => setPopups(p => p.filter(pp => pp.id !== id)), 900);
  }, [popupId]);

  /* card click */
  const handleCardClick = useCallback((cardId: number, el?: HTMLElement) => {
    if (locked || phase !== "playing") return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    if (card.wild) {
      if (!muted) ding();
      vib([30, 20, 40]);
      const gain = 3;
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
        const gain = 2;
        setScore(s => s + gain);
        showPopup(`+${gain} AXN`);
        setCards(cs => cs.map(c => newFlipped.includes(c.id) ? { ...c, matched: true, glow: true } : c));
        setFlippedIds([]);
        setLocked(false);

        /* check round complete */
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
  const totalRounds = ROUND_SEQ.length;
  const timerPct = timeLeft / TOTAL_TIME;

  /* ─── INTRO screen ─── */
  if (phase === "intro" || phase === "sheet") {
    return (
      <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column" }}>
        <TopBar onBack={() => setLocation("/game")} muted={muted} onMute={() => setMuted(m => !m)} onHelp={() => setPhase("sheet")} />

        {/* Megaphone area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <MegaphoneIllustration />
          </motion.div>
          <p style={{ color: "white", fontSize: 16, textAlign: "center", marginTop: 28, lineHeight: 1.55, fontWeight: 500 }}>
            You are about to start the match.<br/>As soon as you are ready,<br/>click the start button!
          </p>
        </div>

        {/* Play button */}
        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 52, paddingTop: 12 }}>
          <button
            onClick={() => setPhase("sheet")}
            style={{ width: 68, height: 68, borderRadius: "50%", background: "#1e1e1e", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        </div>

        {/* Instructions bottom sheet */}
        <AnimatePresence>
          {phase === "sheet" && (
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#222222", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
              <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Flip Sense</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>You have 60 seconds to flip cards...</p>

              {/* Wrong match demo */}
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 8 }}>
                <DemoCard coinId="BTC" bad={true} />
                <DemoCard coinId="ETH" bad={true} />
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 18px" }}>
                Your goal is to find the matching card pairs and complete the board.
              </p>

              {/* Correct match demo */}
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20 }}>
                <DemoCard coinId="BTC" bad={false} />
                <DemoCard coinId="BTC" bad={false} />
              </div>

              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 24px", lineHeight: 1.6 }}>
                The more cards you can match in the available time,<br/>the more AXN you will earn!
              </p>

              <button
                onClick={startGame}
                style={{ width: "100%", padding: "15px 0", borderRadius: 14, background: "linear-gradient(90deg,#e67e00,#f59e0b)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}
              >
                START GAME
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ─── COUNTDOWN ─── */
  if (phase === "countdown") {
    return (
      <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
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
  const finished = phase === "over" || phase === "done";

  return (
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Timer progress bar — very top */}
      <div style={{ height: 4, background: "#2a2a2a", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#fff" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2 }}
        />
      </div>

      {/* Top bar */}
      <TopBar onBack={() => setLocation("/game")} muted={muted} onMute={() => setMuted(m => !m)} onHelp={() => {}} />

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e67e00", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>A</span>
          </div>
          <span style={{ color: "white", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
        </div>
        <span style={{ color: "white", fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Round dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 10 }}>
        {ROUND_SEQ.map((_, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < roundIdx ? "#22c55e" : i === roundIdx ? "#f59e0b" : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Card grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: cols === 4 ? 7 : cols === 3 ? 9 : 12,
          width: "100%",
          maxWidth: 380,
        }}>
          {cards.map(card => (
            <motion.div
              key={card.id}
              animate={card.shake ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              style={{ aspectRatio: "3/4", perspective: 600, cursor: card.matched ? "default" : "pointer" }}
              onClick={(e) => handleCardClick(card.id, e.currentTarget as HTMLElement)}
            >
              <motion.div
                animate={{ rotateY: card.flipped || card.matched ? 180 : 0 }}
                transition={{ duration: 0.12, type: "tween" }}
                style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
              >
                {/* Back face */}
                <div style={{
                  position: "absolute", inset: 0,
                  borderRadius: cols === 4 ? 10 : cols === 3 ? 12 : 14,
                  border: "2px solid rgba(255,255,255,0.13)",
                  background: "#1e1e1e",
                  backfaceVisibility: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CardBack size={cols === 4 ? 60 : cols === 3 ? 80 : 110} />
                </div>
                {/* Front face */}
                <div style={{
                  position: "absolute", inset: 0,
                  borderRadius: cols === 4 ? 10 : cols === 3 ? 12 : 14,
                  border: card.matched ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.2)",
                  background: card.matched ? "rgba(34,197,94,0.06)" : "#1e1e1e",
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: card.glow ? `0 0 18px ${COINS.find(c => c.id === card.coinId)?.bg ?? "#fff"}44` : undefined,
                }}>
                  <CoinBadge coinId={card.coinId} size={cols === 4 ? 44 : cols === 3 ? 60 : 82} />
                  {card.wild && (
                    <div style={{ position: "absolute", top: 5, right: 6, fontSize: cols === 4 ? 10 : 13, fontWeight: 900, color: "#fbbf24" }}>★</div>
                  )}
                  {card.matched && (
                    <div style={{ position: "absolute", bottom: 5, right: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
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

      {/* Game over overlay */}
      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, gap: 12 }}
          >
            <p style={{ color: "white", fontSize: 18, fontWeight: 800, margin: 0 }}>{phase === "done" ? "Completed!" : "Time's up!"}</p>
            <p style={{ color: "#f59e0b", fontSize: 28, fontWeight: 900, margin: 0 }}>{score} AXN</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>Rewarded to your balance</p>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <button onClick={() => { setPhase("intro"); setScore(0); setTimeLeft(TOTAL_TIME); setRoundIdx(0); }} style={{ padding: "13px 28px", borderRadius: 12, background: "#e67e00", border: "none", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Play Again</button>
              <button onClick={() => setLocation("/game")} style={{ padding: "13px 28px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Back</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
