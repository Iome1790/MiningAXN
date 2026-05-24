import { useLocation } from "wouter";

const TABS = [
  {
    id: "earn",
    label: "Earn",
    path: "/earn",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinejoin="round"/>
        <path d="M2 17l10 5 10-5" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinejoin="round"/>
        <path d="M2 12l10 5 10-5" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
    activeColor: "#A78BFA",
  },
  {
    id: "watch",
    label: "Watch",
    path: "/watch",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="4" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2"/>
        <path d="M10 9l5 3-5 3V9z" fill={active ? "#A78BFA" : "rgba(255,255,255,0.4)"}/>
      </svg>
    ),
    activeColor: "#A78BFA",
  },
  {
    id: "game",
    label: "Game",
    path: "/game",
    isCenter: true,
    icon: (active: boolean) => (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="12" rx="5" stroke="#fff" strokeWidth="2"/>
        <line x1="7" y1="12" x2="11" y2="12" stroke="#fff" strokeWidth="2.2"/>
        <line x1="9" y1="10" x2="9" y2="14" stroke="#fff" strokeWidth="2.2"/>
        <circle cx="15.5" cy="10.5" r="1.2" fill="#fff"/>
        <circle cx="17.8" cy="12.5" r="1.2" fill="#fff"/>
        <circle cx="15.5" cy="14.5" r="1.2" fill="#fff"/>
        <circle cx="13.2" cy="12.5" r="1.2" fill="#fff"/>
      </svg>
    ),
    activeColor: "#fff",
  },
  {
    id: "friend",
    label: "Referrals",
    path: "/friend",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2"/>
        <path d="M3 21c0-3.866 2.686-7 6-7" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2"/>
        <path d="M13 21c0-2.761 1.343-5 3-5s3 2.239 3 5" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    activeColor: "#A78BFA",
  },
  {
    id: "wallet",
    label: "Wallet",
    path: "/wallet",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="20" height="14" rx="3" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2"/>
        <path d="M2 10h20" stroke={active ? "#A78BFA" : "rgba(255,255,255,0.4)"} strokeWidth="2"/>
        <rect x="15" y="13" width="5" height="3" rx="1.5" fill={active ? "#A78BFA" : "rgba(255,255,255,0.4)"}/>
      </svg>
    ),
    activeColor: "#A78BFA",
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
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 600,
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      height: 72,
      paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
      background: "rgba(10, 6, 20, 0.97)",
      borderTop: "1px solid rgba(139, 92, 246, 0.12)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
    }}>
      {TABS.map((tab) => {
        const active = getActive(tab);

        if ((tab as any).isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => setLocation(tab.path)}
              style={{
                flex: 1,
                height: "100%",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                touchAction: "manipulation",
                position: "relative",
              }}
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: active
                  ? "linear-gradient(135deg, #7C3AED, #5B21B6)"
                  : "linear-gradient(135deg, #6D28D9, #4C1D95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: active
                  ? "0 0 24px rgba(124,58,237,0.6), 0 4px 16px rgba(0,0,0,0.5)"
                  : "0 0 16px rgba(124,58,237,0.35), 0 4px 12px rgba(0,0,0,0.4)",
                border: "2px solid rgba(167,139,250,0.3)",
                marginTop: -16,
              }}>
                {tab.icon(active)}
              </div>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                color: active ? "#A78BFA" : "rgba(255,255,255,0.35)",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                marginTop: 2,
              }}>
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setLocation(tab.path)}
            style={{
              flex: 1,
              height: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              touchAction: "manipulation",
              position: "relative",
            }}
          >
            {active && (
              <div style={{
                position: "absolute",
                top: 0,
                left: "25%",
                right: "25%",
                height: 2,
                background: "linear-gradient(90deg, transparent, #7C3AED, transparent)",
                borderRadius: "0 0 4px 4px",
              }} />
            )}
            <div style={{
              width: 40,
              height: 36,
              borderRadius: 12,
              background: active ? "rgba(124,58,237,0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {tab.icon(active)}
            </div>
            <span style={{
              fontSize: 9,
              fontWeight: active ? 800 : 600,
              color: active ? "#A78BFA" : "rgba(255,255,255,0.3)",
              letterSpacing: 0.4,
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
