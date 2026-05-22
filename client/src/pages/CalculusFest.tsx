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

/* ─── Question generation ─── */
interface Question { text: string; answer: number; choices: number[]; }

function makeQuestion(): Question {
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

const TOTAL_TIME = 60;
const REWARD_PER_CORRECT = 4;

/* ─── Megaphone: full float animation ─── */
function MegaphoneIllustration() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" style={{ overflow: "visible" }}>
      <motion.g
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      >
        {/* Body */}
        <rect x="46" y="52" width="32" height="38" rx="5" fill="#8a9199"/>
        <rect x="48" y="60" width="28" height="4" rx="2" fill="#6e7680"/>
        <rect x="48" y="68" width="28" height="4" rx="2" fill="#6e7680"/>
        <rect x="48" y="76" width="28" height="4" rx="2" fill="#6e7680"/>
        <rect x="58" y="90" width="12" height="22" rx="5" fill="#8a9199"/>
        {/* Horn */}
        <path d="M78 46 L132 22 L132 118 L78 94 Z" fill="#6e7680"/>
        <path d="M78 46 L132 22 L132 38 L78 60 Z" fill="#7c3aed"/>
        <circle cx="132" cy="70" r="10" fill="none" stroke="#7c3aed" strokeWidth="3"/>
        {/* Sound waves */}
        <motion.path d="M138 64 L144 56" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0 }}
        />
        <motion.path d="M142 71 L150 71" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.3 }}
        />
        <motion.path d="M138 77 L144 84" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.6 }}
        />
      </motion.g>
    </svg>
  );
}

/* ─── Top nav bar ─── */
function TopBar() {
  return (
    <div style={{ padding: "12px 14px 10px", background: "linear-gradient(180deg,#1e1e1e 0%,#181818 100%)", borderBottom: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
      <p style={{ color: "white", fontSize: 16, fontWeight: 900, margin: 0, letterSpacing: 0.2 }}>Calculus Fest</p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0 }}>Prove you are a calculus master</p>
    </div>
  );
}

