import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { RiPlayCircleFill, RiCheckLine, RiLockLine, RiExternalLinkLine } from "react-icons/ri";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    show_10963365: (type?: any) => Promise<void>;
    Adsgram: { init: (opts: { blockId: string }) => { show: () => Promise<void> } };
  }
}

interface BountyTask {
  id: number;
  title: string;
  description: string | null;
  rewardAxn: number;
  keyCost: number;
  url: string | null;
  completed: boolean;
}

const cardStyle: React.CSSProperties = {
  background: "rgba(18, 18, 28, 0.97)",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.07)",
  overflow: "hidden",
  marginInline: 10,
};

const sectionHeader = (title: string, sub: string) => (
  <div style={{ padding: "14px 16px 10px" }}>
    <p style={{ color: "#fff", fontSize: 15, fontWeight: 900, margin: 0 }}>{title}</p>
    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>{sub}</p>
  </div>
);

const divider = () => (
  <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginInline: 16 }} />
);

/* ─── Watch Ad Button ─── */
function WatchAdButton({ onEarned }: { onEarned: () => void }) {
  const [loading, setLoading] = useState(false);
  const [bgStart, setBgStart] = useState<number | null>(null);

  const handleWatch = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const startTime = Date.now();
    setBgStart(startTime);

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

    const backgroundSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (backgroundSeconds < 5) {
      showNotification("Please watch the full ad to earn a Key.", "error");
      setLoading(false);
      return;
    }

    try {
      const res = await apiRequest("POST", "/api/ad-slots/1/watch", { backgroundSeconds }).then(r => r.json());
      if (res.success) {
        showNotification(`+${res.earned} 🔑 Key earned!`, "success");
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
        display: "flex", alignItems: "center", gap: 6,
        background: "linear-gradient(135deg,#2563eb,#3b82f6)",
        borderRadius: 50, padding: "8px 16px",
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
      <span style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>Watch Ad</span>
    </button>
  );
}

/* ─── Daily Task Row ─── */
interface DailyTaskRowProps {
  icon: string;
  title: string;
  reward: number;
  rewardUnit: string;
  claimed: boolean;
  onClaim: () => Promise<void>;
}

function DailyTaskRow({ icon, title, reward, rewardUnit, claimed, onClaim }: DailyTaskRowProps) {
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    if (claimed || loading) return;
    setLoading(true);
    try {
      await onClaim();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: claimed ? "rgba(255,255,255,0.04)" : "rgba(255,215,0,0.1)",
          border: claimed ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,215,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ color: claimed ? "rgba(255,255,255,0.35)" : "#fff", fontSize: 13, fontWeight: 800, marginBottom: 2 }}>
            {title}
          </p>
          <p style={{ color: claimed ? "rgba(255,255,255,0.2)" : "#FFD700", fontSize: 11, fontWeight: 700 }}>
            +{reward} {rewardUnit}
          </p>
        </div>
      </div>
      {claimed ? (
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <RiCheckLine size={16} color="#4ade80" />
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={loading}
          className="active:scale-95 transition-transform"
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: "linear-gradient(135deg,#b8860b,#FFD700)",
            borderRadius: 50, padding: "7px 14px",
            border: "none", cursor: loading ? "default" : "pointer",
            boxShadow: "0 2px 10px rgba(255,215,0,0.3)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <Loader2 size={12} color="#1a1a1a" className="animate-spin" />
          ) : (
            <span style={{ fontSize: 12 }}>🔑</span>
          )}
          <span style={{ color: "#1a1a1a", fontSize: 11, fontWeight: 900 }}>Claim</span>
        </button>
      )}
    </div>
  );
}

/* ─── Bounty Task Row ─── */
interface BountyTaskRowProps {
  task: BountyTask;
  keyBalance: number;
  onComplete: (taskId: number) => Promise<void>;
}

