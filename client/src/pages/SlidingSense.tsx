import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

/* ─── Tile color per puzzle index ─── */
const TILE_COLORS = [
  "#f7931a", "#627eea", "#22c55e",
  "#9945ff", "#ef4444", "#f0b90b",
];

/* ─── Puzzle helpers ─── */
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

/* ─── Instruction demo grid ─── */
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
            {v !== null && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: 900 }}>₿</span>}
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
function TopBar({ onBack, muted, onMute, onHelp }: { onBack: () => void; muted: boolean; onMute: () => void; onHelp: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 14px 10px", gap: 10 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div style={{ flex: 1 }}>
        <p style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Sliding Sense</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, margin: 0 }}>Slide tiles and finish the puzzle</p>
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

/* ─── Popup ─── */
interface Popup { id: number; text: string; }

export default function SlidingSense() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  type Phase = "intro" | "sheet" | "countdown" | "playing" | "over" | "done";
  const [phase, setPhase] = useState<Phase>("intro");
  const [muted, setMuted] = useState(false);
  const [countVal, setCountVal] = useState(3);

  /* game state */
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [tiles, setTiles] = useState<Tiles>([]);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [score, setScore] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rewardSent = useRef(false);

  const currentPuzzle = PUZZLE_SEQ[puzzleIdx] ?? PUZZLE_SEQ[PUZZLE_SEQ.length - 1];
  const tileColor = TILE_COLORS[puzzleIdx % TILE_COLORS.length];

  /* init puzzle */
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
    loadPuzzle(0);
    setCountVal(3);
    setPhase("countdown");
  }, [loadPuzzle]);

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
    if ((phase === "over" || phase === "done") && !rewardSent.current && score > 0) {
      rewardSent.current = true;
      apiRequest("POST", "/api/game/sliding-sense/reward", { score })
        .then(() => qc.invalidateQueries({ queryKey: ["/api/auth/user"] }))
        .catch(() => {});
    }
  }, [phase, score, qc]);

  const showPopup = useCallback((text: string) => {
    const id = popupId + 1;
    setPopupId(id);
    setPopups(p => [...p, { id, text }]);
    setTimeout(() => setPopups(p => p.filter(pp => pp.id !== id)), 1000);
  }, [popupId]);

  /* tile tap */
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
      const bonus = Math.max(1, Math.ceil(timeLeft / 30));
      const gain = 1 + bonus;
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
  }, [phase, tiles, currentPuzzle, muted, timeLeft, puzzleIdx, showPopup, loadPuzzle]);

  const { rows, cols } = currentPuzzle;
  const timerPct = timeLeft / TOTAL_TIME;
  const finished = phase === "over" || phase === "done";

  /* tile size */
  const GRID_W = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 300);
  const GAP = 8;
  const tileW = Math.floor((GRID_W - GAP * (cols - 1)) / cols);
  const tileH = Math.floor((GRID_W * 0.8 - GAP * (rows - 1)) / rows);

  /* ─── INTRO screen ─── */
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
            You are about to start the puzzle.<br/>As soon as you are ready,<br/>click the start button!
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
              <p style={{ color: "white", fontSize: 18, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>Sliding Sense</p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, textAlign: "center", margin: "0 0 22px" }}>You have 90 seconds to slide tiles...</p>

              <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <DemoGrid solved={false} color="#f7931a"/>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Scrambled</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <DemoGrid solved={true} color="#f7931a"/>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Solved</span>
                </div>
              </div>

              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
                Your goal is to slide the tiles and fix the puzzle.
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "center", margin: "0 0 24px", lineHeight: 1.6 }}>
                The more puzzles you can solve in the available time,<br/>the more AXN you will earn!
              </p>

              <button
                onClick={startGame}
                style={{ width: "100%", padding: "15px 0", borderRadius: 14, background: "linear-gradient(90deg,#0891b2,#06b6d4)", border: "none", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}
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

  return (
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Timer progress bar */}
      <div style={{ height: 4, background: "#2a2a2a", flexShrink: 0 }}>
        <motion.div
          animate={{ width: `${timerPct * 100}%` }}
          transition={{ duration: 0.4 }}
          style={{ height: "100%", background: timerPct > 0.4 ? "#fff" : timerPct > 0.2 ? "#f59e0b" : "#ef4444", borderRadius: 2 }}
        />
      </div>

      <TopBar onBack={() => setLocation("/game")} muted={muted} onMute={() => setMuted(m => !m)} onHelp={() => {}} />

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 13, fontWeight: 900 }}>A</span>
          </div>
          <span style={{ color: "white", fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>{score}</span>
        </div>
        <span style={{ color: "white", fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>{timeLeft}</span>
      </div>

      {/* Puzzle dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 10 }}>
        {PUZZLE_SEQ.map((_, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < puzzleIdx ? "#22c55e" : i === puzzleIdx ? "#06b6d4" : "rgba(255,255,255,0.15)", transition: "background 0.3s" }} />
        ))}
      </div>

      {/* Puzzle grid */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tileW}px)`, gridTemplateRows: `repeat(${rows}, ${tileH}px)`, gap: GAP }}>
          {tiles.map((v, i) => (
            <motion.div
              layout
              key={v === null ? "blank" : v}
              transition={{ type: "spring", stiffness: 600, damping: 38 }}
              onClick={() => v !== null && handleTileTap(i)}
              style={{
                width: tileW, height: tileH,
                borderRadius: 10,
                background: v !== null ? tileColor : "transparent",
                border: v !== null ? "none" : "2px dashed rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: v !== null ? "pointer" : "default",
                boxShadow: v !== null ? `0 4px 14px ${tileColor}44` : undefined,
                userSelect: "none",
              }}
            >
              {v !== null && (
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: tileW * 0.3, fontWeight: 900, letterSpacing: -1 }}>{v + 1}</span>
              )}
            </motion.div>
          ))}
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

      {/* Game over */}
      <AnimatePresence>
        {finished && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, gap: 12 }}
          >
            <p style={{ color: "white", fontSize: 18, fontWeight: 800, margin: 0 }}>{phase === "done" ? "All Solved!" : "Time's up!"}</p>
            <p style={{ color: "#06b6d4", fontSize: 28, fontWeight: 900, margin: 0 }}>{score} AXN</p>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, margin: 0 }}>Rewarded to your balance</p>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <button onClick={() => { setPhase("intro"); setScore(0); setTimeLeft(TOTAL_TIME); setPuzzleIdx(0); }} style={{ padding: "13px 28px", borderRadius: 12, background: "#0891b2", border: "none", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Play Again</button>
              <button onClick={() => setLocation("/game")} style={{ padding: "13px 28px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Back</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
