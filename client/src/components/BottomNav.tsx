import { useLocation } from "wouter";

const BLUE_L = "#60a5fa";
const DIM = "rgba(255,255,255,0.3)";

/* ── Icons ── */
const EarnIcon = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z"
      stroke={c} strokeWidth="2" strokeLinejoin="round" />
    <path d="M2 17l10 5 10-5"
      stroke={c} strokeWidth="2" strokeLinejoin="round" />
    <path d="M2 12l10 5 10-5"
      stroke={c} strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const MineIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    {/* Outer ring */}
    <circle cx="12" cy="12" r="9"
      stroke="white" strokeWidth="1.6"
      fill="rgba(255,255,255,0.08)" />
    {/* Tick mark */}
    <path d="M8 12.5l2.5 2.5 5.5-5.5"
      stroke="white" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" />
    {/* Cardinal dashes */}
    <line x1="12" y1="3" x2="12" y2="1.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="12" y1="21" x2="12" y2="22.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="3" y1="12" x2="1.5" y2="12" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="21" y1="12" x2="22.5" y2="12" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const ReferIcon = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="4" stroke={c} strokeWidth="1.9" />
    <path d="M3 21c0-3.866 2.686-7 6-7"
      stroke={c} strokeWidth="1.9" strokeLinecap="round" />
    <circle cx="17" cy="9" r="3" stroke={c} strokeWidth="1.7" />
    <path d="M13.5 21c0-2.761 1.567-5 3.5-5s3.5 2.239 3.5 5"
      stroke={c} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const WalletIcon = ({ c }: { c: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="6" width="20" height="14" rx="3"
      stroke={c} strokeWidth="1.9"
      fill={c === BLUE_L ? "rgba(96,165,250,0.1)" : "none"} />
    <path d="M2 11h20" stroke={c} strokeWidth="1.7" />
    <rect x="15" y="13.5" width="4.5" height="3" rx="1.5" fill={c} />
    <path d="M6 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"
      stroke={c} strokeWidth="1.6" />
  </svg>
);

/* ── Tab config ── */
const TABS = [
  { id: "earn",   label: "Earn",   path: "/earn"   },
  { id: "game",   label: "Mine",   path: "/game",  center: true },
  { id: "friend", label: "Refer",  path: "/friend" },
  { id: "wallet", label: "Wallet", path: "/wallet" },
] as const;

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const isOn = (tab: typeof TABS[number]) =>
    (tab as any).center ? location.startsWith("/game") : location === tab.path;

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
      display: "flex", alignItems: "center",
      height: 66, paddingBottom: "max(env(safe-area-inset-bottom), 4px)",
      background: "rgba(0,0,0,0.97)",
      borderTop: "1px solid rgba(59,130,246,0.1)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.8)",
    }}>
      {TABS.map((tab) => {
        const on = isOn(tab);

        /* ── Center raised button ── */
        if ((tab as any).center) {
          return (
            <button key={tab.id} onClick={() => setLocation(tab.path)} style={{
              flex: 1, height: "100%", border: "none", background: "transparent",
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 2, touchAction: "manipulation",
            }}>
              <div style={{
                width: 54, height: 54, borderRadius: "50%",
                background: on
                  ? "linear-gradient(145deg, #2563eb, #1d4ed8)"
                  : "linear-gradient(145deg, #1e40af, #1e3a8a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: -16,
                border: "2.5px solid rgba(96,165,250,0.35)",
                boxShadow: on
                  ? "0 0 0 4px rgba(37,99,235,0.2), 0 6px 24px rgba(37,99,235,0.65), 0 2px 8px rgba(0,0,0,0.6)"
                  : "0 0 0 3px rgba(37,99,235,0.12), 0 6px 20px rgba(0,0,0,0.7)",
                transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <MineIcon />
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                textTransform: "uppercase", marginTop: 1,
                color: on ? BLUE_L : "rgba(255,255,255,0.25)",
              }}>{tab.label}</span>
            </button>
          );
        }

        /* ── Regular tabs ── */
        const c = on ? BLUE_L : DIM;

        return (
          <button key={tab.id} onClick={() => setLocation(tab.path)} style={{
            flex: 1, height: "100%", border: "none", background: "transparent",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 4, touchAction: "manipulation", position: "relative",
          }}>
            {/* Top line when active */}
            {on && (
              <div style={{
                position: "absolute", top: 0, left: "15%", right: "15%",
                height: 2, borderRadius: "0 0 4px 4px",
                background: `linear-gradient(90deg, transparent, ${BLUE_L}, transparent)`,
              }} />
            )}

            {/* Icon area */}
            <div style={{
              width: 44, height: 34, borderRadius: 11,
              background: on ? "rgba(59,130,246,0.1)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {tab.id === "earn"   && <EarnIcon   c={c} />}
              {tab.id === "friend" && <ReferIcon  c={c} />}
              {tab.id === "wallet" && <WalletIcon c={c} />}
            </div>

            <span style={{
              fontSize: 9, fontWeight: on ? 800 : 500,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: on ? BLUE_L : "rgba(255,255,255,0.25)",
              lineHeight: 1,
            }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
