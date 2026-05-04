import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Check, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChannelJoinPopupProps {
  telegramId: string;
  onVerified: () => void;
}

export default function ChannelJoinPopup({ telegramId, onVerified }: ChannelJoinPopupProps) {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [channelJoined, setChannelJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const CHANNEL_URL = "https://t.me/LightningSatoshi";

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
        setChannelJoined(data.channelMember || false);
        if (!isInitialCheck && !data.channelMember) {
          setError("Please join the channel first.");
        }
      } else if (!isInitialCheck) {
        setError(data.message || "Failed to verify membership.");
      }
    } catch (err) {
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

  const openChannel = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, "_blank");
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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ background: '#0a0a0a', border: '1px solid #1c1c1e' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b border-[#1c1c1e] text-center">
            <h1 className="text-white font-black text-base uppercase tracking-wider">Join to Continue</h1>
            <p className="text-white/35 text-[11px] mt-1">Join our channel to access the app</p>
          </div>

          <div className="px-5 py-4 space-y-3">
            {error && (
              <div className="py-2.5 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-xs text-center font-semibold">{error}</p>
              </div>
            )}

            {/* Channel button */}
            <button
              onClick={openChannel}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                channelJoined
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-[#141414] border-white/8 hover:border-white/15"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                channelJoined
                  ? "bg-green-500/15 border border-green-500/20"
                  : "bg-white/5 border border-white/8"
              }`}>
                <Send className={`w-5 h-5 ${channelJoined ? "text-green-400" : "text-white/50"}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-bold text-sm">Main Channel</p>
                <p className="text-white/35 text-[11px] mt-0.5">@LightningSatoshi</p>
              </div>
              <div className="flex-shrink-0">
                {channelJoined ? (
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2.5} />
                  </div>
                ) : (
                  <span className="text-blue-400 text-[11px] font-black tracking-widest uppercase bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
                    JOIN
                  </span>
                )}
              </div>
            </button>

            {/* Verify button */}
            <button
              onClick={() => checkMembership(false)}
              disabled={isChecking}
              className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: channelJoined
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : 'rgba(255,255,255,0.07)',
                color: channelJoined ? '#fff' : 'rgba(255,255,255,0.5)',
                border: channelJoined ? 'none' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: channelJoined ? '0 0 18px rgba(59,130,246,0.25)' : 'none',
              }}
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : channelJoined ? (
                <>Continue <ArrowRight className="w-4 h-4" /></>
              ) : (
                "I've Joined — Verify"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
