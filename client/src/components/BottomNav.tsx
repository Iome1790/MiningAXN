import { useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";

const TABS = [
  {
    label: "Games",
    path: "/game",
    icon: (active: boolean) => (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Controller body */}
        <rect x="2" y="6" width="20" height="12" rx="5" fill={active ? "rgba(255,255,255,0.15)" : "transparent"} stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="1.8"/>
        {/* D-pad cross */}
        <line x1="7" y1="12" x2="11" y2="12" stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="2.2"/>
        <line x1="9" y1="10" x2="9" y2="14" stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="2.2"/>
        {/* Buttons */}
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
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "rgba(255,255,255,0.38)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
  const [toast, setToast] = useState(false);

  const handleClick = (label: string, path: string) => {
    if (label === "Offers") {
      if (toast) return;
      setToast(true);
      setTimeout(() => setToast(false), 2000);
      return;
    }
    setLocation(path);
  };

  return (
    <>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 600,
        display: "flex", justifyContent: "space-around", alignItems: "center",
        height: 72, paddingBottom: "max(calc(env(safe-area-inset-bottom) + 4px), 8px)",
        background: "linear-gradient(180deg, #0e0e10 0%, #0a0a0c 100%)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
      }}>
        {TABS.map(({ label, path, icon }) => {
          const active = label === "Games" ? location.startsWith("/game") : false;
          return (
            <button
              key={label}
              onClick={() => handleClick(label, path)}
              style={{
                flex: 1, height: "100%", border: "none", background: "transparent",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
                touchAction: "manipulation",
              }}
            >
              <div style={{
                width: 54, height: 36, borderRadius: 12,
                background: active
                  ? "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(59,130,246,0.15))"
                  : "transparent",
                border: active ? "1px solid rgba(124,58,237,0.35)" : "1px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: active ? "0 0 16px rgba(124,58,237,0.25)" : "none",
              }}>
                {icon(active)}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 800 : 500,
                color: active ? "#fff" : "rgba(255,255,255,0.35)",
                letterSpacing: active ? 0.5 : 0.2,
                textTransform: "uppercase",
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            style={{
              position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
              background: "#1a1a1e", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, padding: "12px 28px", zIndex: 700,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)", whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <p style={{ color: "white", fontSize: 14, fontWeight: 700, margin: 0, textAlign: "center" }}>Coming Soon</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: "3px 0 0", textAlign: "center" }}>Offers will be available soon</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
