import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, Loader2, HelpCircle, X,
} from "lucide-react";
import { RiShareForwardFill, RiUserFollowFill, RiLinkM, RiGroupFill, RiCoinFill } from "react-icons/ri";
import { AXNIcon } from "@/components/AXNIcon";
import { FaCopy } from "react-icons/fa";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";

interface ReferralItem {
  refereeId: string;
  name: string;
  username?: string;
  totalSatsEarned: number;
  referralStatus: string;
  channelMember: boolean;
  isActive: boolean;
}

interface WellData {
  wellBalance: number;
  totalEarned: number;
  totalFriends: number;
  totalWithdrawalCommission: number;
}

interface InvitePopupProps {
  onClose: () => void;
}

export default function InvitePopup({ onClose }: InvitePopupProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 60000,
  });

  const { data: referralData, isLoading: referralsLoading } = useQuery<{ referrals: ReferralItem[] }>({
    queryKey: ["/api/referrals/list"],
    retry: false,
    staleTime: 60000,
  });

  const { data: wellData } = useQuery<WellData>({
    queryKey: ["/api/referrals/well"],
    retry: false,
    staleTime: 30000,
  });

  const claimWellMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/referrals/well/claim", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      return data;
    },
    onSuccess: (data) => {
      showNotification(`+${data.amount?.toFixed(2) || 0} AXN claimed from Well!`, "success");
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/well"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (e: any) => showNotification(e.message || "Nothing to claim", "error"),
  });

  const { data: botInfo } = useQuery<{ username: string }>({
    queryKey: ["/api/bot-info"],
    staleTime: 60 * 60 * 1000,
  });
  const botUsername = botInfo?.username || "bot";
  const referralLink = user?.referralCode
    ? `https://t.me/${botUsername}?start=${user.referralCode}`
    : "";

  const referrals = referralData?.referrals || [];
  const wellBalance = wellData?.wellBalance ?? 0;
  const totalFriends = wellData?.totalFriends ?? referrals.length;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showNotification("Link copied!", "success");
  };

  const shareLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    try {
      const tgWebApp = (window as any).Telegram?.WebApp;
      const shareTitle = "⛏️ Mine AXN with me on Axionet! Use my invite link:";
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareTitle)}`;
      if (tgWebApp?.openTelegramLink) {
        tgWebApp.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, "_blank");
      }
    } catch {}
    setIsSharing(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm rounded-3xl overflow-hidden flex flex-col popup-glow-open"
          style={{ background: 'rgba(8,14,32,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)', maxHeight: '70vh' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#1c1c1e] flex-shrink-0">
            <h2 className="text-white font-black text-sm uppercase tracking-wider">Invite Friends</h2>
            <p className="text-white/30 text-[11px] mt-0.5">Earn 10% of friends' game earnings automatically</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

            {/* Well balance */}
            <div className="bg-white/[0.06] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
              <AXNIcon size={32} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">Your Well</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-black text-2xl tabular-nums leading-none">
                    {wellBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-white/40 text-xs font-bold">AXN</span>
                </div>
              </div>
              <button
                onClick={() => claimWellMutation.mutate()}
                disabled={claimWellMutation.isPending || wellBalance <= 0}
                className="flex-shrink-0 h-9 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-40 flex items-center gap-1.5"
                style={wellBalance > 0 ? {
                  background: "linear-gradient(135deg, #F5C542, #d4920a)",
                  color: "#000",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.25)",
                }}
              >
                {claimWellMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <><RiCoinFill className="w-3.5 h-3.5" /> Claim</>
                )}
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.06] border border-white/5 rounded-2xl p-3 text-center">
                <p className="text-white font-black text-2xl tabular-nums">{totalFriends}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wide mt-1">Friends Invited</p>
              </div>
              <div className="bg-white/[0.06] border border-white/5 rounded-2xl p-3 text-center">
                <p className="text-white font-black text-2xl tabular-nums">10%</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wide mt-1">Commission Rate</p>
              </div>
            </div>

            {/* Invite Link */}
            <div>
              <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-2 px-0.5">Your Invite Link</p>
              <div className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3 text-[11px] text-white/40 font-mono mb-2.5 break-all">
                {referralLink || "Loading..."}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyLink}
                  disabled={!referralLink}
                  className="h-10 flex items-center justify-center gap-2 bg-white/[0.06] border border-white/8 text-white rounded-2xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  <FaCopy className="w-3.5 h-3.5 text-white/40" />
                  Copy Link
                </button>
                <button
                  onClick={shareLink}
                  disabled={!referralLink || isSharing}
                  className="h-10 flex items-center justify-center gap-2 rounded-2xl text-xs font-black transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#fff" }}
                >
                  {isSharing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RiShareForwardFill className="w-4 h-4" />
                  )}
                  {isSharing ? "Sharing..." : "Share"}
                </button>
              </div>
            </div>

            {/* How it works */}
            <button
              onClick={() => setShowHowItWorks(true)}
              className="w-full flex items-center justify-center gap-1.5 text-white/25 text-xs py-1 active:text-white/40 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              How does it work?
            </button>

            {/* Friends List */}
            <div>
              <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-2 px-0.5 flex items-center gap-1.5">
                <RiGroupFill className="w-3.5 h-3.5" />
                Friends ({referrals.length})
              </p>

              {referralsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-8">
                  <RiGroupFill className="w-7 h-7 mx-auto mb-2.5" style={{ color: "rgba(255,255,255,0.08)" }} />
                  <p className="text-white/25 text-sm font-bold">No friends yet</p>
                  <p className="text-white/15 text-xs mt-1">Share your link to fill your Well!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {referrals.map((r, i) => (
                    <div
                      key={i}
                      className="bg-white/[0.06] border border-white/5 rounded-2xl px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white text-sm font-bold truncate">{r.name}</span>
                            {r.isActive ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                            )}
                          </div>
                          {r.username && (
                            <p className="text-white/25 text-[10px] mt-0.5">@{r.username}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          r.isActive
                            ? "bg-white/8 text-white/60"
                            : "bg-white/4 text-white/25"
                        }`}>
                          {r.isActive ? "Active" : r.referralStatus === "pending" ? "Pending" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <div className="px-4 py-3 border-t border-[#1c1c1e] flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 active:scale-[0.97] transition-transform"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* How It Works Modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHowItWorks(false)} />
            <motion.div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden"
              style={{ background: 'rgba(8,14,32,0.72)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.10)' }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <div className="px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
                <p className="text-white font-black text-sm uppercase tracking-wider">How the Well Works</p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {[
                  { icon: <RiLinkM className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F5C542]" />, title: "Invite friends", desc: "Share your unique invite link. Friends join via your link." },
                  { icon: <RiShareForwardFill className="w-4 h-4 flex-shrink-0 mt-0.5 text-white/50" />, title: "They play games", desc: "Every time a friend earns AXN from games, 10% of their reward flows into your Well automatically." },
                  { icon: <RiUserFollowFill className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />, title: "Game earnings only", desc: "Bonus applies to game rewards only — not withdrawals. No commission on what friends withdraw." },
                  { icon: <AXNIcon size={16} />, title: "Claim your Well", desc: "When your Well has AXN, claim it anytime to add to your balance." },
                ].map((item, i) => (
                  <div key={i} className="bg-white/[0.06] border border-white/5 rounded-2xl p-3.5 flex items-start gap-3">
                    {item.icon}
                    <div>
                      <p className="text-white text-xs font-bold">{item.title}</p>
                      <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 transition-transform active:scale-[0.97]"
                  style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
