import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import {
  Wallet, ArrowLeftRight, Zap, Lock, Globe,
  AlertTriangle, Trash2, RefreshCw, CheckCircle,
} from "lucide-react";

const MIGRATION_FEE = 500;
const MIN_SWAP = 2000;

interface MigrationStatus {
  miningBalance: number;
  walletBalance: number;
  migrationCompleted: boolean;
  migrationIntroSeen: boolean;
}

interface Props {
  onComplete: () => void;
}

type Screen = "s1" | "s2" | "s3";

export default function Season2MigrationFlow({ onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>("s1");
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: migrationStatus, isLoading } = useQuery<MigrationStatus>({
    queryKey: ["/api/migration/status"],
    staleTime: 60000,
    retry: 1,
  });

  const introSeenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/migration/intro-seen", {}).then(r => r.json()),
  });

  const swapMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/migration/swap", {}).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showNotification(data.error, "error"); return; }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/migration/status"] });
      showNotification(`Migration complete! ${data.walletBalance?.toLocaleString()} AXN added to wallet.`, "success");
      onComplete();
    },
    onError: () => showNotification("Migration failed. Please try again.", "error"),
  });

  const burnMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/migration/burn", {}).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/migration/status"] });
      showNotification(miningBalance === 0 ? "Welcome to Season 2!" : "Balance burned. Welcome to Season 2!", "success");
      onComplete();
    },
    onError: () => showNotification("Failed. Please try again.", "error"),
  });

  const miningBalance = migrationStatus?.miningBalance ?? 0;
  const walletReceives = Math.max(0, miningBalance - MIGRATION_FEE);
  const canSwap = miningBalance >= MIN_SWAP;

  const handleGoToS3 = () => {
    introSeenMutation.mutate();
    setScreen("s3");
  };

  if (isLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", animation: "migDot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", overflow: "hidden" }}>
      <style>{`
        @keyframes migDot { 0%,80%,100%{transform:translateY(0);opacity:0.35} 40%{transform:translateY(-10px);opacity:1} }
        @keyframes migGlow { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes migSpin { to{transform:rotate(360deg)} }
        @keyframes migSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes migFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes migFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      {/* ── SCREEN 1: Season 1 Has Ended ── */}
      {screen === "s1" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", animation: "migFadeIn 0.4s ease" }}>

          {/* Decorative bg — pointer events off */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(37,99,235,0.15) 0%, transparent 68%)", pointerEvents: "none" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 360 }}>

            {/* Logo */}
            <div style={{ animation: "migFloat 3s ease-in-out infinite", marginBottom: 32 }}>
              <div style={{ width: 96, height: 96, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.45)", overflow: "hidden", boxShadow: "0 0 36px rgba(37,99,235,0.45)" }}>
                <img src="/axn-coin-new.png" alt="AXN" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.18)" }} />
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 24, animation: "migSlideUp 0.5s ease 0.1s both" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(59,130,246,0.65)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
                AXN Network
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: "#fff", margin: "0 0 12px", lineHeight: 1.15, letterSpacing: "-0.5px" }}>
                Season 1<br />
                <span style={{ color: "#3b82f6" }}>Has Ended</span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.65, margin: 0, maxWidth: 270 }}>
                The mining phase is officially completed. Thank you for being part of Season 1.
              </p>
            </div>

            {/* Status badge */}
            <div style={{ animation: "migSlideUp 0.5s ease 0.2s both", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 50, padding: "7px 18px", marginBottom: 32, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "migGlow 1.5s ease-in-out infinite" }} />
              <span style={{ color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>Mining Phase — Stopped</span>
            </div>

            {/* Continue button — no arrow */}
            <button
              onClick={() => setScreen("s2")}
              style={{
                animation: "migSlideUp 0.5s ease 0.3s both",
                position: "relative", zIndex: 2,
                width: "100%",
                padding: "15px",
                background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: 15, fontWeight: 900, cursor: "pointer",
                boxShadow: "0 4px 28px rgba(37,99,235,0.45)",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── SCREEN 2: Welcome to Season 2 ── */}
      {screen === "s2" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", animation: "migSlideUp 0.4s ease" }}>

          {/* Decorative bg — pointer events off */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)", pointerEvents: "none" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 360 }}>

            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(96,165,250,0.75)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
                What&apos;s New
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 0 10px", lineHeight: 1.15, letterSpacing: "-0.5px" }}>
                Welcome to<br />
                <span style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Season 2</span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6, maxWidth: 275 }}>
                AXN is evolving into a full wallet ecosystem with powerful new features.
              </p>
            </div>

            {/* Feature list */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
              {[
                { Icon: Wallet,        title: "Wallet System",   desc: "Secure digital wallet for your AXN" },
                { Icon: ArrowLeftRight, title: "Send & Receive",  desc: "Transfer AXN to anyone instantly" },
                { Icon: Zap,           title: "Rewards",         desc: "Earn daily rewards and bonuses" },
                { Icon: Lock,          title: "Staking",         desc: "Stake AXN for passive income" },
                { Icon: Globe,         title: "Ecosystem",       desc: "DeFi, NFTs, and more coming soon" },
              ].map(({ Icon, title, desc }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.13)", borderRadius: 13, padding: "11px 15px", animation: `migSlideUp 0.4s ease ${0.04 + i * 0.05}s both` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.15)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} color="#60a5fa" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>{title}</div>
                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons — no arrows */}
            <div style={{ width: "100%", display: "flex", gap: 10 }}>
              <button
                onClick={() => setScreen("s1")}
                style={{ flex: "0 0 auto", padding: "14px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 700, cursor: "pointer", position: "relative", zIndex: 2 }}
              >
                Back
              </button>
              <button
                onClick={handleGoToS3}
                style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", borderRadius: 13, color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 22px rgba(37,99,235,0.4)", position: "relative", zIndex: 2 }}
              >
                Continue to Migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCREEN 3: Migration Action ── */}
      {screen === "s3" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflowY: "auto", animation: "migSlideUp 0.4s ease" }}>

          {/* Decorative bg — pointer events off */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)", pointerEvents: "none" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px 48px" }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(59,130,246,0.75)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
                Action Required
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
                Migrate Your Balance
              </h1>
              <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 1.6, maxWidth: 275 }}>
                Choose what to do with your Season 1 mining balance before entering.
              </p>
            </div>

            {/* Mining Balance Card */}
            <div style={{ width: "100%", maxWidth: 340, background: "linear-gradient(135deg, rgba(37,99,235,0.14), rgba(59,130,246,0.06))", border: "1px solid rgba(59,130,246,0.28)", borderRadius: 18, padding: "18px 20px", marginBottom: 14, position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)", pointerEvents: "none" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
                Mining Balance (Season 1)
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>
                  {miningBalance.toLocaleString()}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>AXN</span>
              </div>
              {miningBalance > 0 && miningBalance < MIN_SWAP && (
                <div style={{ marginTop: 8, padding: "5px 10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 7 }}>
                  <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 600 }}>Below minimum ({MIN_SWAP.toLocaleString()} AXN). Only burn is available.</span>
                </div>
              )}
              {miningBalance === 0 && (
                <div style={{ marginTop: 8, padding: "5px 10px", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.18)", borderRadius: 7 }}>
                  <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 11 }}>No mining balance — proceed directly.</span>
                </div>
              )}
            </div>

            {/* Swap Card */}
            {canSwap && (
              <div style={{ width: "100%", maxWidth: 340, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, padding: "16px 18px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(37,99,235,0.2)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ArrowLeftRight size={16} color="#60a5fa" strokeWidth={2} />
                  </div>
                  <div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>Swap to Wallet</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Convert mining balance to wallet</div>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 13px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 12 }}>Mining Balance</span>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{miningBalance.toLocaleString()} AXN</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 12 }}>Migration Fee</span>
                    <span style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>– {MIGRATION_FEE.toLocaleString()} AXN</span>
                  </div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 8 }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, fontWeight: 700 }}>Wallet Receives</span>
                    <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 900 }}>{walletReceives.toLocaleString()} AXN</span>
                  </div>
                </div>

                <button
                  onClick={() => swapMutation.mutate()}
                  disabled={swapMutation.isPending}
                  style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: 900, cursor: swapMutation.isPending ? "not-allowed" : "pointer", opacity: swapMutation.isPending ? 0.7 : 1, boxShadow: "0 4px 18px rgba(37,99,235,0.38)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >
                  {swapMutation.isPending
                    ? <RefreshCw size={15} color="white" style={{ animation: "migSpin 0.8s linear infinite" }} />
                    : "Swap Now"
                  }
                </button>
              </div>
            )}

            {/* Burn / Enter Card */}
            <div style={{ width: "100%", maxWidth: 340, background: miningBalance === 0 ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.04)", border: `1px solid ${miningBalance === 0 ? "rgba(255,255,255,0.09)" : "rgba(239,68,68,0.18)"}`, borderRadius: 18, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: miningBalance === 0 ? "rgba(37,99,235,0.2)" : "rgba(239,68,68,0.12)", border: `1px solid ${miningBalance === 0 ? "rgba(59,130,246,0.25)" : "rgba(239,68,68,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {miningBalance === 0
                    ? <CheckCircle size={16} color="#60a5fa" strokeWidth={2} />
                    : <Trash2 size={16} color="#f87171" strokeWidth={2} />
                  }
                </div>
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>
                    {miningBalance === 0 ? "Enter App" : "Burn Balance"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>
                    {miningBalance === 0 ? "No balance — proceed directly" : "Permanently delete mining balance"}
                  </div>
                </div>
              </div>

              {miningBalance > 0 && (
                <div style={{ padding: "7px 11px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.14)", borderRadius: 8, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <AlertTriangle size={13} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: "#fca5a5", fontSize: 11 }}>This will permanently delete {miningBalance.toLocaleString()} AXN with no recovery.</span>
                </div>
              )}

              <button
                onClick={() => {
                  if (miningBalance === 0) {
                    burnMutation.mutate();
                  } else {
                    setShowBurnConfirm(true);
                  }
                }}
                disabled={burnMutation.isPending}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: miningBalance === 0 ? "linear-gradient(135deg, #1d4ed8, #3b82f6)" : "rgba(239,68,68,0.1)",
                  border: miningBalance === 0 ? "none" : "1px solid rgba(239,68,68,0.28)",
                  borderRadius: 11,
                  color: miningBalance === 0 ? "#fff" : "#fca5a5",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: burnMutation.isPending ? "not-allowed" : "pointer",
                  opacity: burnMutation.isPending ? 0.7 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                {burnMutation.isPending
                  ? <RefreshCw size={15} color={miningBalance === 0 ? "white" : "#fca5a5"} style={{ animation: "migSpin 0.8s linear infinite" }} />
                  : miningBalance === 0
                    ? "Enter App"
                    : "Burn Balance"
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Burn Confirm Popup ── */}
      {showBurnConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={() => setShowBurnConfirm(false)} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 310, background: "#0d0d0f", border: "1px solid rgba(239,68,68,0.28)", borderRadius: 22, padding: "26px 22px", textAlign: "center", boxShadow: "0 8px 48px rgba(239,68,68,0.18)" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <AlertTriangle size={24} color="#f87171" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Confirm Burn</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6, marginBottom: 5 }}>
              This action <span style={{ color: "#f87171", fontWeight: 700 }}>cannot be undone</span>.
            </div>
            <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 22 }}>
              {miningBalance.toLocaleString()} AXN will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowBurnConfirm(false)}
                style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowBurnConfirm(false); burnMutation.mutate(); }}
                style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #dc2626, #ef4444)", border: "none", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.32)" }}
              >
                Burn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
