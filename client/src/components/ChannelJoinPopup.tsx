import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChannelJoinPopupProps {
  telegramId: string;
  onVerified: () => void;
}

const CHANNEL_URL = "https://t.me/MoneyAdz";
const GROUP_URL = "https://t.me/Axionetchat";

export default function ChannelJoinPopup({ telegramId, onVerified }: ChannelJoinPopupProps) {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [channelJoined, setChannelJoined] = useState(false);
  const [groupJoined, setGroupJoined] = useState(false);

  const checkMembership = async (isInitialCheck = false) => {
    if (isChecking) return;
    setIsChecking(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        headers["x-telegram-data"] = tg.initData;
      }

      const response = await fetch(`/api/check-membership?t=${Date.now()}`, { headers });
      const data = await response.json();

      if (data.success && data.isVerified) {
        onVerified();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        return;
      }

      if (data.success) {
        if (data.channelMember) {
          setChannelJoined(true);
        }
        if (data.groupMember) {
          setGroupJoined(true);
        }
        if (data.channelMember) {
          onVerified();
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } else if (!isInitialCheck) {
          setError("Please join both the channel and the chat room to continue.");
        }
      } else if (!isInitialCheck) {
        setError(data.message || "Failed to verify membership. Please try again.");
      }
    } catch {
      if (!isInitialCheck) {
        setError("Failed to check membership. Please try again.");
      }
    } finally {
      setIsChecking(false);
      setHasInitialized(true);
    }
  };

  useEffect(() => {
    if (!hasInitialized) {
      checkMembership(true);
    }
  }, [telegramId, hasInitialized]);

  const openLink = (url: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-sm overflow-hidden"
          style={{
            background: '#0d0d10',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
          }}
          initial={{ scale: 0.88, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Top glow accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.8), rgba(59,130,246,1), rgba(96,165,250,0.8), transparent)',
          }} />

          {/* Header */}
          <div style={{ padding: '28px 20px 18px', textAlign: 'center' }}>
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(59,130,246,0.35)',
            }}>
              <Send style={{ width: 28, height: 28, color: '#fff' }} strokeWidth={2} />
            </div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
              Join to Access
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.5 }}>
              Join our channel and chat room to start using the app.
            </p>
          </div>

          {/* Join cards */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Channel card */}
            <button
              onClick={() => openLink(CHANNEL_URL)}
              style={{
                width: '100%', padding: '14px 16px',
                background: channelJoined ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.1)',
                border: `1px solid ${channelJoined ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.25)'}`,
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: channelJoined ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {channelJoined
                    ? <CheckCircle2 style={{ width: 20, height: 20, color: '#22c55e' }} />
                    : <span style={{ fontSize: 18 }}>📢</span>
                  }
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: channelJoined ? '#22c55e' : '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
                    Axionet Payouts
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>
                    @MoneyAdz
                  </p>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: channelJoined ? '#22c55e' : '#60a5fa',
                fontSize: 11, fontWeight: 700,
              }}>
                {channelJoined ? 'Joined' : 'Join'}
                {!channelJoined && <ArrowRight style={{ width: 13, height: 13 }} />}
              </div>
            </button>

            {/* Group card */}
            <button
              onClick={() => openLink(GROUP_URL)}
              style={{
                width: '100%', padding: '14px 16px',
                background: groupJoined ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.1)',
                border: `1px solid ${groupJoined ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.25)'}`,
                borderRadius: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: groupJoined ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {groupJoined
                    ? <CheckCircle2 style={{ width: 20, height: 20, color: '#22c55e' }} />
                    : <span style={{ fontSize: 18 }}>💬</span>
                  }
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: groupJoined ? '#22c55e' : '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
                    Axionet Chat
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>
                    @Axionetchat
                  </p>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: groupJoined ? '#22c55e' : '#60a5fa',
                fontSize: 11, fontWeight: 700,
              }}>
                {groupJoined ? 'Joined' : 'Join'}
                {!groupJoined && <ArrowRight style={{ width: 13, height: 13 }} />}
              </div>
            </button>
          </div>

          {/* Error */}
          <div style={{ padding: '10px 16px 0' }}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 12px' }}
                >
                  <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Verify button */}
          <div style={{ padding: '14px 16px 24px' }}>
            <button
              onClick={() => checkMembership(false)}
              disabled={isChecking}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: isChecking ? 'not-allowed' : 'pointer',
                opacity: isChecking ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {isChecking ? (
                <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              ) : (
                <>I&apos;ve Joined — Verify <ArrowRight style={{ width: 15, height: 15 }} /></>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
