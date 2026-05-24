import { useLocation } from "wouter";

const TABS = [
  {
    id: "earn",
    label: "Earn",
    path: "/earn",
    icon: (active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" fill={active ? "rgba(245,158,11,0.18)" : "transparent"} stroke={active ? "#f59e0b" : "rgba(255,255,255,0.35)"} strokeWidth="1.8"/>
        <path d="M12 7v1m0 8v1M9.5 9.5A2.5 2.5 0 0 1 12 8a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1-2.5-1.5" stroke={active ? "#f59e0b" : "rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14.5 10.5A2.5 2.5 0 0 1 12 13" stroke={active ? "#f59e0b" : "rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    activeColor: "#f59e0b",
    activeBg: "rgba(245,158,11,0.18)",
    activeBorder: "rgba(245,158,11,0.35)",
    activeGlow: "rgba(245,158,11,0.22)",
  },
  {
    id: "watch",
    label: "Watch",
    path: "/watch",
    icon: (active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="3" fill={active ? "rgba(168,85,247,0.18)" : "transparent"} stroke={active ? "#a855f7" : "rgba(255,255,255,0.35)"} strokeWidth="1.8"/>
        <path d="M10 9l5 3-5 3V9z" fill={active ? "#a855f7" : "rgba(255,255,255,0.35)"}/>
      </svg>
    ),
    activeColor: "#a855f7",
    activeBg: "rgba(168,85,247,0.18)",
    activeBorder: "rgba(168,85,247,0.35)",
    activeGlow: "rgba(168,85,247,0.22)",
  },
  {
    id: "game",
    label: "Game",
    path: "/game",
    icon: (active: boolean) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="5" fill={active ? "rgba(255,255,255,0.15)" : "transparent"} stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="1.8"/>
        <line x1="7" y1="12" x2="11" y2="12" stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="2.2"/>
        <line x1="9" y1="10" x2="9" y2="14" stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="2.2"/>
        <circle cx="15.5" cy="10.5" r="1.2" fill={active ? "#ef4444" : "rgba(255,255,255,0.38)"}/>
        <circle cx="17.8" cy="12.5" r="1.2" fill={active ? "#3b82f6" : "rgba(255,255,255,0.38)"}/>
        <circle cx="15.5" cy="14.5" r="1.2" fill={active ? "#22c55e" : "rgba(255,255,255,0.38)"}/>
        <circle cx="13.2" cy="12.5" r="1.2" fill={active ? "#f59e0b" : "rgba(255,255,255,0.38)"}/>
      </svg>
    ),
    activeColor: "#fff",
    activeBg: "rgba(124,58,237,0.22)",
    activeBorder: "rgba(124,58,237,0.35)",
    activeGlow: "rgba(124,58,237,0.25)",
  },
  {
    id: "friend",
    label: "Friend",
    path: "/friend",
    icon: (active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3.5" fill={active ? "rgba(34,197,94,0.18)" : "transparent"} stroke={active ? "#22c55e" : "rgba(255,255,255,0.35)"} strokeWidth="1.8"/>
        <path d="M3 20c0-3.314 2.686-6 6-6" stroke={active ? "#22c55e" : "rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="17" cy="9" r="2.5" stroke={active ? "#22c55e" : "rgba(255,255,255,0.35)"} strokeWidth="1.6"/>
        <path d="M13 20c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke={active ? "#22c55e" : "rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    activeColor: "#22c55e",
    activeBg: "rgba(34,197,94,0.18)",
    activeBorder: "rgba(34,197,94,0.35)",
    activeGlow: "rgba(34,197,94,0.22)",
  },
  {
    id: "wallet",
    label: "Wallet",
    path: "/wallet",
    icon: (active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" fill={active ? "rgba(59,130,246,0.18)" : "transparent"} stroke={active ? "#3b82f6" : "rgba(255,255,255,0.35)"} strokeWidth="1.8"/>
        <path d="M2 10h20" stroke={active ? "#3b82f6" : "rgba(255,255,255,0.35)"} strokeWidth="1.8"/>
        <rect x="16" y="13" width="4" height="3" rx="1" fill={active ? "#3b82f6" : "rgba(255,255,255,0.35)"}/>
        <path d="M6 4h12" stroke={active ? "#3b82f6" : "rgba(255,255,255,0.35)"} strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
    activeColor: "#3b82f6",
    activeBg: "rgba(59,130,246,0.18)",
    activeBorder: "rgba(59,130,246,0.35)",
    activeGlow: "rgba(59,130,246,0.22)",
  },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const getActive = (tab: typeof TABS[0]) => {
    if (tab.id === "game") return location.startsWith("/game");
    return location === tab.path;
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 68, paddingBottom: "max(calc(env(safe-area-inset-bottom)), 4px)",
      background: "linear-gradient(180deg, rgba(10,10,12,0.98) 0%, #000 100%)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "0 -8px 32px rgba(0,0,0,0.8)",
    }}>
      {TABS.map((tab) => {
        const active = getActive(tab);
        return (
          <button
            key={tab.id}
            onClick={() => setLocation(tab.path)}
            style={{
              flex: 1, height: "100%", border: "none", background: "transparent",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              touchAction: "manipulation", position: "relative",
            }}
          >
            {active && (
              <div style={{
                position: "absolute", top: 0, left: "20%", right: "20%", height: 2,
                background: `linear-gradient(90deg, transparent, ${tab.activeColor}, transparent)`,
                borderRadius: "0 0 2px 2px",
                boxShadow: `0 0 8px ${tab.activeColor}`,
              }} />
            )}
            <div style={{
              width: 48, height: 32, borderRadius: 10,
              background: active ? tab.activeBg : "transparent",
              border: active ? `1px solid ${tab.activeBorder}` : "1px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: active ? `0 0 14px ${tab.activeGlow}` : "none",
            }}>
              {tab.icon(active)}
            </div>
            <span style={{
              fontSize: 9, fontWeight: active ? 900 : 600,
              color: active ? tab.activeColor : "rgba(255,255,255,0.3)",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
