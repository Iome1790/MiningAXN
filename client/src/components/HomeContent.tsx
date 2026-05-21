import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import {
  RiKey2Fill, RiCheckLine, RiUserAddLine, RiPlayCircleFill,
  RiExternalLinkLine, RiGift2Line, RiMegaphoneLine, RiShareLine,
  RiTimeLine, RiGroupLine, RiSunLine, RiLoginCircleLine,
} from "react-icons/ri";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    show_10963365: (type?: any) => Promise<void>;
    Adsgram: { init: (opts: { blockId: string }) => { show: () => Promise<void> } };
  }
}

const CUT_CARD = 'polygon(12px 0%,calc(100% - 12px) 0%,100% 12px,100% calc(100% - 12px),calc(100% - 12px) 100%,12px 100%,0% calc(100% - 12px),0% 12px)';

/* ─── Helpers ─── */
const divider = () => (
  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginInline: 16 }} />
);

/* ─── Watch Ad Button ─── */
function WatchAdButton({ onEarned }: { onEarned: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleWatch = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    const startTime = Date.now();
    try {
      if (typeof window.show_10963365 === "function") {
        await window.show_10963365();
      } else if (window.Adsgram) {
        await window.Adsgram.init({ blockId: "int-29765" }).show();
      } else {
        showNotification("Ad not available right now.", "error");
        setLoading(false);
        return;
      }
    } catch {}
    const secs = Math.floor((Date.now() - startTime) / 1000);
    if (secs < 5) {
      showNotification("Please watch the full ad to earn a Key.", "error");
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest("POST", "/api/ad-slots/1/watch", { backgroundSeconds: secs }).then(r => r.json());
      if (res.success) {
        showNotification(`+${res.earned} Key earned!`, "success");
        onEarned();
      } else {
        showNotification(res.message || "Ad not counted. Try again.", "error");
      }
    } catch {
      showNotification("Network error. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [loading, onEarned]);

  return (
    <button
      onClick={handleWatch}
      disabled={loading}
      className="active:scale-95 transition-transform"
      style={{
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        background: "linear-gradient(135deg,#2563eb,#3b82f6)",
        borderRadius: 50, padding: "9px 18px",
        border: "none", cursor: loading ? "default" : "pointer",
        boxShadow: "0 2px 10px rgba(59,130,246,0.4)",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <Loader2 size={13} color="#fff" className="animate-spin" />
      ) : (
        <RiPlayCircleFill size={13} color="#fff" />
      )}
      <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>Watch Ad</span>
    </button>
  );
}

function formatReset(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/* ─── Level system ─── */
const LEVELS = [
  { level: 1, label: "Lv.1", next: 5 },
  { level: 2, label: "Lv.2", next: 15 },
  { level: 3, label: "Lv.3", next: 30 },
  { level: 4, label: "Lv.4", next: 50 },
  { level: 5, label: "Lv.5", next: null },
];

function getLevel(friends: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const lvl = LEVELS[i];
    const prevTarget = i > 0 ? LEVELS[i - 1].next! : 0;
    if (friends >= prevTarget) return lvl;
  }
  return LEVELS[0];
}

/* ─── Coming Soon Modal ─── */
function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1,
          background: "rgba(12,14,32,0.99)",
          border: "1px solid rgba(99,102,241,0.35)",
          borderRadius: 20, padding: "32px 24px",
          textAlign: "center", maxWidth: 300, width: "100%",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 14 }}>🚀</div>
        <p style={{ color: "#fff", fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Coming Soon</p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.5 }}>
          This feature is under development. Stay tuned!
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 20, background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            border: "none", borderRadius: 50, padding: "10px 28px",
            color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
          }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Progress Cards ─── */
interface ProgressCardsProps {
  friendsInvited: number;
  totalMissions: number;
  claimedMissions: number;
  secsUntilReset: number;
  onInviteOpen?: () => void;
}

