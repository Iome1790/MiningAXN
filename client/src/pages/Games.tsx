import { useLocation } from "wouter";
import { useState } from "react";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import WithdrawalPopup from "@/components/WithdrawalPopup";
import MenuPopup from "@/components/MenuPopup";

declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
  }
}

const GAMES = [
  {
    id: "flip",
    path: "/game/flip",
    name: "Flip Axionet",
    desc: "Match cards to earn some AXN",
    color: "#e67e00",
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

function showAdThenNavigate(path: string, navigate: (p: string) => void) {
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === "development";
  if (!isDevMode && typeof window.show_10401872 === "function") {
    window.show_10401872({ type: "interstitial" })
      .then(() => navigate(path))
      .catch(() => navigate(path));
  } else {
    navigate(path);
  }
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

      {/* Cards centered between header and bottom nav */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "0 16px",
        paddingTop: 72,
        paddingBottom: 80,
        gap: 12,
      }}>
        {GAMES.map(({ id, path, icon, name, desc, color }) => (
          <button
            key={id}
            onClick={() => showAdThenNavigate(path, setLocation)}
            style={{
              display: "flex", alignItems: "center", gap: 0,
              background: "#1e1e1e",
              borderRadius: 18,
              overflow: "hidden",
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.07)",
              width: "100%", textAlign: "left",
              boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{
              width: 76, height: 80, flexShrink: 0,
              background: color,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {icon}
            </div>
            <div style={{ flex: 1, padding: "0 16px", minWidth: 0 }}>
              <p style={{ color: "white", fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>{name}</p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: 0 }}>{desc}</p>
            </div>
            <div style={{ paddingRight: 14, flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {withdrawOpen && <WithdrawalPopup onClose={() => setWithdrawOpen(false)} />}
      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
