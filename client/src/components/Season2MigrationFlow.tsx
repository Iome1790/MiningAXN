import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import {
  IoWallet, IoPaperPlane, IoDownload, IoLockClosed, IoEarth,
  IoFlash, IoFlame, IoCheckmarkCircle, IoSwapHorizontal,
  IoRefresh, IoAlertCircle,
} from "react-icons/io5";

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
type SlideDir = "forward" | "back";

const FEATURES = [
  { Icon: IoWallet,       title: "Wallet System",  desc: "Secure digital wallet for your AXN" },
  { Icon: IoPaperPlane,   title: "Send & Receive",  desc: "Transfer AXN to anyone instantly" },
  { Icon: IoFlash,        title: "Rewards",         desc: "Earn daily rewards and bonuses" },
  { Icon: IoLockClosed,   title: "Staking",         desc: "Stake AXN for passive income" },
  { Icon: IoEarth,        title: "Ecosystem",       desc: "DeFi, NFTs, and more coming soon" },
];

export default function Season2MigrationFlow({ onComplete }: Props) {
  const [screen, setScreen]           = useState<Screen>("s1");
  const [slideDir, setSlideDir]       = useState<SlideDir>("forward");
  const [animKey, setAnimKey]         = useState(0);
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const [swapInput, setSwapInput]     = useState("");
  const [inputError, setInputError]   = useState("");
  const [shakeError, setShakeError]   = useState(false);
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: migrationStatus, isLoading } = useQuery<MigrationStatus>({
    queryKey: ["/api/migration/status"],
    staleTime: 60000,
    retry: 1,
  });

  const miningBalance = migrationStatus?.miningBalance ?? 0;

  useEffect(() => {
    if (miningBalance > 0 && swapInput === "") {
      setSwapInput(String(miningBalance));
    }
  }, [miningBalance]);

  const swapAmt    = Math.floor(Number(swapInput) || 0);
  const swapFee    = Math.floor(swapAmt / 2);
  const walletGets = swapAmt - swapFee;
  const canSwap    = miningBalance >= MIN_SWAP;

  const introSeenMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/migration/intro-seen", {}).then(r => r.json()),
  });

  const swapMutation = useMutation({
    mutationFn: (amount: number) =>
      apiRequest("POST", "/api/migration/swap", { amount }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.error) { showNotification(data.error, "error"); return; }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/migration/status"] });
      showNotification(`Done! ${data.walletBalance?.toLocaleString()} AXN added to wallet.`, "success");
      onComplete();
    },
    onError: () => showNotification("Swap failed. Please try again.", "error"),
  });

  const burnMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/migration/burn", {}).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/migration/status"] });
      showNotification(miningBalance === 0 ? "Welcome to Season 2!" : "Balance burned. Welcome!", "success");
      onComplete();
    },
    onError: () => showNotification("Failed. Please try again.", "error"),
  });

  const navigate = (to: Screen, dir: SlideDir) => {
    setSlideDir(dir);
    setAnimKey(k => k + 1);
    setScreen(to);
  };

  const handleGoToS3 = () => {
    introSeenMutation.mutate();
    navigate("s3", "forward");
  };

  const triggerError = (msg: string) => {
    setInputError(msg);
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const handleSwap = () => {
    if (swapAmt < MIN_SWAP) {
      triggerError(`Minimum swap is ${MIN_SWAP.toLocaleString()} AXN`);
      inputRef.current?.focus();
      return;
    }
    if (swapAmt > miningBalance) {
      triggerError(`Exceeds your balance of ${miningBalance.toLocaleString()} AXN`);
      inputRef.current?.focus();
      return;
    }
    setInputError("");
    swapMutation.mutate(swapAmt);
  };

  const handleInputChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, "");
    setSwapInput(clean);
    const n = Number(clean);
    if (clean === "") { setInputError(""); return; }
    if (n < MIN_SWAP)        setInputError(`Min ${MIN_SWAP.toLocaleString()} AXN`);
    else if (n > miningBalance) setInputError(`Max ${miningBalance.toLocaleString()} AXN`);
    else                     setInputError("");
  };

  const safeTop = "var(--tg-content-safe-area-inset-top, var(--tg-safe-area-inset-top, 0px))";

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

  const slideAnim = slideDir === "forward"
    ? "migSlideInRight 0.38s cubic-bezier(0.25,0.8,0.25,1) both"
    : "migSlideInLeft 0.38s cubic-bezier(0.25,0.8,0.25,1) both";

  /* ─── shared icon glow style ─── */
  const iconGlow = (color: string) => ({
    flexShrink: 0 as const,
    filter: `drop-shadow(0 0 6px ${color})`,
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", overflow: "hidden" }}>
      <style>{`
        @keyframes migDot { 0%,80%,100%{transform:translateY(0);opacity:0.35} 40%{transform:translateY(-10px);opacity:1} }
        @keyframes migGlow { 0%,100%{opacity:0.28} 50%{opacity:0.85} }
        @keyframes migSpin { to{transform:rotate(360deg)} }
        @keyframes migFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes migFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes migSlideUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes migSlideInRight { from{opacity:0;transform:translateX(42px)} to{opacity:1;transform:translateX(0)} }
        @keyframes migSlideInLeft  { from{opacity:0;transform:translateX(-42px)} to{opacity:1;transform:translateX(0)} }
        @keyframes migShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes migErrorIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes migPulse { 0%,100%{box-shadow:0 4px 28px rgba(37,99,235,0.45)} 50%{box-shadow:0 4px 38px rgba(37,99,235,0.75)} }
      `}</style>

      {/* ────────────── SCREEN 1 ────────────── */}
      {screen === "s1" && (
        <div
          key={`s1-${animKey}`}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            paddingTop: safeTop, paddingLeft: 24, paddingRight: 24, paddingBottom: 32,
            animation: animKey === 0 ? "migFadeIn 0.4s ease" : slideAnim,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 35%, rgba(37,99,235,0.16) 0%, transparent 68%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 340 }}>

            {/* Logo */}
            <div style={{ animation: "migFloat 3.2s ease-in-out infinite", marginBottom: 28 }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 70%)", animation: "migGlow 2.5s ease-in-out infinite", pointerEvents: "none" }} />
                <div style={{ width: 92, height: 92, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.5)", overflow: "hidden", position: "relative", zIndex: 1, boxShadow: "0 0 32px rgba(37,99,235,0.5), 0 0 64px rgba(59,130,246,0.1)" }}>
                  <img src="/axn-coin-new.png" alt="AXN" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.18)" }} />
                </div>
              </div>
            </div>

            {/* Text */}
            <div style={{ textAlign: "center", marginBottom: 20, animation: "migSlideUp 0.5s ease 0.08s both" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(59,130,246,0.65)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>AXN Network</div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 11px", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
                Season 1<br /><span style={{ color: "#3b82f6" }}>Has Ended</span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.46)", fontSize: 14, lineHeight: 1.65, margin: 0, maxWidth: 260 }}>
                The mining phase is officially completed. Thank you for being part of Season 1.
              </p>
            </div>

            {/* Status badge */}
            <div style={{ animation: "migSlideUp 0.5s ease 0.16s both", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.24)", borderRadius: 50, padding: "7px 18px", marginBottom: 30, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "migGlow 1.5s ease-in-out infinite" }} />
              <span style={{ color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>Mining Phase — Stopped</span>
            </div>

            {/* Button */}
            <div style={{ width: "100%", animation: "migSlideUp 0.5s ease 0.24s both", position: "relative", zIndex: 2 }}>
              <button
                onClick={() => navigate("s2", "forward")}
                style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 900, cursor: "pointer", animation: "migPulse 2.8s ease-in-out 1.2s infinite" }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── SCREEN 2 ────────────── */}
      {screen === "s2" && (
        <div
          key={`s2-${animKey}`}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            paddingTop: safeTop, paddingLeft: 22, paddingRight: 22, paddingBottom: 28,
            animation: slideAnim,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.1) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#3b82f6,#60a5fa,#3b82f6,transparent)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 350 }}>

            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(96,165,250,0.75)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>What&apos;s New</div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 0 9px", lineHeight: 1.1, letterSpacing: "-0.5px" }}>
                Welcome to<br />
                <span style={{ background: "linear-gradient(135deg, #60a5fa, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Season 2</span>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 1.6, maxWidth: 270, margin: 0 }}>
                AXN is evolving into a full wallet ecosystem.
              </p>
            </div>

            {/* Feature list — SOLID icons, NO container boxes */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 7, marginBottom: 22 }}>
              {FEATURES.map(({ Icon, title, desc }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(59,130,246,0.1)",
                    borderRadius: 13, padding: "10px 14px",
                    animation: `migSlideUp 0.4s ease ${0.04 + i * 0.05}s both`,
                  }}
                >
                  <Icon size={22} color="#3b82f6" style={iconGlow("rgba(59,130,246,0.6)")} />
                  <div>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>{title}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ width: "100%", display: "flex", gap: 10 }}>
              <button
                onClick={() => navigate("s1", "back")}
                style={{ flex: "0 0 auto", padding: "14px 18px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 13, color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Back
              </button>
              <button
                onClick={handleGoToS3}
                style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", borderRadius: 13, color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 22px rgba(37,99,235,0.4)" }}
              >
                Continue to Migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── SCREEN 3 ────────────── */}
      {screen === "s3" && (
        <div
          key={`s3-${animKey}`}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            overflowY: "auto",
            animation: slideAnim,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#3b82f6,#60a5fa,#3b82f6,transparent)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `calc(${safeTop} + 28px) 20px 48px` }}>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(59,130,246,0.75)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 7 }}>Action Required</div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: "0 0 7px", letterSpacing: "-0.3px" }}>Migrate Your Balance</h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6, maxWidth: 270, margin: 0 }}>
                Convert or burn your Season 1 mining balance to proceed.
              </p>
            </div>

            {/* Mining Balance Card */}
            <div style={{ width: "100%", maxWidth: 340, background: "linear-gradient(135deg,rgba(37,99,235,0.13),rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.27)", borderRadius: 18, padding: "16px 20px", marginBottom: 12, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.5),transparent)", pointerEvents: "none" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.36)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Mining Balance (S1)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>{miningBalance.toLocaleString()}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>AXN</span>
              </div>
              {miningBalance > 0 && miningBalance < MIN_SWAP && (
                <div style={{ marginTop: 7, padding: "5px 10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 7 }}>
                  <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 600 }}>Below min ({MIN_SWAP.toLocaleString()} AXN). Only burn available.</span>
                </div>
              )}
              {miningBalance === 0 && (
                <div style={{ marginTop: 7, padding: "5px 10px", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.16)", borderRadius: 7 }}>
                  <span style={{ color: "rgba(255,255,255,0.36)", fontSize: 11 }}>No balance — proceed directly.</span>
                </div>
              )}
            </div>

            {/* ── SWAP CARD ── */}
            {canSwap && (
              <div style={{ width: "100%", maxWidth: 340, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.14)", borderRadius: 18, padding: "16px 18px", marginBottom: 10 }}>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <IoSwapHorizontal size={22} color="#60a5fa" style={iconGlow("rgba(59,130,246,0.55)")} />
                  <div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>Swap to Wallet</div>
                    <div style={{ color: "rgba(255,255,255,0.33)", fontSize: 11 }}>500 AXN fee per 1,000 AXN swapped</div>
                  </div>
                </div>

                {/* Amount input */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.36)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Amount to Swap</div>
                  <div style={{ position: "relative" }}>
                    <input
                      ref={inputRef}
                      type="number"
                      inputMode="numeric"
                      value={swapInput}
                      onChange={e => handleInputChange(e.target.value)}
                      placeholder={`Min ${MIN_SWAP.toLocaleString()}`}
                      style={{
                        width: "100%", padding: "12px 58px 12px 14px",
                        background: "rgba(0,0,0,0.35)",
                        border: `1.5px solid ${inputError ? "rgba(239,68,68,0.6)" : "rgba(59,130,246,0.25)"}`,
                        borderRadius: 11, color: "#fff", fontSize: 16, fontWeight: 800,
                        outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                      }}
                    />
                    <button
                      onClick={() => handleInputChange(String(miningBalance))}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(59,130,246,0.18)", border: "none", borderRadius: 6, color: "#60a5fa", fontSize: 10, fontWeight: 800, padding: "3px 7px", cursor: "pointer" }}
                    >
                      MAX
                    </button>
                  </div>
                  {inputError && (
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 5, marginTop: 6,
                        animation: shakeError ? "migShake 0.5s ease, migErrorIn 0.25s ease" : "migErrorIn 0.25s ease",
                      }}
                    >
                      <IoAlertCircle size={14} color="#f87171" />
                      <span style={{ color: "#f87171", fontSize: 12, fontWeight: 600 }}>{inputError}</span>
                    </div>
                  )}
                </div>

                {/* Breakdown */}
                <div style={{ background: "rgba(0,0,0,0.28)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Swap Amount</span>
                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{swapAmt > 0 ? swapAmt.toLocaleString() : "—"} AXN</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Fee (50%)</span>
                    <span style={{ color: "#f87171", fontSize: 12, fontWeight: 700 }}>{swapFee > 0 ? `– ${swapFee.toLocaleString()}` : "—"} AXN</span>
                  </div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 8 }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700 }}>You Receive</span>
                    <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 900 }}>{walletGets > 0 ? walletGets.toLocaleString() : "—"} AXN</span>
                  </div>
                </div>

                <button
                  onClick={handleSwap}
                  disabled={swapMutation.isPending || !!inputError}
                  style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", border: "none", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: 900, cursor: swapMutation.isPending ? "not-allowed" : "pointer", opacity: (swapMutation.isPending || !!inputError) ? 0.65 : 1, boxShadow: "0 4px 18px rgba(37,99,235,0.38)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "opacity 0.2s" }}
                >
                  {swapMutation.isPending
                    ? <IoRefresh size={17} color="white" style={{ animation: "migSpin 0.8s linear infinite" }} />
                    : "Swap Now"
                  }
                </button>
              </div>
            )}

            {/* ── BURN / ENTER CARD ── */}
            <div style={{ width: "100%", maxWidth: 340, background: miningBalance === 0 ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.04)", border: `1px solid ${miningBalance === 0 ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.16)"}`, borderRadius: 18, padding: "16px 18px" }}>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                {miningBalance === 0
                  ? <IoCheckmarkCircle size={22} color="#60a5fa" style={iconGlow("rgba(59,130,246,0.55)")} />
                  : <IoFlame size={22} color="#f87171" style={iconGlow("rgba(239,68,68,0.55)")} />
                }
                <div>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>{miningBalance === 0 ? "Enter App" : "Burn Balance"}</div>
                  <div style={{ color: "rgba(255,255,255,0.33)", fontSize: 11 }}>{miningBalance === 0 ? "No balance — proceed directly" : "Permanently discard mining balance"}</div>
                </div>
              </div>

              {miningBalance > 0 && (
                <div style={{ padding: "7px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <IoAlertCircle size={13} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: "#fca5a5", fontSize: 11 }}>Permanently deletes {miningBalance.toLocaleString()} AXN. Cannot be undone.</span>
                </div>
              )}

              <button
                onClick={() => { if (miningBalance === 0) burnMutation.mutate(); else setShowBurnConfirm(true); }}
                disabled={burnMutation.isPending}
                style={{ width: "100%", padding: "13px", background: miningBalance === 0 ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "rgba(239,68,68,0.1)", border: miningBalance === 0 ? "none" : "1px solid rgba(239,68,68,0.25)", borderRadius: 11, color: miningBalance === 0 ? "#fff" : "#fca5a5", fontSize: 14, fontWeight: 900, cursor: burnMutation.isPending ? "not-allowed" : "pointer", opacity: burnMutation.isPending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                {burnMutation.isPending
                  ? <IoRefresh size={16} color={miningBalance === 0 ? "white" : "#fca5a5"} style={{ animation: "migSpin 0.8s linear infinite" }} />
                  : miningBalance === 0 ? "Enter App" : "Burn Balance"
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Burn Confirm ── */}
      {showBurnConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }} onClick={() => setShowBurnConfirm(false)} />
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 304, background: "#0d0d0f", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 22, padding: "26px 22px", textAlign: "center", boxShadow: "0 8px 48px rgba(239,68,68,0.16)", animation: "migSlideUp 0.3s ease" }}>
            <IoFlame size={42} color="#f87171" style={{ marginBottom: 12, filter: "drop-shadow(0 0 12px rgba(239,68,68,0.65))" }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 7 }}>Confirm Burn</div>
            <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 1.6, marginBottom: 5 }}>
              This <span style={{ color: "#f87171", fontWeight: 700 }}>cannot be undone</span>.
            </div>
            <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 22 }}>
              {miningBalance.toLocaleString()} AXN will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowBurnConfirm(false)} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { setShowBurnConfirm(false); burnMutation.mutate(); }} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg,#dc2626,#ef4444)", border: "none", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 14px rgba(239,68,68,0.32)" }}>Burn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
