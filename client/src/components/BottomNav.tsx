import { useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";

const TABS = [
  {
    label: "Games",
    path: "/game",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="4"/>
        <line x1="8" y1="12" x2="12" y2="12"/>
        <line x1="10" y1="10" x2="10" y2="14"/>
        <circle cx="16" cy="11" r="0.9" fill={active ? "#fff" : "rgba(255,255,255,0.4)"} stroke="none"/>
        <circle cx="18" cy="13" r="0.9" fill={active ? "#fff" : "rgba(255,255,255,0.4)"} stroke="none"/>
      </svg>
    ),
  },
  {
    label: "Offers",
    path: "/offers",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        height: 64, paddingBottom: "max(calc(env(safe-area-inset-bottom) + 4px), 8px)",
        background: "#111111",
        borderTop: "1px solid rgba(255,255,255,0.07)",
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
              }}
            >
              <div style={{
                width: 44, height: 32, borderRadius: 10,
                background: active ? "rgba(255,255,255,0.12)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}>
                {icon(active)}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 500,
                color: active ? "#fff" : "rgba(255,255,255,0.38)",
                letterSpacing: 0.2,
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
              position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
              background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)",
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
