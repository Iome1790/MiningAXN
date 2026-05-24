import { useLocation } from "wouter";

const TABS = [
  { id: "earn", label: "EARN", path: "/earn" },
  { id: "watch", label: "WATCH", path: "/watch" },
  { id: "game", label: "GAME", path: "/game" },
  { id: "friend", label: "FRIEND", path: "/friend" },
  { id: "wallet", label: "WALLET", path: "/wallet" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const isActive = (tab: typeof TABS[0]) => {
    if (tab.id === "game") return location.startsWith("/game");
    return location === tab.path;
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      background: "#0a0a0a",
      borderTop: "1px solid #2a1f00",
      display: "flex", justifyContent: "space-around", alignItems: "center",
      height: 52, paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map(tab => {
        const active = isActive(tab);
        return (
          <button
            key={tab.id}
            onClick={() => setLocation(tab.path)}
            style={{
              flex: 1, height: "100%", border: "none", background: "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: 11, fontWeight: active ? 700 : 400, letterSpacing: "0.05em",
              color: active ? "#f5a623" : "rgba(255,255,255,0.35)",
              transition: "color 0.15s",
              touchAction: "manipulation", position: "relative",
            }}
          >
            {active && (
              <div style={{
                position: "absolute", top: 0, left: "10%", right: "10%", height: 2,
                background: "#f5a623",
              }} />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
