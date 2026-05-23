import { useLocation } from "wouter";
import { useState } from "react";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import MenuPopup from "@/components/MenuPopup";

declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
  }
}

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

async function showAdThenNavigate(path: string, navigate: (p: string) => void) {
  try {
    if (typeof window.show_10401872 === "function") {
      await window.show_10401872({ type: "interstitial" });
    }
  } catch (_) {
    // ad failed or skipped — still navigate
  }
  navigate(path);
}

function GameCard({ id, path, icon, name, desc, color, glow, accent, neon, onClick }: {
  id: string; path: string; icon: React.ReactNode; name: string; desc: string;
  color: string; glow: string; accent: string; neon: string; onClick: () => void;
}) {
  const corners = [
    { top: '2px',    left: '16px',  width: '24px', height: '1.5px' },
    { top: '16px',   left: '2px',   width: '1.5px', height: '24px' },
    { top: '2px',    right: '16px', width: '24px', height: '1.5px' },
    { top: '16px',   right: '2px',  width: '1.5px', height: '24px' },
    { bottom: '2px', left: '16px',  width: '24px', height: '1.5px' },
    { bottom: '16px',left: '2px',   width: '1.5px', height: '24px' },
    { bottom: '2px', right: '16px', width: '24px', height: '1.5px' },
    { bottom: '16px',right: '2px',  width: '1.5px', height: '24px' },
  ];

  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 0,
        background: `linear-gradient(135deg, #1a1a1a 0%, #222228 50%, #1a1a1a 100%)`,
        clipPath: CUT_SM,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        boxShadow: `0 4px 28px ${glow}, 0 1px 0 rgba(255,255,255,0.07) inset, 0 -1px 0 rgba(0,0,0,0.5) inset`,
        border: "none",
        overflow: "visible",
        touchAction: "manipulation",
      }}
    >
      {/* Chrome shimmer highlight */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.18), rgba(255,255,255,0.08), transparent)`,
        pointerEvents: "none", zIndex: 5,
      }} />

      {/* Corner accents */}
      {corners.map((c, i) => (
        <div key={i} style={{ position: "absolute", background: accent, opacity: 0.8, borderRadius: 1, ...c }} />
      ))}

      {/* Neon glow line on left edge */}
      <div style={{
        position: "absolute", left: 0, top: 12, bottom: 12, width: 2,
        background: `linear-gradient(180deg, transparent, ${neon}, transparent)`,
        opacity: 0.7,
        pointerEvents: "none",
      }} />

      {/* Colored icon area */}
      <div style={{
        width: 78, height: 84, flexShrink: 0,
        background: `linear-gradient(160deg, ${color}dd, ${color}99)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        clipPath: "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)",
        boxShadow: `4px 0 20px ${color}55`,
        position: "relative",
      }}>
        {/* Chrome sheen on icon area */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)",
          pointerEvents: "none",
        }} />
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, padding: "0 16px", minWidth: 0 }}>
        <p style={{ color: "white", fontSize: 16, fontWeight: 800, margin: "0 0 3px", letterSpacing: 0.2 }}>{name}</p>
        <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 12, margin: 0 }}>{desc}</p>
      </div>

      {/* Arrow */}
      <div style={{ paddingRight: 16, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: `${color}22`,
          border: `1px solid ${neon}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 8px ${neon}33`,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={neon} strokeWidth="2.5" strokeLinecap="round">
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
    <div style={{
      minHeight: "100vh",
      background: "#000000",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Top blue glow line */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.9), rgba(96,165,250,1), rgba(59,130,246,0.9), transparent)",
        boxShadow: "0 0 24px rgba(59,130,246,0.7)",
        pointerEvents: "none", zIndex: 10,
      }} />
      {/* Top blue glow orb */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 180,
        background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.18) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />
      {/* Bottom blue glow line */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.9), rgba(96,165,250,1), rgba(59,130,246,0.9), transparent)",
        boxShadow: "0 0 24px rgba(59,130,246,0.7)",
        pointerEvents: "none", zIndex: 10,
      }} />
      {/* Bottom blue glow orb */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 180,
        background: "radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.18) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onInviteOpen={() => setInviteOpen(true)}
        onWithdrawOpen={() => setLocation("/withdraw")}
      />

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "0 16px",
        paddingBottom: 80,
        gap: 14,
        position: "relative",
        zIndex: 1,
      }}>
        {/* Section label */}
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", margin: "0 2px 4px" }}>
          🎮 Choose a Game
        </p>

        {GAMES.map((g) => (
          <GameCard
            key={g.id}
            {...g}
            onClick={() => showAdThenNavigate(g.path, setLocation)}
          />
        ))}
      </div>

      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
