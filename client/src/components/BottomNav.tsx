import { useLocation } from "wouter";

const GOLD = "#F5C400";
const DIM = "rgba(255,255,255,0.28)";

const MineIcon = ({ c }: { c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C10.9 2 10 2.9 10 4v1H8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1v1.5L5.5 16H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1.5L15 12.5V11h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V4c0-1.1-.9-2-2-2z"
      stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    <rect x="8" y="7" width="8" height="4" rx="1" stroke={c} strokeWidth="1.4" fill="none"/>
    <circle cx="10" cy="9" r="0.8" fill={c}/>
    <circle cx="14" cy="9" r="0.8" fill={c}/>
    <path d="M10 18h4" stroke={c} strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const TasksIcon = ({ c }: { c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3" stroke={c} strokeWidth="1.8" />
    <path d="M8 9h8M8 13h5M8 17h3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const FriendsIcon = ({ c }: { c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.8" />
    <path d="M3 21c0-3.866 2.686-7 6-7h0c3.314 0 6 3.134 6 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M21 21c0-3.866-1.79-7-4-7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const WalletIcon = ({ c }: { c: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="6" width="20" height="14" rx="3" stroke={c} strokeWidth="1.8" />
    <path d="M2 10h20" stroke={c} strokeWidth="1.6" />
    <rect x="15" y="13" width="4" height="3" rx="1.5" fill={c} />
    <path d="M6 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" stroke={c} strokeWidth="1.6" />
  </svg>
);

const TABS = [
  { id: "game",   label: "Mine",    path: "/game",   Icon: MineIcon    },
  { id: "earn",   label: "Tasks",   path: "/earn",   Icon: TasksIcon   },
  { id: "friend", label: "Friends", path: "/friend", Icon: FriendsIcon },
  { id: "wallet", label: "Wallet",  path: "/wallet", Icon: WalletIcon  },
] as const;

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const isOn = (tab: typeof TABS[number]) =>
    location === tab.path || (tab.id === "game" && location.startsWith("/game"));

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      display: "flex", alignItems: "stretch",
      height: 72,
      paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
      background: "#0d0d0d",
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}>
      {TABS.map((tab) => {
        const on = isOn(tab);
        const c = on ? GOLD : DIM;

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
                position: "absolute", top: 0, left: "22%", right: "22%",
                height: 2.5, borderRadius: "0 0 4px 4px",
                background: GOLD,
                boxShadow: `0 0 10px ${GOLD}88`,
              }} />
            )}

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 40, height: 32,
            }}>
              <tab.Icon c={c} />
            </div>

            <span style={{
              fontSize: 10, fontWeight: on ? 800 : 500,
              letterSpacing: "0.04em",
              color: on ? GOLD : DIM,
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
