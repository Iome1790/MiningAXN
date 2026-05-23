import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChannelJoinPopupProps {
  telegramId: string;
  onVerified: () => void;
}

const CHANNEL2_URL = "https://t.me/LightningSatoshi";
const CHANNEL_URL = "https://t.me/MoneyAdz";
const GROUP_URL = "https://t.me/Axionetchat";

export default function ChannelJoinPopup({ telegramId, onVerified }: ChannelJoinPopupProps) {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [channel2Joined, setChannel2Joined] = useState(false);
  const [channelJoined, setChannelJoined] = useState(false);
  const [groupJoined, setGroupJoined] = useState(false);

  const checkMembership = async (isInitialCheck = false) => {
    if (isChecking) return;
    setIsChecking(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) headers["x-telegram-data"] = tg.initData;

      const response = await fetch(`/api/check-membership?t=${Date.now()}`, { headers });
      const data = await response.json();

      if (data.success && data.isVerified) {
        onVerified();
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        return;
      }

      if (data.success) {
        if (data.channel2Member) setChannel2Joined(true);
        if (data.channelMember) setChannelJoined(true);
        if (data.groupMember) setGroupJoined(true);

        if (!isInitialCheck) {
          if (!data.channel2Member || !data.channelMember || !data.groupMember) {
            setError("Please join all channels and the chat room to continue.");
          }
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
    if (!hasInitialized) checkMembership(true);
  }, [telegramId, hasInitialized]);

  const openLink = (url: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
  };

  const CHANNELS = [
    { url: CHANNEL2_URL, joined: channel2Joined, label: "Lightning Satoshi", handle: "@LightningSatoshi" },
    { url: CHANNEL_URL,  joined: channelJoined,  label: "Axionet Payouts",   handle: "@MoneyAdz"         },
    { url: GROUP_URL,    joined: groupJoined,     label: "Axionet Chat",      handle: "@Axionetchat"      },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-sm overflow-hidden"
          style={{ background: '#000000', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24 }}
          initial={{ scale: 0.88, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Top blue glow line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.8), rgba(59,130,246,1), rgba(96,165,250,0.8), transparent)',
            boxShadow: '0 0 18px rgba(59,130,246,0.7)',
          }} />

          {/* Top glow orb */}
          <div style={{
            position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 80,
            background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Header — no icon, no subtitle */}
          <div style={{ padding: '28px 20px 16px', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>
              Join our channels to access the app
            </p>
          </div>

          {/* Channel cards — no icon box */}
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHANNELS.map((ch) => (
              <button
                key={ch.url}
                onClick={() => openLink(ch.url)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: ch.joined ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.08)',
                  border: `1px solid ${ch.joined ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.22)'}`,
                  borderRadius: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: ch.joined ? '#22c55e' : '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>
                    {ch.label}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>
                    {ch.handle}
                  </p>
                </div>
                <span style={{
                  color: ch.joined ? '#22c55e' : '#60a5fa',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {ch.joined ? 'Joined' : 'Join To Access'}
                </span>
              </button>
            ))}
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
                width: '100%', height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                border: 'none', color: '#fff',
                fontWeight: 800, fontSize: 15, letterSpacing: '0.02em',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isChecking ? 'not-allowed' : 'pointer',
                opacity: isChecking ? 0.7 : 1,
                boxShadow: '0 0 24px rgba(59,130,246,0.45)',
                transition: 'all 0.15s',
              }}
            >
              {isChecking
                ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                : "I've joined - Verify"
              }
            </button>
          </div>

          {/* Bottom blue glow line */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.8), rgba(59,130,246,1), rgba(96,165,250,0.8), transparent)',
            boxShadow: '0 0 18px rgba(59,130,246,0.7)',
          }} />

          {/* Bottom glow orb */}
          <div style={{
            position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 80,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.3) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