function BountyTaskRow({ task, keyBalance, onComplete }: BountyTaskRowProps) {
  const [loading, setLoading] = useState(false);
  const canAfford = keyBalance >= task.keyCost;

  const handleComplete = async () => {
    if (task.completed || loading || !canAfford) return;
    setLoading(true);
    try {
      if (task.url) {
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.openTelegramLink && task.url.includes("t.me")) {
          tg.openTelegramLink(task.url);
        } else {
          window.open(task.url, "_blank");
        }
      }
      await onComplete(task.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: task.completed ? "rgba(255,255,255,0.04)" : (!canAfford ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.1)"),
          border: task.completed ? "1px solid rgba(255,255,255,0.08)" : (!canAfford ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(59,130,246,0.25)"),
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {task.completed ? (
            <RiCheckLine size={18} color="rgba(255,255,255,0.25)" />
          ) : !canAfford ? (
            <RiLockLine size={18} color="rgba(239,68,68,0.6)" />
          ) : (
            <span style={{ fontSize: 16 }}>⚡</span>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const }}>
            <p style={{ color: task.completed ? "rgba(255,255,255,0.3)" : "#fff", fontSize: 13, fontWeight: 800 }}>
              {task.title}
            </p>
            {task.url && !task.completed && (
              <RiExternalLinkLine size={12} color="rgba(255,255,255,0.3)" />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            <p style={{ color: task.completed ? "rgba(255,255,255,0.15)" : "#4ade80", fontSize: 11, fontWeight: 700 }}>
              +{task.rewardAxn} AXN
            </p>
            <p style={{
              fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
              background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.2)",
              color: "rgba(255,215,0,0.7)",
            }}>
              🔑 {task.keyCost} required
            </p>
          </div>
        </div>
      </div>

      {task.completed ? (
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <RiCheckLine size={16} color="#4ade80" />
        </div>
      ) : !canAfford ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0,
        }}>
          <span style={{ color: "rgba(239,68,68,0.7)", fontSize: 9, fontWeight: 700, textAlign: "center" }}>
            Not enough
          </span>
          <span style={{ color: "rgba(239,68,68,0.7)", fontSize: 9, fontWeight: 700 }}>
            Keys
          </span>
        </div>
      ) : (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="active:scale-95 transition-transform"
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
            borderRadius: 50, padding: "7px 14px",
            border: "none", cursor: loading ? "default" : "pointer",
            boxShadow: "0 2px 10px rgba(59,130,246,0.35)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <Loader2 size={12} color="#fff" className="animate-spin" />
          ) : (
            <span style={{ fontSize: 12 }}>⚡</span>
          )}
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>Go</span>
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function HomeContent() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], staleTime: 10000 });
  const { data: bountyData, isLoading: bountyLoading } = useQuery<{ tasks: BountyTask[] }>({
    queryKey: ["/api/bounty-tasks"],
    staleTime: 30000,
  });

  const keyBalance = user?.keyBalance ?? user?.key_balance ?? 0;
  const dailyCheckin = user?.dailyCheckinClaimed ?? user?.daily_checkin_claimed ?? false;
  const dailyInvite = user?.dailyInviteClaimed ?? user?.daily_invite_claimed ?? false;
  const dailyUpdates = user?.dailyUpdatesClaimed ?? user?.daily_updates_claimed ?? false;

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bounty-tasks"] });
  };

  const claimDailyTask = async (taskType: "checkin" | "invite" | "updates") => {
    try {
      const res = await apiRequest("POST", `/api/daily-tasks/claim/${taskType}`).then(r => r.json());
      if (res.success) {
        showNotification(`+${res.keysEarned} 🔑 Keys earned!`, "success");
        refreshUser();
      } else {
        showNotification(res.message || "Already claimed today.", "error");
      }
    } catch {
      showNotification("Network error. Try again.", "error");
    }
  };

  const completeBountyTask = async (taskId: number) => {
    try {
      const res = await apiRequest("POST", `/api/bounty-tasks/${taskId}/complete`).then(r => r.json());
      if (res.success) {
        showNotification(`+${res.axnEarned} AXN earned!`, "success");
        refreshUser();
      } else {
        showNotification(res.message || "Could not complete task.", "error");
      }
    } catch {
      showNotification("Network error. Try again.", "error");
    }
  };

  const tasks = bountyData?.tasks ?? [];

  return (
    <div className="w-full" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Key Balance Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          marginInline: 10,
          background: "linear-gradient(135deg, rgba(180,130,0,0.2) 0%, rgba(255,215,0,0.08) 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,215,0,0.25)",
          padding: "14px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Your Key Balance</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 26 }}>🔑</span>
            <span style={{ color: "#FFD700", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
              {keyBalance}
            </span>
            <span style={{ color: "rgba(255,215,0,0.5)", fontSize: 13, fontWeight: 700 }}>Keys</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 600, marginBottom: 6 }}>
            Earn Keys by watching ads
          </p>
          <WatchAdButton onEarned={refreshUser} />
        </div>
      </motion.div>

      {/* Daily Tasks Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        style={cardStyle}
      >
        {sectionHeader("🎯 Daily Tasks", "Complete tasks to earn Keys • Resets daily")}
        {divider()}

        <DailyTaskRow
          icon="☀️"
          title="Daily Check-in"
          reward={5}
          rewardUnit="🔑 Keys"
          claimed={dailyCheckin}
          onClaim={() => claimDailyTask("checkin")}
        />
        {divider()}
        <DailyTaskRow
          icon="👥"
          title="Invite Friends"
          reward={15}
          rewardUnit="🔑 Keys"
          claimed={dailyInvite}
          onClaim={() => claimDailyTask("invite")}
        />
        {divider()}
        <DailyTaskRow
          icon="🔄"
          title="Check for Updates"
          reward={3}
          rewardUnit="🔑 Keys"
          claimed={dailyUpdates}
          onClaim={() => claimDailyTask("updates")}
        />
        <div style={{ height: 6 }} />
      </motion.div>

      {/* Bounty Tasks Section */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        style={cardStyle}
      >
        {sectionHeader("🔥 Bounty Tasks", "Use 5 Keys per task • Earn 50 AXN each")}
        {divider()}

        {bountyLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
            <Loader2 size={22} color="rgba(255,255,255,0.2)" className="animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 16px" }}>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, fontWeight: 700 }}>No bounty tasks available</p>
            <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, marginTop: 4 }}>Check back soon for sponsored tasks</p>
          </div>
        ) : (
          tasks.map((task, idx) => (
            <div key={task.id}>
              <BountyTaskRow
                task={task}
                keyBalance={keyBalance}
                onComplete={completeBountyTask}
              />
              {idx < tasks.length - 1 && divider()}
            </div>
          ))
        )}
        <div style={{ height: 6 }} />
      </motion.div>

      {/* Economy Info */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
        style={{
          marginInline: 10,
          background: "rgba(18,18,28,0.6)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-around",
        }}
      >
        {[
          { label: "1 Ad Watch", value: "= 1 🔑 Key" },
          { label: "1 Task", value: "= 50 AXN" },
          { label: "1000 AXN", value: "= 0.01 TON" },
        ].map((item, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ color: "#fff", fontSize: 11, fontWeight: 800 }}>{item.value}</p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, fontWeight: 600, marginTop: 2 }}>{item.label}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
