import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChannelJoinPopupProps {
  telegramId: string;
  onVerified: () => void;
}

export default function ChannelJoinPopup({ telegramId, onVerified }: ChannelJoinPopupProps) {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
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
        if (data.channelMember) {
          onVerified();
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } else if (!isInitialCheck) {
          setError("You haven't joined the channel yet. Please join first.");
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
          <div className="px-5 pt-8 pb-2" />

          <div className="px-5 pb-5 space-y-3">
            {error && (
              <div className="py-2.5 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-xs text-center font-semibold">{error}</p>
              </div>
            )}

            <button
              onClick={openChannel}
              className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                boxShadow: '0 0 18px rgba(59,130,246,0.25)',
              }}
            >
              <Send className="w-4 h-4" strokeWidth={2} />
              Join to Access
            </button>

            <button
              onClick={() => checkMembership(false)}
              disabled={isChecking}
              className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>I&apos;VE JOINED — VERIFY <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
