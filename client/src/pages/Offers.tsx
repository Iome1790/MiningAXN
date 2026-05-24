import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";

const CUT_SM = 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)';
const TICKET_COLOR = "#f59e0b";
const TICKET_GLOW = "rgba(245,158,11,0.55)";

const CORNERS = [
  { top: '2px',    left: '14px',  width: '22px', height: '1.5px' },
  { top: '14px',   left: '2px',   width: '1.5px', height: '22px' },
  { top: '2px',    right: '14px', width: '22px', height: '1.5px' },
  { top: '14px',   right: '2px',  width: '1.5px', height: '22px' },
  { bottom: '2px', left: '14px',  width: '22px', height: '1.5px' },
  { bottom: '14px',left: '2px',   width: '1.5px', height: '22px' },
  { bottom: '2px', right: '14px', width: '22px', height: '1.5px' },
  { bottom: '14px',right: '2px',  width: '1.5px', height: '22px' },
];

function TicketIcon({ size = 22, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={glow ? { filter: `drop-shadow(0 0 5px ${TICKET_GLOW})` } : {}}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" fill={TICKET_COLOR} opacity="0.18" stroke={TICKET_COLOR} strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="7" y1="7" x2="7.01" y2="7" stroke={TICKET_COLOR} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

interface Task {
  id: string;
  emoji: string;
  title: string;
  description: string;
  tickets: number;
  action: string;
  color: string;
  glow: string;
  neon: string;
  repeatable?: boolean;
}

const TASKS: Task[] = [
  { id: "watch_ad", emoji: "📺", title: "Watch an Ad", description: "Watch a short sponsored video", tickets: 5, action: "Watch", color: "#6366f1", glow: "rgba(99,102,241,0.4)", neon: "#818cf8", repeatable: true },
  { id: "join_channel", emoji: "📢", title: "Join Our Channel", description: "Subscribe to the official AXN channel", tickets: 20, action: "Join", color: "#0ea5e9", glow: "rgba(14,165,233,0.4)", neon: "#38bdf8" },
  { id: "daily_checkin", emoji: "📅", title: "Daily Check-In", description: "Check in every day to earn tickets", tickets: 10, action: "Check In", color: "#10b981", glow: "rgba(16,185,129,0.4)", neon: "#34d399", repeatable: true },
  { id: "invite_friends", emoji: "👥", title: "Invite Friends", description: "Share your referral link with a friend", tickets: 30, action: "Invite", color: "#f59e0b", glow: "rgba(245,158,11,0.4)", neon: "#fbbf24", repeatable: true },
  { id: "play_game", emoji: "🎮", title: "Play a Game", description: "Complete any game session to earn", tickets: 15, action: "Play", color: "#e67e00", glow: "rgba(230,126,0,0.4)", neon: "#f59e0b", repeatable: true },
  { id: "streak", emoji: "🔥", title: "Complete a Streak", description: "Maintain a 3-day login streak", tickets: 25, action: "Streak", color: "#ef4444", glow: "rgba(239,68,68,0.4)", neon: "#f87171" },
  { id: "sponsored", emoji: "🎯", title: "Watch Sponsored Content", description: "Watch a partner's sponsored video", tickets: 8, action: "Watch", color: "#a855f7", glow: "rgba(168,85,247,0.4)", neon: "#c084fc", repeatable: true },
];

function InfoSheet({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(180deg,#111 0%,#0a0a0a 100%)",
          borderTop: "1px solid rgba(245,158,11,0.2)",
          borderRadius: "22px 22px 0 0",
          padding: "20px 20px 44px",
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <TicketIcon size={24} glow />
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>What are Tickets?</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.7, margin: "0 0 16px" }}>
          Tickets are your gateway to exclusive rewards inside AXN.
        </p>
        {[
          { icon: "🎮", text: "Use tickets to play premium games" },
          { icon: "🔓", text: "Unlock special rewards and boosts" },
          { icon: "🏆", text: "Enter leaderboard competitions" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "linear-gradient(135deg,rgba(245,158,11,0.06),rgba(245,158,11,0.02))",
            border: "1px solid rgba(245,158,11,0.12)",
            borderRadius: 12, padding: "10px 14px", marginBottom: 8,
          }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{item.text}</span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            marginTop: 20, width: "100%", height: 50, borderRadius: 0,
            clipPath: CUT_SM,
            background: "linear-gradient(90deg,#92400e,#f59e0b)",
            border: "none", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer",
            boxShadow: `0 0 24px ${TICKET_GLOW}`, position: "relative",
          }}
        >
          {CORNERS.map((c, i) => <div key={i} style={{ position: "absolute", background: "rgba(255,255,255,0.5)", borderRadius: 1, ...c }} />)}
          Got it!
        </button>
      </motion.div>
    </motion.div>
  );
}

function TaskCard({ task, onClaim }: { task: Task; onClaim: (id: string) => void }) {
  const [claimed, setClaimed] = useState(false);
  const [flash, setFlash] = useState(false);

  const handle = () => {
    if (claimed && !task.repeatable) return;
    setFlash(true); setTimeout(() => setFlash(false), 450);
    setClaimed(true);
    onClaim(task.id);
    if (task.repeatable) setTimeout(() => setClaimed(false), 3000);
  };

  const done = claimed && !task.repeatable;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg,#1a1a1a 0%,#222228 50%,#1a1a1a 100%)",
        clipPath: CUT_SM,
        boxShadow: `0 4px 24px ${task.glow}, 0 1px 0 rgba(255,255,255,0.06) inset`,
        display: "flex", alignItems: "center", gap: 0, overflow: "visible",
      }}>
        {/* Chrome shimmer */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", pointerEvents: "none", zIndex: 5 }} />
        {/* Corner accents */}
        {CORNERS.map((c, i) => <div key={i} style={{ position: "absolute", background: task.color, opacity: 0.7, borderRadius: 1, ...c }} />)}
        {/* Left neon bar */}
        <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 2, background: `linear-gradient(180deg,transparent,${task.neon},transparent)`, opacity: 0.6 }} />

        {/* Icon area */}
        <div style={{
          width: 72, height: 76, flexShrink: 0,
          background: `linear-gradient(160deg,${task.color}dd,${task.color}99)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)",
          boxShadow: `4px 0 18px ${task.color}44`,
          fontSize: 26, position: "relative",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(255,255,255,0.18) 0%,transparent 50%)" }} />
          {task.emoji}
        </div>

        {/* Text */}
        <div style={{ flex: 1, padding: "0 12px", minWidth: 0 }}>
          <p style={{ color: "#fff", fontSize: 14, fontWeight: 800, margin: "0 0 2px", letterSpacing: 0.2 }}>{task.title}</p>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, margin: "0 0 6px", lineHeight: 1.3 }}>{task.description}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <TicketIcon size={12} glow />
            <span style={{ color: TICKET_COLOR, fontWeight: 900, fontSize: 12 }}>+{task.tickets}</span>
            <span style={{ color: "rgba(245,158,11,0.45)", fontSize: 11 }}>tickets</span>
          </div>
        </div>

        {/* Action button */}
        <div style={{ paddingRight: 12, flexShrink: 0 }}>
          <button
            onClick={handle}
            disabled={done}
            style={{
              height: 34, padding: "0 12px", borderRadius: 0,
              clipPath: "polygon(6px 0%,calc(100% - 6px) 0%,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0% calc(100% - 6px),0% 6px)",
              border: "none",
              background: done ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg,${task.color},${task.color}bb)`,
              color: done ? "rgba(255,255,255,0.25)" : "#fff",
              fontWeight: 800, fontSize: 11, cursor: done ? "not-allowed" : "pointer",
              boxShadow: done ? "none" : `0 0 12px ${task.glow}`,
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {claimed ? (task.repeatable ? task.action : "Done ✓") : task.action}
          </button>
        </div>

        {/* Flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.5 }} animate={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              style={{ position: "absolute", inset: 0, background: `radial-gradient(circle,${task.glow},transparent)`, pointerEvents: "none" }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Offers() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [tickets, setTickets] = useState(0);
  const [ticketFlash, setTicketFlash] = useState<number | null>(null);

  const handleClaim = (taskId: string) => {
    const task = TASKS.find(t => t.id === taskId);
    if (!task) return;
    setTickets(prev => prev + task.tickets);
    setTicketFlash(task.tickets);
    setTimeout(() => setTicketFlash(null), 1400);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column" }}>
      {/* Top blue glow line */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.9),rgba(96,165,250,1),rgba(59,130,246,0.9),transparent)", boxShadow: "0 0 24px rgba(59,130,246,0.7)", pointerEvents: "none", zIndex: 30 }} />
      {/* Top glow orb */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 180, background: "radial-gradient(ellipse at 50% 0%,rgba(59,130,246,0.18) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      {/* Bottom blue glow line */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.9),rgba(96,165,250,1),rgba(59,130,246,0.9),transparent)", boxShadow: "0 0 24px rgba(59,130,246,0.7)", pointerEvents: "none", zIndex: 30 }} />
      {/* Bottom glow orb */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 180, background: "radial-gradient(ellipse at 50% 100%,rgba(59,130,246,0.18) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <Header
        onInviteOpen={() => setInviteOpen(true)}
      />

      <div style={{ flex: 1, paddingTop: 72, paddingBottom: 88, position: "relative", zIndex: 1 }}>
        {/* Ticket Balance Card */}
        <div style={{ padding: "16px 16px 12px" }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(135deg,#1a1a1a 0%,#222228 50%,#1a1a1a 100%)",
            clipPath: CUT_SM,
            boxShadow: `0 4px 32px rgba(245,158,11,0.15), 0 1px 0 rgba(255,255,255,0.07) inset`,
            padding: "18px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            {/* Chrome shimmer */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)", pointerEvents: "none" }} />
            {CORNERS.map((c, i) => <div key={i} style={{ position: "absolute", background: TICKET_COLOR, opacity: 0.75, borderRadius: 1, ...c }} />)}
            {/* Left neon */}
            <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 2, background: `linear-gradient(180deg,transparent,${TICKET_COLOR},transparent)`, opacity: 0.7 }} />

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>Your Tickets</span>
                <button
                  onClick={() => setShowInfo(true)}
                  style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
                    color: TICKET_COLOR, fontSize: 9, fontWeight: 900, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                  }}
                >i</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                <TicketIcon size={26} glow />
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 36, fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${TICKET_GLOW}` }}>
                  {tickets.toLocaleString()}
                </span>
                <AnimatePresence>
                  {ticketFlash !== null && (
                    <motion.span
                      key={ticketFlash + Date.now()}
                      initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }}
                      transition={{ duration: 1.2 }}
                      style={{ position: "absolute", left: 36, top: -8, color: TICKET_COLOR, fontWeight: 900, fontSize: 15, pointerEvents: "none", whiteSpace: "nowrap", textShadow: `0 0 10px ${TICKET_GLOW}` }}
                    >
                      +{ticketFlash} 🎫
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Pulsing ticket icon */}
            <div style={{ animation: "tpulse 2.5s ease-in-out infinite" }}>
              <style>{`@keyframes tpulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}`}</style>
              <TicketIcon size={40} glow />
            </div>
          </div>
        </div>

        {/* Section label */}
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", margin: "0 18px 12px" }}>
          🎫 Complete Tasks · Earn Tickets
        </p>

        {/* Task cards */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {TASKS.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <TaskCard task={task} onClaim={handleClaim} />
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>{showInfo && <InfoSheet onClose={() => setShowInfo(false)} />}</AnimatePresence>
      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
    </div>
  );
}
