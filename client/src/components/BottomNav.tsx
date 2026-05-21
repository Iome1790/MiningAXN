import { useLocation } from "wouter";

const NAV_ICONS: Record<string, (color: string) => JSX.Element> = {
  Mission: (c) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  Home: (c) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Friends: (c) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Wallet: (c) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <circle cx="12" cy="14" r="1.5" fill={c} stroke="none"/>
    </svg>
  ),
  Roadmap: (c) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
    </svg>
  ),
};

const TABS = [
  { label: "Home",    path: "/" },
  { label: "Wallet",  path: "/wallet" },
  { label: "Roadmap", path: "/roadmap" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 76, paddingBottom: "max(calc(env(safe-area-inset-bottom) + 6px), 10px)",
      background: "rgba(3,7,18,0.97)",
      borderTop: "1px solid rgba(59,130,246,0.12)",
      backdropFilter: "blur(12px)",
    }}>
      {TABS.map(({ label, path }) => {
        const active = location === path;
        const color = active ? "#60a5fa" : "rgba(255,255,255,0.42)";
        return (
          <button key={label} onClick={() => setLocation(path)}
            className="flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform"
            style={{ flex: 1, height: "100%", paddingTop: 4, border: "none", background: "transparent", cursor: "pointer" }}
          >
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: active ? "rgba(59,130,246,0.15)" : "transparent", boxShadow: active ? "0 0 14px rgba(59,130,246,0.35)" : "none", filter: active ? "drop-shadow(0 0 5px rgba(59,130,246,0.7))" : "none", transition: "all 0.2s" }}>
              {NAV_ICONS[label]?.(color)}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#60a5fa" : "rgba(255,255,255,0.38)", letterSpacing: 0.3, lineHeight: 1, transition: "color 0.18s" }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
