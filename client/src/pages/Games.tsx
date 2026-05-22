import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

function FlipHubIcon() {
  return (
    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(145deg,#e67e00,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(230,126,0,0.5)", flexShrink: 0 }}>
      <svg viewBox="0 0 44 44" width="38" height="38">
        <rect x="2" y="2" width="18" height="18" rx="3.5" fill="#1a1a1a" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        <circle cx="11" cy="11" r="5.5" fill="#f7931a"/>
        <text x="11" y="14.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="900">₿</text>
        <rect x="24" y="2" width="18" height="18" rx="3.5" fill="#1a1a1a" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        <circle cx="33" cy="11" r="5.5" fill="#fbbf24"/>
        <text x="33.5" y="14.5" textAnchor="middle" fill="#1a1200" fontSize="7" fontWeight="900">C</text>
        <rect x="2" y="24" width="18" height="18" rx="3.5" fill="#1a1a1a" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
        <circle cx="11" cy="33" r="5.5" fill="#627eea"/>
        <text x="11" y="36.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="900">Ξ</text>
        <rect x="24" y="24" width="18" height="18" rx="3.5" fill="#1a1a1a" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="2.5,2"/>
      </svg>
    </div>
  );
}

function SlideHubIcon() {
  return (
    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(145deg,#c91017,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(201,16,23,0.5)", flexShrink: 0 }}>
      <svg viewBox="0 0 44 44" width="36" height="36">
        <rect x="3" y="8" width="38" height="28" rx="4" fill="#1a1a1a" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
        <rect x="6" y="11" width="15" height="10" rx="2" fill="#f7931a" opacity="0.9"/>
        <rect x="23" y="11" width="15" height="10" rx="2" fill="#f7931a" opacity="0.9"/>
        <rect x="6" y="23" width="15" height="10" rx="2" fill="#f7931a" opacity="0.9"/>
        <rect x="23" y="23" width="15" height="10" rx="2" fill="transparent" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="2,2"/>
        <text x="13.5" y="19.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="900">₿</text>
        <text x="30.5" y="19.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="900">₿</text>
        <text x="13.5" y="31" textAnchor="middle" fill="white" fontSize="8" fontWeight="900">₿</text>
      </svg>
    </div>
  );
}

function CalcHubIcon() {
  return (
    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(145deg,#7c3aed,#9945ff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(124,58,237,0.5)", flexShrink: 0 }}>
      <svg viewBox="0 0 44 44" width="36" height="36">
        <rect x="4" y="6" width="36" height="32" rx="5" fill="#1a1a1a" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>
        <text x="22" y="27" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">9+3</text>
        <circle cx="34" cy="10" r="7" fill="#f7931a"/>
        <text x="34" y="13.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="900">₿</text>
        <circle cx="10" cy="34" r="5.5" fill="#c91017"/>
        <text x="10" y="37.5" textAnchor="middle" fill="white" fontSize="6" fontWeight="900">▲</text>
      </svg>
    </div>
  );
}

const GAMES = [
  { id: "flip",     path: "/game/flip",     Icon: FlipHubIcon,  name: "Flip Sense",     desc: "Match cards to earn some AXN" },
  { id: "sliding",  path: "/game/sliding",  Icon: SlideHubIcon, name: "Sliding Sense",  desc: "Slide tiles and finish the puzzle" },
  { id: "calculus", path: "/game/calculus", Icon: CalcHubIcon,  name: "Calculus Fest",  desc: "Prove you are a calculus master" },
];

export default function Games() {
  const [, setLocation] = useLocation();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const balance = parseFloat(user?.balance ?? "0");
  const displayBal = balance % 1 === 0 ? balance.toFixed(0) : balance.toFixed(2);
  const initials = (user?.username ?? user?.first_name ?? "U").slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#111111", display: "flex", flexDirection: "column", paddingBottom: 72 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "16px 16px 14px" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "white", fontSize: 12, fontWeight: 800 }}>{initials}</span>
        </div>
      </div>

      {/* Game cards — vertically centered */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 12px", gap: 10 }}>
        {GAMES.map(({ id, path, Icon, name, desc }) => (
          <button
            key={id}
            onClick={() => setLocation(path)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "#1e1e1e", borderRadius: 16,
              padding: "14px 16px", cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.06)",
              width: "100%", textAlign: "left",
            }}
          >
            <Icon />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", fontSize: 16, fontWeight: 700, margin: "0 0 3px" }}>{name}</p>
              <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, margin: 0 }}>{desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 11, textAlign: "center", padding: "12px 20px 0" }}>
        AXN rewards credited instantly after each round
      </p>
    </div>
  );
}
