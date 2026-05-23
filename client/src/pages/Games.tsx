import { useLocation } from "wouter";
import { useState } from "react";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import WithdrawalPopup from "@/components/WithdrawalPopup";
import MenuPopup from "@/components/MenuPopup";

declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
    Adsgram?: { init: (opts: { blockId: string }) => { show: () => Promise<void> } };
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
    glow: "rgba(230,126,0,0.35)",
    accent: "#e67e00",
    icon: (
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect x="2" y="2" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <circle cx="11" cy="11" r="5" fill="rgba(255,255,255,0.9)"/>
        <rect x="24" y="2" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <circle cx="33" cy="11" r="5" fill="rgba(255,255,255,0.9)"/>
        <rect x="2" y="24" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
        <circle cx="11" cy="33" r="5" fill="rgba(255,255,255,0.9)"/>
        <rect x="24" y="24" width="18" height="18" rx="3.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="3,2"/>
      </svg>
    ),
  },
  {
    id: "sliding",
    path: "/game/sliding",
    name: "Sliding Axionet",
    desc: "Slide tiles and finish the puzzle",
    color: "#c91017",
    glow: "rgba(201,16,23,0.35)",
    accent: "#c91017",
    icon: (
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect x="3" y="8" width="38" height="28" rx="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
        <rect x="6" y="11" width="14" height="9" rx="2" fill="rgba(255,255,255,0.8)"/>
        <rect x="22" y="11" width="14" height="9" rx="2" fill="rgba(255,255,255,0.8)"/>
        <rect x="6" y="22" width="14" height="9" rx="2" fill="rgba(255,255,255,0.8)"/>
        <rect x="22" y="22" width="14" height="9" rx="2" fill="rgba(255,255,255,0.2)" strokeDasharray="2,2" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: "calculus",
    path: "/game/calculus",
    name: "Calculus Fest",
    desc: "Prove you are a calculus master",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.35)",
    accent: "#7c3aed",
    icon: (
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
        <rect x="4" y="6" width="36" height="32" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
        <text x="22" y="26" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="13" fontWeight="900">9+3</text>
        <circle cx="34" cy="10" r="6" fill="rgba(255,255,255,0.25)"/>
        <text x="34" y="13.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="900">✓</text>
      </svg>
    ),
  },
];

async function showAdThenNavigate(path: string, navigate: (p: string) => void) {
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === "development";
  if (isDevMode) {
    navigate(path);
    return;
  }
  try {
    if (typeof window.Adsgram !== "undefined") {
      await window.Adsgram.init({ blockId: "int-29765" }).show();
    } else if (typeof window.show_10401872 === "function") {
      await window.show_10401872({ type: "interstitial" });
    }
  } catch (_) {
    // ad failed or skipped — still navigate
  }
  navigate(path);
}

function GameCard({ id, path, icon, name, desc, color, glow, accent, onClick }: {
  id: string; path: string; icon: React.ReactNode; name: string; desc: string;
  color: string; glow: string; accent: string; onClick: () => void;
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
        background: `linear-gradient(135deg, #1e1e1e 60%, #252525)`,
        clipPath: CUT_SM,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        boxShadow: `0 4px 24px ${glow}, 0 1px 0 rgba(255,255,255,0.05) inset`,
        border: "none",
        overflow: "visible",
      }}
    >
      {/* Corner accents */}
      {corners.map((c, i) => (
        <div key={i} style={{ position: "absolute", background: accent, opacity: 0.7, borderRadius: 1, ...c }} />
      ))}

      {/* Colored icon area */}
      <div style={{
        width: 78, height: 84, flexShrink: 0,
        background: `linear-gradient(160deg, ${color}cc, ${color})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        clipPath: "polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%)",
        boxShadow: `4px 0 16px ${color}44`,
      }}>
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
          border: `1px solid ${color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function Games() {
  const [, setLocation] = useLocation();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111111",
      display: "flex",
      flexDirection: "column",
    }}>
      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onInviteOpen={() => setInviteOpen(true)}
        onWithdrawOpen={() => setWithdrawOpen(true)}
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
      }}>
        {/* Section label */}
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 2px 2px" }}>
          Choose a Game
        </p>

        {GAMES.map((g) => (
          <GameCard
            key={g.id}
            {...g}
            onClick={() => showAdThenNavigate(g.path, setLocation)}
          />
        ))}
      </div>

      {withdrawOpen && <WithdrawalPopup onClose={() => setWithdrawOpen(false)} />}
      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
