import { useLocation } from "wouter";

const TABS = [
  {
    label: "Games",
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
  },
  {
    label: "Offers",
    path: "/offers",
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#f59e0b" : "rgba(255,255,255,0.38)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12"/>
        <rect x="2" y="7" width="20" height="5"/>
        <line x1="12" y1="22" x2="12" y2="7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 72, paddingBottom: "max(calc(env(safe-area-inset-bottom) + 4px), 8px)",
      background: "linear-gradient(180deg, #0e0e10 0%, #0a0a0c 100%)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
    }}>
      {TABS.map(({ label, path, icon }) => {
        const active = label === "Games"
          ? location.startsWith("/game")
          : location === path;

        return (
          <button
            key={label}
            onClick={() => setLocation(path)}
            style={{
              flex: 1, height: "100%", border: "none", background: "transparent",
              cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              touchAction: "manipulation",
            }}
          >
            <div style={{
              width: 54, height: 36, borderRadius: 12,
              background: active
                ? label === "Offers"
                  ? "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(230,126,0,0.15))"
                  : "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(59,130,246,0.15))"
                : "transparent",
              border: active
                ? label === "Offers"
                  ? "1px solid rgba(245,158,11,0.35)"
                  : "1px solid rgba(124,58,237,0.35)"
                : "1px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              boxShadow: active
                ? label === "Offers"
                  ? "0 0 16px rgba(245,158,11,0.25)"
                  : "0 0 16px rgba(124,58,237,0.25)"
                : "none",
            }}>
              {icon(active)}
            </div>
            <span style={{
              fontSize: 10, fontWeight: active ? 800 : 600,
              color: active
                ? label === "Offers" ? "#f59e0b" : "#fff"
                : "rgba(255,255,255,0.35)",
              letterSpacing: 0.3,
              textTransform: "uppercase",
              lineHeight: 1.1,
              textAlign: "center",
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
