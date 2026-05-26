import { useLocation } from "wouter";

const ACTIVE = "#ffffff";
const DIM = "rgba(255,255,255,0.38)";

const HomeIcon = ({ active, c }: { active: boolean; c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {active ? (
      <>
        <path d="M12 2.5L2 10.5V21a1 1 0 0 0 1 1h6v-6h6v6h6a1 1 0 0 0 1-1V10.5L12 2.5z" fill={c} />
      </>
    ) : (
      <>
        <path d="M3 12L12 4l9 8" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </>
    )}
  </svg>
);

const TasksIcon = ({ active, c }: { active: boolean; c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {active ? (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" fill={c} opacity="0.15"/>
        <rect x="3" y="4" width="18" height="16" rx="3" stroke={c} strokeWidth="1.8"/>
        <path d="M8 9h8M8 13h5M8 17h3" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      </>
    ) : (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" stroke={c} strokeWidth="1.8"/>
        <path d="M8 9h8M8 13h5M8 17h3" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

const FriendsIcon = ({ active, c }: { active: boolean; c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    {active ? (
      <>
        <circle cx="9" cy="7" r="4" fill={c} opacity="0.2" stroke={c} strokeWidth="1.8"/>
        <path d="M3 21c0-3.866 2.686-7 6-7s6 3.134 6 7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M21 21c0-3.866-1.79-7-4-7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      </>
    ) : (
      <>
        <circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.8"/>
        <path d="M3 21c0-3.866 2.686-7 6-7s6 3.134 6 7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M21 21c0-3.866-1.79-7-4-7" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

const TABS = [
  { id: "game",   label: "Home",    path: "/game",   },
  { id: "earn",   label: "Tasks",   path: "/earn",   },
  { id: "friend", label: "Friends", path: "/friend", },
] as const;

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const isOn = (tab: typeof TABS[number]) =>
    location === tab.path || (tab.id === "game" && (location === "/" || location.startsWith("/game")));

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      display: "flex", alignItems: "stretch",
      height: 72,
      paddingBottom: "max(var(--tg-content-safe-area-inset-bottom, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))), 6px)",
      background: "rgba(10,10,10,0.97)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)",
    }}>
      {TABS.map((tab) => {
        const on = isOn(tab);
        const c = on ? ACTIVE : DIM;

        return (
          <button
            key={tab.id}
            onClick={() => setLocation(tab.path)}
            style={{
              flex: 1, height: "100%", border: "none", background: "transparent",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 5, touchAction: "manipulation", position: "relative",
              padding: "6px 0 4px",
            }}
          >
            {on && (
              <div style={{
                position: "absolute", top: 0, left: "25%", right: "25%",
                height: 2, borderRadius: "0 0 3px 3px",
                background: ACTIVE,
              }} />
            )}

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 30,
            }}>
              {tab.id === "game"   && <HomeIcon    active={on} c={c} />}
              {tab.id === "earn"   && <TasksIcon   active={on} c={c} />}
              {tab.id === "friend" && <FriendsIcon active={on} c={c} />}
            </div>

            <span style={{
              fontSize: 10, fontWeight: on ? 700 : 500,
              letterSpacing: "0.03em",
              color: c,
              lineHeight: 1,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