function ProgressCards({ friendsInvited, totalMissions, claimedMissions, secsUntilReset, onInviteOpen }: ProgressCardsProps) {
  const lvlInfo = getLevel(friendsInvited);
  const prevTarget = lvlInfo.level > 1 ? LEVELS[lvlInfo.level - 2].next! : 0;
  const nextTarget = lvlInfo.next ?? prevTarget;
  const progressInLevel = Math.min(friendsInvited - prevTarget, nextTarget - prevTarget);
  const progressPct = lvlInfo.next ? (progressInLevel / (nextTarget - prevTarget)) * 100 : 100;

  const allDone = claimedMissions >= totalMissions && totalMissions > 0;

  return (
    <div style={{ marginInline: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {/* Invitation Progress */}
      <div style={{
        background: "rgba(18,18,30,0.98)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 18, padding: "14px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, flexShrink: 0,
          }}>💎</div>
          <div>
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 900, margin: 0 }}>
              {lvlInfo.label}
              {lvlInfo.next && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}> »</span>}
            </p>
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, margin: 0, letterSpacing: "0.02em" }}>
          Invitation Progress
        </p>
        {lvlInfo.next ? (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, margin: 0 }}>
            Invite {lvlInfo.next} users for {LEVELS[lvlInfo.level - 1]?.label ?? "Max"}
          </p>
        ) : (
          <p style={{ color: "#FFD700", fontSize: 9, fontWeight: 700, margin: 0 }}>Max Level Reached!</p>
        )}

        {/* Progress bar */}
        <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginTop: 2 }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "linear-gradient(90deg,#4f46e5,#818cf8)",
            borderRadius: 3, transition: "width 0.5s",
          }} />
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, margin: 0 }}>
          {lvlInfo.next ? `${friendsInvited}/${lvlInfo.next}` : `${friendsInvited} friends`}
        </p>

        <button
          onClick={onInviteOpen}
          className="active:scale-95 transition-transform"
          style={{
            marginTop: 2,
            background: "linear-gradient(135deg,#4f46e5,#6366f1)",
            border: "none", borderRadius: 8, padding: "6px 0",
            color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          <RiUserAddLine size={11} color="#fff" />
          Invite
        </button>
      </div>

      {/* Daily Task Progress */}
      <div style={{
        background: "rgba(18,18,30,0.98)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 18, padding: "14px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{
              color: allDone ? "#ef4444" : "#60a5fa",
              fontSize: 22, fontWeight: 900, margin: 0, lineHeight: 1,
            }}>
              {claimedMissions}/{totalMissions}
            </p>
            {allDone ? (
              <p style={{ color: "#ef4444", fontSize: 9, fontWeight: 800, margin: 0, marginTop: 2 }}>Limit Reached</p>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, margin: 0, marginTop: 2 }}>In Progress</p>
            )}
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 18 }}>📋</span>
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, margin: 0 }}>
          Daily Task Progress
        </p>

        <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${totalMissions > 0 ? (claimedMissions / totalMissions) * 100 : 0}%`,
            background: allDone
              ? "linear-gradient(90deg,#ef4444,#f87171)"
              : "linear-gradient(90deg,#1d4ed8,#60a5fa)",
            borderRadius: 3, transition: "width 0.5s",
          }} />
        </div>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, margin: 0 }}>
          Resets in {formatReset(secsUntilReset)}
        </p>
      </div>
    </div>
  );
}

/* ─── Mission Task Row ─── */
interface MissionTaskRowProps {
  icon: React.ReactNode;
  title: string;
  badge: string;
  reward: string;
  claimed: boolean;
  disabled?: boolean;
  onAction: () => void;
  actionLoading?: boolean;
}

function MissionTaskRow({ icon, title, badge, reward, claimed, disabled, onAction, actionLoading }: MissionTaskRowProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
    }}>
      {/* Icon circle */}
      <div style={{
        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        background: claimed
          ? "rgba(74,222,128,0.1)"
          : "linear-gradient(135deg,rgba(59,130,246,0.25),rgba(99,102,241,0.25))",
        border: claimed ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {claimed
          ? <RiCheckLine size={18} color="#4ade80" />
          : icon
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: claimed ? "rgba(255,255,255,0.35)" : "#fff",
          fontSize: 13, fontWeight: 700, margin: 0,
        }}>{title}</p>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          marginTop: 3,
          background: "rgba(59,130,246,0.12)",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 5, padding: "1px 7px",
        }}>
          <RiExternalLinkLine size={9} color="#60a5fa" />
          <span style={{ color: "#60a5fa", fontSize: 9, fontWeight: 700 }}>{badge}</span>
        </div>
      </div>

      {/* Reward / Action */}
      <div style={{ flexShrink: 0 }}>
        {claimed ? (
          <div style={{
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 20, padding: "5px 12px",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <RiCheckLine size={11} color="#4ade80" />
            <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>Done</span>
          </div>
        ) : (
          <button
            onClick={onAction}
            disabled={disabled || actionLoading}
            className="active:scale-95 transition-transform"
            style={{
              background: disabled
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg,rgba(59,130,246,0.9),rgba(99,102,241,0.9))",
              border: disabled ? "1px solid rgba(255,255,255,0.08)" : "none",
              borderRadius: 20, padding: "5px 12px",
              display: "flex", alignItems: "center", gap: 5,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            {actionLoading ? (
              <Loader2 size={10} color="#fff" className="animate-spin" />
            ) : (
              <RiKey2Fill size={11} color={disabled ? "rgba(255,255,255,0.25)" : "#FFD700"} />
            )}
            <span style={{
              color: disabled ? "rgba(255,255,255,0.25)" : "#fff",
              fontSize: 11, fontWeight: 800,
            }}>{reward}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Daily Task Row (2-step flow) ─── */
type TaskStep = "idle" | "ad_loading" | "ready" | "claiming" | "claimed";

interface DailyTaskConfig {
  type: "checkin" | "invite" | "updates";
  icon: string;
  title: string;
  reward: number;
  claimed: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

function DailyTaskRow({
  config,
  onClaim,
  channelUrl,
}: {
  config: DailyTaskConfig;
  onClaim: (type: DailyTaskConfig["type"]) => Promise<boolean>;
  channelUrl: string;
}) {
  const [step, setStep] = useState<TaskStep>(config.claimed ? "claimed" : "idle");

  useEffect(() => {
    if (config.claimed) setStep("claimed");
  }, [config.claimed]);

  const handleStart = useCallback(async () => {
    if (step !== "idle" || config.disabled) return;

    if (config.type === "checkin") {
      setStep("ad_loading");
      try {
        if (typeof window.show_10963365 === "function") {
          await window.show_10963365();
        } else if (window.Adsgram) {
          await window.Adsgram.init({ blockId: "int-29765" }).show();
        } else {
          showNotification("Ad not available right now.", "error");
          setStep("idle");
          return;
        }
        setStep("ready");
      } catch {
        showNotification("Ad was skipped. Please watch fully.", "error");
        setStep("idle");
      }
    } else if (config.type === "updates") {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) tg.openTelegramLink(channelUrl);
      else window.open(channelUrl, "_blank");
      setTimeout(() => setStep("ready"), 3000);
    } else if (config.type === "invite") {
      setStep("ready");
    }
  }, [step, config, channelUrl]);

  const handleClaim = useCallback(async () => {
    if (step !== "ready") return;
    setStep("claiming");
    const ok = await onClaim(config.type);
    setStep(ok ? "claimed" : "idle");
  }, [step, config.type, onClaim]);

  const isDone = config.claimed || step === "claimed";

  return (
    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: isDone ? "rgba(74,222,128,0.08)" : config.disabled ? "rgba(255,255,255,0.04)" : "rgba(255,215,0,0.1)",
          border: isDone ? "1px solid rgba(74,222,128,0.2)" : config.disabled ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,215,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        }}>
          {config.icon}
        </div>
        <div>
          <p style={{ color: isDone || config.disabled ? "rgba(255,255,255,0.35)" : "#fff", fontSize: 13, fontWeight: 800, marginBottom: 2 }}>
            {config.title}
          </p>
          {config.disabled && config.disabledReason ? (
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 600 }}>{config.disabledReason}</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <RiKey2Fill size={10} color={isDone ? "rgba(255,215,0,0.25)" : "#FFD700"} />
              <p style={{ color: isDone ? "rgba(255,255,255,0.2)" : "#FFD700", fontSize: 11, fontWeight: 700 }}>
                +{config.reward} Keys
              </p>
            </div>
          )}
        </div>
      </div>

      {isDone ? (
        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RiCheckLine size={16} color="#4ade80" />
        </div>
      ) : config.disabled ? (
        <div style={{ padding: "6px 12px", borderRadius: 50, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700 }}>Locked</span>
        </div>
      ) : step === "idle" ? (
        <button onClick={handleStart} className="active:scale-95 transition-transform" style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius: 50, padding: "7px 16px", border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(59,130,246,0.35)" }}>
          {config.type === "checkin" ? <RiPlayCircleFill size={12} color="#fff" /> : config.type === "updates" ? <RiExternalLinkLine size={12} color="#fff" /> : null}
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>{config.type === "invite" ? "Claim" : "Start"}</span>
        </button>
      ) : step === "ad_loading" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "7px 16px", borderRadius: 50, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <Loader2 size={12} color="rgba(255,255,255,0.5)" className="animate-spin" />
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700 }}>Loading…</span>
        </div>
      ) : step === "ready" ? (
        <button onClick={handleClaim} className="active:scale-95 transition-transform" style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, background: "linear-gradient(135deg,#b8860b,#FFD700)", borderRadius: 50, padding: "7px 14px", border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(255,215,0,0.3)" }}>
          <RiKey2Fill size={12} color="#1a1a1a" />
          <span style={{ color: "#1a1a1a", fontSize: 11, fontWeight: 900 }}>Claim</span>
        </button>
      ) : step === "claiming" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "7px 14px", borderRadius: 50, background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.2)" }}>
          <Loader2 size={12} color="#FFD700" className="animate-spin" />
          <span style={{ color: "#FFD700", fontSize: 11, fontWeight: 700 }}>Claiming…</span>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Main Component ─── */
interface HomeContentProps {
  onInviteOpen?: () => void;
}

interface MissionStatus {
  success: boolean;
  secsUntilReset: number;
  hasNewReferralToday: boolean;
  login: { claimed: boolean };
  announcement: { claimed: boolean };
  watchAd: { claimed: boolean };
  shareApp: { claimed: boolean };
  appTime: { claimed: boolean; seconds: number };
  community: { claimed: boolean };
  invite: { claimed: boolean; available: boolean };
}

export default function HomeContent({ onInviteOpen }: HomeContentProps) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], staleTime: 10000 });
  const { data: settings } = useQuery<any>({ queryKey: ["/api/app-settings"], staleTime: 60000 });
  const { data: missionStatus } = useQuery<MissionStatus>({
    queryKey: ["/api/daily-missions/status"],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const [showComingSoon, setShowComingSoon] = useState(false);
  const [missionLoading, setMissionLoading] = useState<string | null>(null);

  const dailyCheckin = user?.dailyCheckinClaimed ?? user?.daily_checkin_claimed ?? false;
  const dailyInvite = user?.dailyInviteClaimed ?? user?.daily_invite_claimed ?? false;
  const dailyUpdates = user?.dailyUpdatesClaimed ?? user?.daily_updates_claimed ?? false;
  const friendsInvited = user?.friendsInvited ?? 0;
  const channelUrl = settings?.channelUrl || "https://t.me/LightningSatoshi";

  // Compute mission counts
  const missionItems = missionStatus ? [
    missionStatus.login.claimed,
    missionStatus.announcement.claimed,
    missionStatus.watchAd.claimed,
    missionStatus.shareApp.claimed,
    missionStatus.appTime.claimed,
    missionStatus.community.claimed,
    ...(missionStatus.hasNewReferralToday ? [missionStatus.invite.claimed] : []),
  ] : [];
  const totalMissions = missionItems.length || 6;
  const claimedMissions = missionItems.filter(Boolean).length;
  const secsUntilReset = missionStatus?.secsUntilReset ?? 0;

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/daily-missions/status"] });
  }, [queryClient]);

  const claimDailyTask = useCallback(async (taskType: "checkin" | "invite" | "updates"): Promise<boolean> => {
    try {
      const res = await apiRequest("POST", `/api/daily-tasks/claim/${taskType}`).then(r => r.json());
      if (res.success) {
        showNotification(`+${res.keysEarned} Keys earned!`, "success");
        refreshAll();
        return true;
      } else {
        showNotification(res.message || "Already claimed today.", "error");
        return false;
      }
    } catch {
      showNotification("Network error. Try again.", "error");
      return false;
    }
  }, [refreshAll]);

  const claimMission = useCallback(async (endpoint: string, key: string) => {
    if (missionLoading) return;
    setMissionLoading(key);
    try {
      const res = await apiRequest("POST", endpoint, {}).then(r => r.json());
      showNotification(res.message || "Reward claimed!", "success");
      refreshAll();
    } catch {
      showNotification("Failed to claim. Try again.", "error");
    } finally {
      setMissionLoading(null);
    }
  }, [missionLoading, refreshAll]);

  const handleMissionLink = useCallback((url: string, endpoint: string, key: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
    setTimeout(() => claimMission(endpoint, key), 3000);
  }, [claimMission]);

  const handleWatchAdMission = useCallback(async () => {
    if (missionLoading) return;
    setMissionLoading("watchAd");
    try {
      if ((window as any).Adsgram) {
        await (window as any).Adsgram.init({ blockId: "int-20373" }).show();
        await claimMission("/api/daily-missions/claim/watch-ad", "watchAd");
      } else {
        showNotification("Ad not available right now", "error");
        setMissionLoading(null);
      }
    } catch {
      showNotification("Ad failed or was skipped", "error");
      setMissionLoading(null);
    }
  }, [missionLoading, claimMission]);

  const dailyTasks: DailyTaskConfig[] = [
    { type: "checkin", icon: "☀️", title: "Daily Check-in", reward: 5, claimed: dailyCheckin },
    {
      type: "invite", icon: "👥", title: "Invite Friends", reward: 15, claimed: dailyInvite,
      disabled: !dailyInvite && friendsInvited < 1, disabledReason: "Invite a friend first to unlock",
    },
    { type: "updates", icon: "🔄", title: "Check for Updates", reward: 3, claimed: dailyUpdates },
  ];

  // Mission task list definitions
  const missionList = missionStatus ? [
    {
      key: "login", icon: <RiLoginCircleLine size={18} color="#60a5fa" />,
      title: "Daily Login", badge: "Daily Task", reward: "+2 AXN",
      claimed: missionStatus.login.claimed,
      onAction: () => claimMission("/api/daily-missions/claim/login", "login"),
    },
    {
      key: "announcement", icon: <RiMegaphoneLine size={18} color="#a78bfa" />,
      title: "Check Announcement", badge: "Link Task", reward: "+1 AXN",
      claimed: missionStatus.announcement.claimed,
      onAction: () => handleMissionLink("https://t.me/LightningSatoshi", "/api/daily-missions/claim/announcement", "announcement"),
    },
    {
      key: "watchAd", icon: <RiPlayCircleFill size={18} color="#f59e0b" />,
      title: "Watch an Ad", badge: "Ad Task", reward: "+3 AXN",
      claimed: missionStatus.watchAd.claimed,
      onAction: handleWatchAdMission,
    },
    {
      key: "shareApp", icon: <RiShareLine size={18} color="#34d399" />,
      title: "Share the App", badge: "Share Task", reward: "+2 AXN",
      claimed: missionStatus.shareApp.claimed,
      onAction: async () => {
        const tg = (window as any).Telegram?.WebApp;
        try {
          const res = await apiRequest("POST", "/api/share/prepare-message", {});
          const data = await res.json();
          const link = data.referralLink || "";
          if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join me on Axionet!")}`);
        } catch {}
        setTimeout(() => claimMission("/api/daily-missions/claim/share-app", "shareApp"), 2000);
      },
    },
    {
      key: "community", icon: <RiGroupLine size={18} color="#f472b6" />,
      title: "Join Community", badge: "Link Task", reward: "+3 AXN",
      claimed: missionStatus.community.claimed,
      onAction: () => handleMissionLink("https://t.me/PaidAdzGroup", "/api/daily-missions/claim/community", "community"),
    },
    {
      key: "appTime", icon: <RiTimeLine size={18} color="#38bdf8" />,
      title: "Stay Active 10 min", badge: "Time Task", reward: "+2 AXN",
      claimed: missionStatus.appTime.claimed,
      onAction: () => {},
      disabled: !missionStatus.appTime.claimed && missionStatus.appTime.seconds < 600,
    },
    ...(missionStatus.hasNewReferralToday ? [{
      key: "invite", icon: <RiGift2Line size={18} color="#facc15" />,
      title: "New Referral Today!", badge: "Bonus Task", reward: "+5 AXN",
      claimed: missionStatus.invite.claimed,
      onAction: () => claimMission("/api/daily-missions/claim/invite", "invite"),
    }] : []),
  ] : [];

  const cardBase: React.CSSProperties = {
    background: "rgba(18, 18, 28, 0.97)",
    clipPath: CUT_CARD,
    border: "1px solid rgba(255,255,255,0.07)",
    marginInline: 10,
  };

  return (
    <div className="w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Key Earn Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          marginInline: 10,
          background: "linear-gradient(135deg,rgba(30,20,80,0.98) 0%,rgba(50,30,120,0.98) 100%)",
          border: "1px solid rgba(255,215,0,0.2)",
          borderRadius: 20,
          padding: "16px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: "rgba(255,215,0,0.12)",
            border: "1px solid rgba(255,215,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <RiKey2Fill size={22} color="#FFD700" />
          </div>
          <div>
            <p style={{ color: "#fff", fontSize: 14, fontWeight: 900, margin: 0 }}>Earn Keys</p>
            <p style={{ color: "rgba(255,215,0,0.7)", fontSize: 11, fontWeight: 700, marginTop: 2 }}>
              Watch an ad → get 1 Key
            </p>
          </div>
        </div>
        <WatchAdButton onEarned={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] })} />
      </motion.div>

      {/* Daily Tasks Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }} style={cardBase}>
        <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 900, margin: 0 }}>🎯 Daily Tasks</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>Earn Keys • Resets daily</p>
          </div>
          <div style={{
            background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4,
          }}>
            <RiKey2Fill size={11} color="#FFD700" />
            <span style={{ color: "#FFD700", fontSize: 10, fontWeight: 800 }}>Keys</span>
          </div>
        </div>
        {divider()}
        {dailyTasks.map((task, idx) => (
          <div key={task.type}>
            <DailyTaskRow config={task} onClaim={claimDailyTask} channelUrl={channelUrl} />
            {idx < dailyTasks.length - 1 && divider()}
          </div>
        ))}
        <div style={{ height: 6 }} />
      </motion.div>

      {/* Mission Task List */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.14 }} style={cardBase}>
        <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "#fff", fontSize: 15, fontWeight: 900, margin: 0 }}>🏆 Mission Tasks</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
              {claimedMissions}/{totalMissions} completed
            </p>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 8, padding: "4px 10px",
          }}>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700 }}>+AXN</span>
          </div>
        </div>
        {divider()}

        {missionList.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <Loader2 size={20} color="rgba(255,255,255,0.2)" className="animate-spin" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          missionList.map((m, idx) => (
            <div key={m.key}>
              <MissionTaskRow
                icon={m.icon}
                title={m.title}
                badge={m.badge}
                reward={m.reward}
                claimed={m.claimed}
                disabled={(m as any).disabled}
                onAction={m.onAction}
                actionLoading={missionLoading === m.key}
              />
              {idx < missionList.length - 1 && divider()}
            </div>
          ))
        )}
        <div style={{ height: 6 }} />
      </motion.div>

      {showComingSoon && <ComingSoonModal onClose={() => setShowComingSoon(false)} />}
    </div>
  );
}