/* ─── Results screen ─── */
function ResultsScreen({ score, onPlayAgain, onHome }: { score: number; onPlayAgain: () => void; onHome: () => void }) {
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
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", overflow: "hidden" }}>
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
        AXN earned
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, textAlign: "center", margin: "0 0 36px" }}
      >
        Congratulations! Rewarded to your balance.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ display: "flex", gap: 16 }}
      >
        <button
          onClick={onHome}
          style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </button>
        <button
          onClick={onPlayAgain}
          style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
          </svg>
        </button>
      </motion.div>
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

  /* reward + ad + results */
  useEffect(() => {
    if (phase === "over" && !adShown.current) {
      adShown.current = true;
      if (score > 0 && !rewardSent.current) {
        rewardSent.current = true;
        apiRequest("POST", "/api/game/calculus-fest/reward", { score })
          .then(() => qc.invalidateQueries({ queryKey: ["/api/auth/user"] }))
          .catch(() => {});
      }
      const goToResults = () => setPhase("results");
      const isDevMode = import.meta.env.DEV || import.meta.env.MODE === "development";
      if (!isDevMode && typeof window.show_10401872 === "function") {
        window.show_10401872({ type: "interstitial" }).then(goToResults).catch(goToResults);
      } else {
        setTimeout(goToResults, 300);
      }
    }
  }, [phase, score, qc]);

  const handleAnswer = useCallback((choice: number, idx: number) => {
    if (feedback || phase !== "playing") return;
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
      setTimeout(newQuestion, 700);
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
      />
    );
  }

  /* ─── INTRO ─── */
  if (phase === "intro" || phase === "sheet") {
    return (
      <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column" }}>
        <TopBar />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
          <MegaphoneIllustration />
          <p style={{ color: "white", fontSize: 16, textAlign: "center", marginTop: 28, lineHeight: 1.55, fontWeight: 500 }}>
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
            <button onClick={() => setMuted(m => !m)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {muted
                ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
            <button onClick={() => setPhase("sheet")} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>?</span>
            </button>
          </div>
          <button onClick={startGame} style={{ width: "100%", padding: "15px 0", borderRadius: 14, background: "linear-gradient(90deg,#7c3aed,#9945ff)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}>
            START GAME
          </button>
          <button onClick={() => setLocation("/game")} style={{ width: "100%", padding: "13px 0", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>

        <AnimatePresence>
          {phase === "sheet" && (
            <>
              <div
                onClick={() => setPhase("intro")}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 49 }}
              />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#222222", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
                <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Calculus Fest</p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>You have 60 seconds to solve math problems</p>
                <div style={{ background: "#1a1a2e", borderRadius: 14, padding: "18px", marginBottom: 16 }}>
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

  /* ─── PLAYING / OVER ─── */
  return (
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <TopBar />

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AXNIcon size={28} />
          <span style={{ color: "white", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
          {streak >= 3 && (
            <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>🔥 ×{streak}</span>
          )}
        </div>
        <span style={{ color: "white", fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Timer bar — below score row */}
      <div style={{ height: 4, background: "#2a2a2a", flexShrink: 0, margin: "0 0 10px" }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#7c3aed" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2 }}
        />
      </div>

      {/* Question card */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 380, background: "linear-gradient(135deg, #1a1a2e, #12121e)", borderRadius: 20, padding: "28px 24px", border: "1px solid rgba(124,58,237,0.3)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={question.text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              style={{ color: "#c4b5fd", fontSize: 34, fontWeight: 900, textAlign: "center", margin: 0, letterSpacing: -1 }}
            >
              {question.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Answer grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%", maxWidth: 380 }}>
          {question.choices.map((choice, idx) => {
            const isChosen = chosenIdx === idx;
            const isCorrectChoice = choice === question.answer;
            let bg = "rgba(255,255,255,0.06)";
            let border = "1px solid rgba(255,255,255,0.1)";
            let color = "rgba(255,255,255,0.85)";
            if (feedback) {
              if (isChosen && feedback === "correct") { bg = "rgba(34,197,94,0.2)"; border = "2px solid #22c55e"; color = "#22c55e"; }
              else if (isChosen && feedback === "wrong") { bg = "rgba(239,68,68,0.2)"; border = "2px solid #ef4444"; color = "#ef4444"; }
              else if (isCorrectChoice && feedback === "wrong") { bg = "rgba(34,197,94,0.15)"; border = "1.5px solid rgba(34,197,94,0.6)"; color = "rgba(34,197,94,0.8)"; }
            }
            return (
              <motion.button
                key={idx}
                whileTap={feedback ? {} : { scale: 0.95 }}
                onClick={() => handleAnswer(choice, idx)}
                style={{ padding: "20px 12px", borderRadius: 16, background: bg, border, color, fontSize: 24, fontWeight: 900, cursor: feedback ? "default" : "pointer", transition: "all 0.15s", boxShadow: "0 2px 10px rgba(0,0,0,0.3)", letterSpacing: -0.5 }}
              >
                {choice}
              </motion.button>
            );
          })}
        </div>
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

      {/* Bottom controls during game */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, padding: "20px 20px 28px", background: "linear-gradient(0deg,rgba(17,17,17,1) 60%,rgba(17,17,17,0) 100%)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setMuted(m => !m)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {muted
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            }
          </button>
          <button onClick={() => setShowHelp(true)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>?</span>
          </button>
        </div>
        <button onClick={() => setLocation("/game")} style={{ width: "100%", padding: "13px 0", borderRadius: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#222222", borderRadius: "22px 22px 0 0", padding: "12px 20px 36px", zIndex: 50, maxHeight: "82vh", overflowY: "auto" }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" }}/>
              <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Calculus Fest</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 20px" }}>You have 60 seconds to solve math problems</p>
              <div style={{ background: "#1a1a2e", borderRadius: 14, padding: "18px", marginBottom: 16 }}>
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
