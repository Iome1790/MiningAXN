import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { RiPlayCircleFill, RiCloseLine } from "react-icons/ri";
import { MdOutlineAdsClick } from "react-icons/md";

declare global {
  interface Window {
    show_10963365: (type?: any) => Promise<void>;
    Adsgram: { init: (opts: { blockId: string }) => { show: () => Promise<void> } };
  }
}

interface AdSlot {
  id: number;
  reward: number;
  maxWatches: number;
  watchedCount: number;
  totalAxn: number;
  network: "monetag" | "adsgram";
}

/* ─── Failure popup ─── */
function NotCountedPopup({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 12px 32px",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 420,
            background: "#0f0f1a",
            borderRadius: 22,
            border: "1px solid rgba(239,68,68,0.3)",
            padding: "22px 20px 20px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <MdOutlineAdsClick size={20} color="#ef4444" />
              </div>
              <p style={{ color: "#ef4444", fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>
                Ad doesn't counted
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <RiCloseLine size={20} color="rgba(255,255,255,0.4)" />
            </button>
          </div>

          {/* Instructions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                👆 Tap the blue button in each ad you watch
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5 }}>
                So the ad will be counted and your reward will be credited.
              </p>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12, padding: "12px 14px",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                🔗 Also tap the banner link inside each ad
              </p>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.5 }}>
                This boosts your reward and ensures the ad session is verified.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "13px",
              background: "linear-gradient(135deg,#2563eb,#3b82f6)",
              borderRadius: 12, border: "none",
              color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
            }}
          >
            Got it — Try Again
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Background time tracker ─── */
function useBackgroundTracker() {
  const trackingRef = useRef<{
    active: boolean;
    hiddenAt: number | null;
    totalAwayMs: number;
    listener: (() => void) | null;
  }>({ active: false, hiddenAt: null, totalAwayMs: 0, listener: null });

  const start = useCallback(() => {
    const state = trackingRef.current;
    state.active = true;
    state.hiddenAt = null;
    state.totalAwayMs = 0;

    const listener = () => {
      if (!state.active) return;
      if (document.hidden) {
        state.hiddenAt = Date.now();
      } else {
        if (state.hiddenAt !== null) {
          state.totalAwayMs += Date.now() - state.hiddenAt;
          state.hiddenAt = null;
        }
      }
    };
    state.listener = listener;
    document.addEventListener("visibilitychange", listener);
  }, []);

  const stop = useCallback((): number => {
    const state = trackingRef.current;
    state.active = false;
    // Capture any ongoing hidden period
    if (state.hiddenAt !== null) {
      state.totalAwayMs += Date.now() - state.hiddenAt;
      state.hiddenAt = null;
    }
    if (state.listener) {
      document.removeEventListener("visibilitychange", state.listener);
      state.listener = null;
    }
    return Math.floor(state.totalAwayMs / 1000); // return integer seconds
  }, []);

  return { start, stop };
}

/* ─── Main component ─── */
export default function AdsList() {
  const queryClient = useQueryClient();
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [showFailPopup, setShowFailPopup] = useState(false);
  const [failReason, setFailReason] = useState<"not_counted" | "cooldown" | null>(null);
  const [cooldownMsg, setCooldownMsg] = useState("");
  // Per-slot client cooldown (ms timestamp of last attempt)
  const slotCooldowns = useRef<Record<number, number>>({});
  const { start: startTracking, stop: stopTracking } = useBackgroundTracker();

  const { data, isLoading } = useQuery<{ slots: AdSlot[] }>({
    queryKey: ["/api/ad-slots"],
    staleTime: 10000,
  });

  const handleWatch = useCallback(async (slot: AdSlot) => {
    if (loadingSlot !== null) return;

    // Client-side cooldown check (30s)
    const lastAttempt = slotCooldowns.current[slot.id] ?? 0;
    const secsSince = (Date.now() - lastAttempt) / 1000;
    if (secsSince < 30 && lastAttempt > 0) {
      setCooldownMsg(`Please wait ${Math.ceil(30 - secsSince)}s before watching this ad again.`);
      setFailReason("cooldown");
      setShowFailPopup(true);
      return;
    }

    setLoadingSlot(slot.id);
    slotCooldowns.current[slot.id] = Date.now();

    // Start tracking background time BEFORE the ad
    startTracking();

    try {
      // Trigger the correct ad network
      if (slot.network === "monetag") {
        if (typeof window.show_10963365 !== "function") {
          stopTracking();
          showNotification("Ad not available right now. Try again.", "error");
          setLoadingSlot(null);
          return;
        }
        await window.show_10963365();
      } else {
        // AdGram
        if (!window.Adsgram) {
          stopTracking();
          showNotification("Ad not available right now. Try again.", "error");
          setLoadingSlot(null);
          return;
        }
        await window.Adsgram.init({ blockId: "int-29765" }).show();
      }
    } catch {
      // Ad was skipped or errored — still capture background time
    }

    // Stop tracking and get seconds spent away
    const backgroundSeconds = stopTracking();

    if (backgroundSeconds < 5) {
      setFailReason("not_counted");
      setShowFailPopup(true);
      setLoadingSlot(null);
      return;
    }

    // Submit to backend with verified background time
    try {
      const res = await apiRequest("POST", `/api/ad-slots/${slot.id}/watch`, { backgroundSeconds }).then(r => r.json());
      if (res.success) {
        showNotification(`+${res.earned} AXN earned!`, "success");
        queryClient.invalidateQueries({ queryKey: ["/api/ad-slots"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (res.notCounted) {
        setFailReason("not_counted");
        setShowFailPopup(true);
      } else if (res.tooFast) {
        setCooldownMsg(res.message || "Please wait before watching again.");
        setFailReason("cooldown");
        setShowFailPopup(true);
      } else {
        showNotification(res.message || "Failed to record watch", "error");
      }
    } catch {
      showNotification("Network error. Please try again.", "error");
    } finally {
      setLoadingSlot(null);
    }
  }, [loadingSlot, startTracking, stopTracking, queryClient]);

  const slots = data?.slots ?? [];

  if (isLoading && !data) {
    return (
      <div className="w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)" }}>
        <div style={cardStyle}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="animate-pulse"
              style={{ height: 64, background: "rgba(255,255,255,0.04)", borderRadius: 10, margin: "8px 14px" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)" }}>
        <div style={cardStyle}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>Ads</span>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 600 }}>
              {slots.reduce((a, s) => a + s.watchedCount, 0)} watched
            </span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginInline: 16, marginBottom: 6 }} />

          {slots.map((slot, idx) => {
            const isDone = slot.watchedCount >= slot.maxWatches;
            const pct = Math.min((slot.watchedCount / slot.maxWatches) * 100, 100);
            const isPending = loadingSlot === slot.id;
            const isMonetag = slot.network === "monetag";

            return (
              <div key={slot.id}>
                <div style={{ padding: "10px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    {/* Left: badge + name + reward + network tag */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: isDone ? "rgba(255,255,255,0.05)" : "rgba(59,130,246,0.12)",
                        border: isDone ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(59,130,246,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ color: isDone ? "rgba(255,255,255,0.3)" : "#60a5fa", fontSize: 12, fontWeight: 900 }}>
                          #{slot.id}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <p style={{ color: isDone ? "rgba(255,255,255,0.35)" : "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1 }}>
                            Ads #{slot.id}
                          </p>
                          <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                            padding: "2px 6px", borderRadius: 4,
                            background: isMonetag ? "rgba(168,85,247,0.18)" : "rgba(251,146,60,0.18)",
                            color: isMonetag ? "#c084fc" : "#fb923c",
                            border: `1px solid ${isMonetag ? "rgba(168,85,247,0.3)" : "rgba(251,146,60,0.3)"}`,
                            textTransform: "uppercase" as const,
                            whiteSpace: "nowrap" as const,
                          }}>
                            {isMonetag ? "Monetag" : "AdGram"}
                          </span>
                        </div>
                        <p style={{ color: isDone ? "rgba(255,255,255,0.2)" : "#4ade80", fontSize: 11, fontWeight: 700 }}>
                          +{slot.reward} AXN per watch
                        </p>
                      </div>
                    </div>

                    {/* Right: progress + button */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: isDone ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>
                          {slot.watchedCount}/{slot.maxWatches}
                        </p>
                        <p style={{ color: isDone ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600 }}>
                          = {slot.totalAxn} AXN
                        </p>
                      </div>

                      {isDone ? (
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700 }}>✓</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleWatch(slot)}
                          disabled={isPending || loadingSlot !== null}
                          className="active:scale-95 transition-transform"
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: "linear-gradient(135deg,#2563eb,#3b82f6)",
                            border: "none",
                            cursor: isPending || loadingSlot !== null ? "default" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 10px rgba(59,130,246,0.4)",
                            opacity: loadingSlot !== null && !isPending ? 0.4 : 1,
                          }}
                        >
                          {isPending ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                          ) : (
                            <RiPlayCircleFill size={14} color="#fff" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 8, width: "100%", height: 2.5, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5 }}
                      style={{
                        height: "100%", borderRadius: 4,
                        background: isDone ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg,#1d4ed8,#3b82f6)",
                        boxShadow: isDone ? "none" : "0 0 4px rgba(59,130,246,0.5)",
                      }}
                    />
                  </div>
                </div>

                {idx < slots.length - 1 && (
                  <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginInline: 16 }} />
                )}
              </div>
            );
          })}
          <div style={{ height: 6 }} />
        </div>
      </div>

      {/* Failure popup */}
      {showFailPopup && (
        failReason === "cooldown" ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed", inset: 0, zIndex: 999,
                background: "rgba(0,0,0,0.75)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                padding: "0 12px 32px",
              }}
              onClick={() => setShowFailPopup(false)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%", maxWidth: 420,
                  background: "#0f0f1a",
                  borderRadius: 22,
                  border: "1px solid rgba(245,158,11,0.3)",
                  padding: "22px 20px 20px",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
                }}
              >
                <p style={{ color: "#f59e0b", fontSize: 15, fontWeight: 900, marginBottom: 8 }}>⏳ Cooldown Active</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 18 }}>{cooldownMsg}</p>
                <button
                  onClick={() => setShowFailPopup(false)}
                  style={{
                    width: "100%", padding: "13px",
                    background: "linear-gradient(135deg,#d97706,#f59e0b)",
                    borderRadius: 12, border: "none",
                    color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <NotCountedPopup onClose={() => setShowFailPopup(false)} />
        )
      )}
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(18, 18, 28, 0.97)",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.07)",
  overflow: "hidden",
  marginInline: 10,
};
