import { useLocation } from "wouter";
import { useState } from "react";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import MenuPopup from "@/components/MenuPopup";
import { showRewardedPopup } from "@/lib/showAd";

const CUT_SM = 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)';

const GAMES = [
  {
    id: "flip",
    path: "/game/flip",
    name: "Flip Axionet",
    desc: "Match cards to earn some AXN",
    color: "#e67e00",
    glow: "rgba(230,126,0,0.45)",
    accent: "#e67e00",
    neon: "#f59e0b",
    icon: (
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect x="2" y="2" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
        <circle cx="11" cy="11" r="5" fill="rgba(255,255,255,0.92)"/>
        <rect x="24" y="2" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
        <circle cx="33" cy="11" r="5" fill="rgba(255,255,255,0.92)"/>
        <rect x="2" y="24" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
        <circle cx="11" cy="33" r="5" fill="rgba(255,255,255,0.92)"/>
        <rect x="24" y="24" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="3,2"/>
      </svg>
    ),
  },
  {
    id: "sliding",
    path: "/game/sliding",
    name: "Sliding Axionet",
    desc: "Slide tiles and finish the puzzle",
    color: "#c91017",
    glow: "rgba(201,16,23,0.45)",
    accent: "#c91017",
    neon: "#ef4444",
    icon: (
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect x="3" y="8" width="38" height="28" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <rect x="6" y="11" width="14" height="9" rx="2" fill="rgba(255,255,255,0.85)"/>
        <rect x="22" y="11" width="14" height="9" rx="2" fill="rgba(255,255,255,0.85)"/>
        <rect x="6" y="22" width="14" height="9" rx="2" fill="rgba(255,255,255,0.85)"/>
        <rect x="22" y="22" width="14" height="9" rx="2" fill="rgba(255,255,255,0.2)" strokeDasharray="2,2" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: "calculus",
    path: "/game/calculus",
    name: "Calculus Fest",
    desc: "Prove you are a calculus master",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.45)",
    accent: "#7c3aed",
    neon: "#a78bfa",
    icon: (
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect x="4" y="6" width="36" height="32" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <text x="22" y="26" textAnchor="middle" fill="rgba(255,255,255,0.92)" fontSize="13" fontWeight="900">9+3</text>
        <circle cx="34" cy="10" r="6" fill="rgba(255,255,255,0.25)"/>
        <text x="34" y="13.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="900">✓</text>
      </svg>
    ),
  },
];

async function startGame(path: string, navigate: (p: string) => void) {
  await showRewardedPopup();
  navigate(path);
}

function GameCard({ icon, name, desc, color, glow, neon, onClick }: {
  id: string; path: string; icon: React.ReactNode; name: string; desc: string;
  color: string; glow: string; accent: string; neon: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="active:scale-[0.98] transition-transform"
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 0,
        background: "rgba(18,12,36,0.97)",
        border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: 20,
        cursor: "pointer", width: "100%", textAlign: "left",
        boxShadow: `0 4px 24px ${glow}`,
        overflow: "hidden", touchAction: "manipulation",
        transition: "all 0.2s",
      }}
    >
      {/* Left color bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${neon}, transparent)`, opacity: 0.8 }} />

      <div style={{
        width: 74, height: 80, flexShrink: 0,
        background: `linear-gradient(160deg, ${color}cc, ${color}88)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)" }} />
        {icon}
      </div>

      <div style={{ flex: 1, padding: "0 14px" }}>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>{name}</p>
        <p style={{ color: "rgba(167,139,250,0.65)", fontSize: 12, margin: 0, fontWeight: 500 }}>{desc}</p>
      </div>

      <div style={{ paddingRight: 16, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function Games() {
  const [, setLocation] = useLocation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0614", display: "flex", flexDirection: "column" }}>

      {/* Purple top glow */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 180, background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.2) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onInviteOpen={() => setInviteOpen(true)}
        onWithdrawOpen={() => setLocation("/wallet")}
      />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch",
        justifyContent: "center", padding: "0 16px", paddingBottom: 90, gap: 12,
        position: "relative", zIndex: 1, paddingTop: 16,
      }}>
        <div style={{ marginBottom: 4 }}>
          <p style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>🎮 Choose a Game</p>
          <p style={{ color: "rgba(167,139,250,0.6)", fontSize: 12, margin: "2px 0 0" }}>Play to earn AXN rewards</p>
        </div>
        {GAMES.map((g) => (
          <GameCard key={g.id} {...g} onClick={() => startGame(g.path, setLocation)} />
        ))}
      </div>

      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
