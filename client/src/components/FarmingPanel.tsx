import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { AXNIcon } from "@/components/AXNIcon";
import { RiTimerLine, RiSpeedLine, RiCoinsLine } from "react-icons/ri";
import { BsLightningChargeFill } from "react-icons/bs";

const FARMING_RATE = 0.01;
const FARMING_DURATION = 2 * 60 * 60;

interface FarmingState {
  isActive: boolean;
  startedAt: string | null;
  minedAxn: number;
  remainingSeconds: number;
  elapsedSeconds: number;
}

interface FarmingPanelProps {
  onWalletOpen?: () => void;
  onInviteOpen?: () => void;
  onProfileOpen?: () => void;
  onRoadmapChange?: (open: boolean) => void;
}

export default function FarmingPanel({ onWalletOpen }: FarmingPanelProps) {
  const queryClient = useQueryClient();
  const [localElapsed, setLocalElapsed] = useState(0);

  const { data: farmingData, isLoading } = useQuery<FarmingState>({
    queryKey: ["/api/farming/state"],
    refetchInterval: 30000,
    staleTime: 10000,
  });

  useEffect(() => {
    if (!farmingData?.isActive || !farmingData.startedAt) {
      setLocalElapsed(farmingData?.elapsedSeconds ?? 0);
      return;
    }
    const startedAt = new Date(farmingData.startedAt).getTime();
    const tick = () =>
      setLocalElapsed(Math.min(Math.floor((Date.now() - startedAt) / 1000), FARMING_DURATION));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [farmingData?.isActive, farmingData?.startedAt, farmingData?.elapsedSeconds]);

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/farming/start").then((r) => r.json()),
    onSuccess: (d) => {
      if (d.success) {
        showNotification("Mining started!", "success");
        queryClient.invalidateQueries({ queryKey: ["/api/farming/state"] });
      } else showNotification(d.message || "Failed to start", "error");
    },
    onError: () => showNotification("Failed to start mining", "error"),
  });

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/farming/claim").then((r) => r.json()),
    onSuccess: (d) => {
      if (d.success) {
        showNotification(`+${d.amount} AXN collected!`, "success");
        queryClient.invalidateQueries({ queryKey: ["/api/farming/state"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else showNotification(d.message || "Nothing to collect", "error");
    },
    onError: () => showNotification("Failed to collect", "error"),
  });

  const isFarmingDone = localElapsed >= FARMING_DURATION;
  const isIdle = !farmingData?.isActive;
  const isFarming = !!(farmingData?.isActive && !isFarmingDone);
  const isReady = !!(farmingData?.isActive && isFarmingDone);

  const minedNow = parseFloat(
    Math.min(localElapsed * FARMING_RATE, FARMING_DURATION * FARMING_RATE).toFixed(4)
  );
  const remaining = Math.max(0, FARMING_DURATION - localElapsed);
  const progressPct = Math.min((localElapsed / FARMING_DURATION) * 100, 100);

  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  /* ─── Action button ─── */
  const ActionButton = () => {
    if (claimMutation.isPending || startMutation.isPending) {
      return (
        <div style={btnBase("rgba(255,255,255,0.10)", false)}>
          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
        </div>
      );
    }
    if (isReady) {
      return (
        <button
          onClick={() => claimMutation.mutate()}
          className="active:scale-95 transition-transform"
          style={{
            ...btnBase("linear-gradient(135deg,#22c55e,#16a34a)", true),
            boxShadow: "0 3px 16px rgba(34,197,94,0.45)",
          }}
        >
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>Collect</span>
        </button>
      );
    }
    if (isFarming) {
      return (
        <div style={btnBase("rgba(255,255,255,0.07)", false)}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700 }}>Mining…</span>
        </div>
      );
    }
    return (
      <button
        onClick={() => startMutation.mutate()}
        className="active:scale-95 transition-transform"
        style={{
          ...btnBase("linear-gradient(135deg,#2563eb,#3b82f6)", true),
          boxShadow: "0 3px 16px rgba(59,130,246,0.4)",
        }}
      >
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>Start</span>
      </button>
    );
  };

  if (isLoading && !farmingData) {
    return (
      <div className="w-full px-3 pt-3 space-y-2 pb-24">
        {[56, 56, 56].map((h, i) => (
          <div
            key={i}
            className="w-full animate-pulse"
            style={{
              height: h,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)" }}
    >
      {/* ── Token-list-style outer card — full width, slides under header ── */}
      <div
        style={{
          background: "rgba(18, 18, 28, 0.97)",
          borderRadius: "22px 22px 22px 22px",
          border: "1px solid rgba(255,255,255,0.07)",
          overflow: "hidden",
          marginInline: 10,
        }}
      >
        {/* Card header row — like "Token list … All" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 10px",
          }}
        >
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "0.01em" }}>
            Mine
          </span>
          <span
            style={{
              color: "#3b82f6",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            AXN
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginInline: 16 }} />

        {/* Mining row — styled like a token row */}
        <div style={{ padding: "14px 16px 4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* Left: AXN icon + title + mined amount */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {/* Icon circle */}
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: isReady
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(59,130,246,0.1)",
                  border: isReady
                    ? "1.5px solid rgba(34,197,94,0.3)"
                    : "1.5px solid rgba(59,130,246,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AXNIcon size={24} />
              </div>

              {/* Text */}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: "#fff", fontSize: 14, fontWeight: 800, lineHeight: 1.2, marginBottom: 2 }}>
                  AXN Mining
                </p>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600 }}>
                  {isIdle
                    ? "Ready to start"
                    : isFarming
                    ? `${hh}:${mm}:${ss} left`
                    : "Ready to collect!"}
                </p>
              </div>
            </div>

            {/* Right: amount + button */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <p style={{ color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1 }}>
                {minedNow.toFixed(4)}
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, marginLeft: 3 }}>AXN</span>
              </p>
              <ActionButton />
            </div>
          </div>

          {/* Progress bar */}
          {(isFarming || isReady) && (
            <div style={{ marginTop: 12, marginBottom: 2 }}>
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6 }}
                  style={{
                    height: "100%",
                    borderRadius: 4,
                    background: isReady
                      ? "linear-gradient(90deg,#16a34a,#22c55e)"
                      : "linear-gradient(90deg,#1d4ed8,#3b82f6)",
                    boxShadow: isReady
                      ? "0 0 6px rgba(34,197,94,0.5)"
                      : "0 0 6px rgba(59,130,246,0.5)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              paddingTop: 10,
              paddingBottom: 14,
              borderTop: "1px solid rgba(255,255,255,0.04)",
              marginTop: 12,
            }}
          >
            {[
              { Icon: RiSpeedLine, label: "Speed", value: "0.01/s" },
              {
                Icon: RiTimerLine,
                label: isFarming ? "Remaining" : "Duration",
                value: isFarming ? `${hh}:${mm}:${ss}` : isReady ? "✓ Done" : "2h 00m",
              },
              { Icon: RiCoinsLine, label: "Max earn", value: "72 AXN" },
            ].map(({ Icon, label, value }) => (
              <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Icon size={10} color="rgba(255,255,255,0.28)" />
                  <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                  </span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 800, fontFamily: label === "Remaining" || label === "Duration" ? "monospace" : "inherit" }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function btnBase(bg: string, clickable: boolean): React.CSSProperties {
  return {
    borderRadius: 50,
    padding: "7px 16px",
    background: bg,
    border: "none",
    cursor: clickable ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap" as const,
  };
}
