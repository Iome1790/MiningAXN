import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

/* ─── Audio ─── */
function playTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.16) {
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
function correctSound() { [660, 880].forEach((f, i) => setTimeout(() => playTone(f, 0.1), i * 60)); }
function wrongSound() { playTone(160, 0.15, "sawtooth", 0.13); }
function vib(p: number | number[]) { try { navigator.vibrate?.(p); } catch {} }

/* ─── Coins (decorative only) ─── */
const COINS = [
  { bg: "#f7931a", symbol: "₿" },
  { bg: "#627eea", symbol: "Ξ" },
  { bg: "#c91017", symbol: "▲" },
  { bg: "#c2a633", symbol: "Ð" },
  { bg: "#f0b90b", symbol: "B" },
  { bg: "#346aa9", symbol: "X" },
  { bg: "#9945ff", symbol: "S" },
  { bg: "#26a17b", symbol: "T" },
];

function CoinBadge({ idx, size }: { idx: number; size: number }) {
  const coin = COINS[idx % COINS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: coin.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 10px ${coin.bg}66` }}>
      <span style={{ color: "#fff", fontSize: size * 0.42, fontWeight: 900, lineHeight: 1 }}>{coin.symbol}</span>
    </div>
  );
}

/* ─── Question generator ─── */
interface Question { text: string; answer: number; choices: number[]; coinA: number; coinB: number; }

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function generateQuestion(): Question {
  const op = ["+", "-", "×"][Math.floor(Math.random() * 3)];
  let a: number, b: number, answer: number, text: string;

  if (op === "+") {
    a = Math.floor(Math.random() * 15) + 1;
    b = Math.floor(Math.random() * 15) + 1;
    answer = a + b; text = `${a} + ${b}`;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 15) + 6;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    answer = a - b; text = `${a} - ${b}`;
  } else {
    a = Math.floor(Math.random() * 8) + 2;
    b = Math.floor(Math.random() * 8) + 2;
    answer = a * b; text = `${a} × ${b}`;
  }

  const wrongs = new Set<number>();
  while (wrongs.size < 2) {
    const off = Math.floor(Math.random() * 7) + 1;
    const w = Math.random() > 0.5 ? answer + off : Math.max(0, answer - off);
    if (w !== answer) wrongs.add(w);
  }

  return {
    text, answer,
    choices: shuffle([answer, ...[...wrongs]]),
    coinA: Math.floor(Math.random() * COINS.length),
    coinB: Math.floor(Math.random() * COINS.length),
  };
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

/* ─── Top nav bar ─── */
function TopBar({ onBack, muted, onMute, onHelp }: { onBack: () => void; muted: boolean; onMute: () => void; onHelp: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 14px 10px", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div style={{ flex: 1 }}>
        <p style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Calculus Fest</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, margin: 0 }}>Prove you are a calculus master</p>
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

const TOTAL_TIME = 60;

export default function CalculusFest() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  type Phase = "intro" | "sheet" | "countdown" | "playing" | "over";
  const [phase, setPhase] = useState<Phase>("intro");
  const [muted, setMuted] = useState(false);
  const [countVal, setCountVal] = useState(3);

  const [question, setQuestion] = useState<Question>(() => generateQuestion());
  const [chosen, setChosen] = useState<number | null>(null);
  const [choiceState, setChoiceState] = useState<"idle" | "correct" | "wrong">("idle");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardSent = useRef(false);

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion());
    setChosen(null);
    setChoiceState("idle");
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(TOTAL_TIME);
    rewardSent.current = false;
    setQuestion(generateQuestion());
    setChosen(null);
    setChoiceState("idle");
    setCountVal(3);
    setPhase("countdown");
  }, []);

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

  /* reward */
  useEffect(() => {
    if (phase === "over" && !rewardSent.current && score > 0) {
      rewardSent.current = true;
      apiRequest("POST", "/api/game/calculus-fest/reward", { score })
        .then(() => qc.invalidateQueries({ queryKey: ["/api/auth/user"] }))
        .catch(() => {});
    }
  }, [phase, score, qc]);

  const handleAnswer = useCallback((val: number) => {
    if (choiceState !== "idle" || phase !== "playing") return;
    setChosen(val);
    if (val === question.answer) {
      setChoiceState("correct");
      setScore(s => s + 1);
      if (!muted) correctSound();
      vib([30, 20, 40]);
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 700);
      setTimeout(nextQuestion, 600);
    } else {
      setChoiceState("wrong");
      if (!muted) wrongSound();
      vib(80);
      setTimeout(nextQuestion, 700);
    }
  }, [choiceState, phase, question.answer, muted, nextQuestion]);

  const timerPct = timeLeft / TOTAL_TIME;

  /* ─── INTRO ─── */
  if (phase === "intro" || phase === "sheet") {
    return (
      <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column" }}>
        <TopBar onBack={() => setLocation("/game")} muted={muted} onMute={() => setMuted(m => !m)} onHelp={() => setPhase("sheet")} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <MegaphoneIllustration />
          </motion.div>
          <p style={{ color: "white", fontSize: 16, textAlign: "center", marginTop: 28, lineHeight: 1.55, fontWeight: 500 }}>
            You are about to start the quiz.<br/>As soon as you are ready,<br/>click the start button!
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", paddingBottom: 52, paddingTop: 12 }}>
          <button
            onClick={() => setPhase("sheet")}
            style={{ width: 68, height: 68, borderRadius: "50%", background: "#1e1e1e", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </button>
        </div>

        <AnimatePresence>
          {phase === "sheet" && (
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#222222", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
              <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Calculus Fest</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 22px" }}>Each board will start with a calculus question</p>

              {/* Demo question card */}
              <div style={{ position: "relative", background: "#1a1a1a", borderRadius: 16, padding: "28px 20px", border: "2px solid rgba(255,255,255,0.12)", marginBottom: 16 }}>
                <div style={{ position: "absolute", top: 12, right: 12 }}><CoinBadge idx={0} size={36}/></div>
                <div style={{ position: "absolute", bottom: 12, left: 12 }}><CoinBadge idx={3} size={28}/></div>
                <p style={{ color: "white", fontSize: 32, fontWeight: 900, textAlign: "center", margin: 0, letterSpacing: -1 }}>4 + 3 × 5</p>
              </div>

              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 14px" }}>
                Your goal is to answer correctly to each question.
              </p>

              {/* Demo answer buttons */}
              {[19, 35, 23].map(n => (
                <div key={n} style={{ background: "#1a1a1a", borderRadius: 12, padding: "14px 0", textAlign: "center", marginBottom: 8, border: "2px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ color: "white", fontSize: 20, fontWeight: 800 }}>{n}</span>
                </div>
              ))}

              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", margin: "14px 0 20px", lineHeight: 1.6 }}>
                Answer correctly the most questions you can<br/>and prove you are a calculus master!
              </p>

              <button
                onClick={startGame}
                style={{ width: "100%", padding: "15px 0", borderRadius: 14, background: "linear-gradient(90deg,#7c3aed,#9945ff)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}
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
            style={{ fontSize: 80, fontWeight: 900, color: "white", textAlign: "center" }}
          >
            {countVal === 0 ? "GO!" : countVal}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  /* ─── PLAYING ─── */
  return (
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column" }}>
      {/* Timer bar */}
      <div style={{ height: 4, background: "#2a2a2a", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#fff" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2 }}
        />
      </div>

      <TopBar onBack={() => setLocation("/game")} muted={muted} onMute={() => setMuted(m => !m)} onHelp={() => {}} />

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>A</span>
          </div>
          <span style={{ color: "white", fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
        </div>
        <span style={{ color: "white", fontSize: 30, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Question card */}
      <div style={{ padding: "0 14px 14px" }}>
        <div style={{ position: "relative", background: "#1e1e1e", borderRadius: 18, padding: "40px 24px", border: "2px solid rgba(255,255,255,0.1)" }}>
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            <CoinBadge idx={question.coinA} size={40}/>
          </div>
          <div style={{ position: "absolute", bottom: 14, left: 14 }}>
            <CoinBadge idx={question.coinB} size={32}/>
          </div>
          <p style={{ color: "white", fontSize: 42, fontWeight: 900, textAlign: "center", margin: 0, letterSpacing: -1.5 }}>{question.text}</p>
        </div>
      </div>

      {/* Answers */}
      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {question.choices.map((val) => {
          const isChosen = chosen === val;
          const isCorrect = val === question.answer;
          let bg = "#1e1e1e";
          let border = "2px solid rgba(255,255,255,0.1)";
          if (isChosen && choiceState === "correct") { bg = "rgba(34,197,94,0.15)"; border = "2px solid #22c55e"; }
          if (isChosen && choiceState === "wrong") { bg = "rgba(239,68,68,0.15)"; border = "2px solid #ef4444"; }
          if (!isChosen && choiceState === "wrong" && isCorrect) { bg = "rgba(34,197,94,0.08)"; border = "2px solid rgba(34,197,94,0.4)"; }

          return (
            <button
              key={val}
              onClick={() => handleAnswer(val)}
              style={{ width: "100%", padding: "18px 0", borderRadius: 14, background: bg, border, cursor: "pointer", transition: "all 0.18s" }}
            >
              <span style={{ color: "white", fontSize: 24, fontWeight: 800 }}>{val}</span>
            </button>
          );
        })}
      </div>

      {/* Score popup */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            style={{ position: "fixed", top: "40%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 100, color: "#22c55e", fontWeight: 900, fontSize: 20, textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
          >
            +1 AXN
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {phase === "over" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, gap: 10 }}
          >
            <p style={{ color: "white", fontSize: 18, fontWeight: 800, margin: 0 }}>Time&apos;s up!</p>
            <p style={{ color: "#9945ff", fontSize: 30, fontWeight: 900, margin: 0 }}>{score} AXN</p>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: 0 }}>Rewarded to your balance</p>
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              <button onClick={startGame} style={{ padding: "13px 28px", borderRadius: 12, background: "#7c3aed", border: "none", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Play Again</button>
              <button onClick={() => setLocation("/game")} style={{ padding: "13px 28px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Back</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
