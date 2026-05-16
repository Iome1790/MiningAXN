import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle, XCircle, Loader2, HelpCircle,
} from "lucide-react";
import { RiShareForwardFill, RiUserFollowFill, RiLinkM, RiGroupFill, RiCoinFill } from "react-icons/ri";
import { AXNIcon } from "@/components/AXNIcon";
import { FaCopy } from "react-icons/fa";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';
const CUT_LG = 'polygon(16px 0%,calc(100% - 16px) 0%,100% 16px,100% calc(100% - 16px),calc(100% - 16px) 100%,16px 100%,0% calc(100% - 16px),0% 16px)';

const CORNER_ACCENTS = [
  { top:'2px',    left:'14px',  width:'30px', height:'1.5px' },
  { top:'14px',   left:'2px',   width:'1.5px',height:'30px'  },
  { top:'2px',    right:'14px', width:'30px', height:'1.5px' },
  { top:'14px',   right:'2px',  width:'1.5px',height:'30px'  },
  { bottom:'2px', left:'14px',  width:'30px', height:'1.5px' },
  { bottom:'14px',left:'2px',   width:'1.5px',height:'30px'  },
  { bottom:'2px', right:'14px', width:'30px', height:'1.5px' },
  { bottom:'14px',right:'2px',  width:'1.5px',height:'30px'  },
];

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
      const res = await fetch("/api/referrals/well/claim", { method: "POST", credentials: "include" });
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
      if (tgWebApp?.openTelegramLink) tgWebApp.openTelegramLink(shareUrl);
      else window.open(shareUrl, "_blank");
    } catch {}
    setIsSharing(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center px-3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm"
          style={{ maxHeight: '82vh' }}
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        >
          {/* Outer border — cut corners, electric blue glow */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(0,160,255,0.75) 0%,rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75) 100%)',
            clipPath: CUT_LG, padding: '1.5px',
            boxShadow: '0 0 32px rgba(0,120,255,0.45), 0 0 64px rgba(0,80,200,0.2)',
          }}>
            <div style={{
              background: 'linear-gradient(180deg,rgba(5,16,44,0.99) 0%,rgba(3,9,26,0.99) 100%)',
              clipPath: CUT_LG, position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', maxHeight: 'calc(82vh - 3px)',
            }}>
              {/* Corner accent lines */}
              {CORNER_ACCENTS.map((s, i) => (
                <div key={i} className="absolute pointer-events-none"
                  style={{ ...s, background: 'rgba(0,200,255,0.75)', zIndex: 10 }} />
              ))}

              {/* Header */}
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(0,120,255,0.18)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>Invite Friends</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '3px' }}>Earn AXN when friends mine & withdraw</p>
              </div>

              {/* Scrollable body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>

                {/* Well balance card */}
                <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.18)', clipPath: CUT_SM, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <AXNIcon size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '2px' }}>Your Well</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: '22px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        {wellBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700 }}>AXN</span>
                    </div>
                  </div>
                  <button
                    onClick={() => claimWellMutation.mutate()}
                    disabled={claimWellMutation.isPending || wellBalance <= 0}
                    style={{
                      flexShrink: 0, height: '36px', padding: '0 12px', clipPath: CUT_SM,
                      fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      transition: 'all 0.15s', cursor: (claimWellMutation.isPending || wellBalance <= 0) ? 'not-allowed' : 'pointer',
                      opacity: (claimWellMutation.isPending || wellBalance <= 0) ? 0.4 : 1,
                      ...(wellBalance > 0
                        ? { background: 'linear-gradient(135deg,#F5C542,#d4920a)', color: '#000' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }),
                    }}
                  >
                    {claimWellMutation.isPending
                      ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                      : <><RiCoinFill style={{ width: 13, height: 13 }} /> Claim</>}
                  </button>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.18)', clipPath: CUT_SM, padding: '12px', textAlign: 'center' }}>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>{totalFriends}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>Friends Invited</p>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.18)', clipPath: CUT_SM, padding: '12px', textAlign: 'center' }}>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>10%</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px' }}>Commission Rate</p>
                  </div>
                </div>

                {/* Invite link section */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Your Invite Link</p>
                  <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.15)', clipPath: CUT_SM, padding: '12px 14px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: '8px' }}>
                    {referralLink || "Loading..."}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={copyLink}
                      disabled={!referralLink}
                      style={{ height: '44px', clipPath: CUT_SM, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: !referralLink ? 'not-allowed' : 'pointer', opacity: !referralLink ? 0.4 : 1, transition: 'all 0.15s' }}
                    >
                      <FaCopy style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)' }} />
                      Copy
                    </button>
                    <button
                      onClick={shareLink}
                      disabled={!referralLink || isSharing}
                      style={{ height: '44px', clipPath: CUT_SM, background: canAffordShare(referralLink, isSharing) ? 'linear-gradient(135deg,#0847c8 0%,#1560e0 40%,#0a52d4 100%)' : 'rgba(255,255,255,0.05)', border: canAffordShare(referralLink, isSharing) ? '1px solid rgba(80,150,255,0.5)' : '1px solid rgba(255,255,255,0.08)', color: canAffordShare(referralLink, isSharing) ? '#fff' : 'rgba(255,255,255,0.3)', boxShadow: canAffordShare(referralLink, isSharing) ? '0 0 28px rgba(20,80,220,0.7),inset 0 1px 0 rgba(255,255,255,0.18)' : 'none', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: (!referralLink || isSharing) ? 'not-allowed' : 'pointer', opacity: (!referralLink || isSharing) ? 0.4 : 1, transition: 'all 0.15s' }}
                    >
                      {isSharing
                        ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                        : <><RiShareForwardFill style={{ width: 16, height: 16 }} /> Share</>}
                    </button>
                  </div>
                </div>

                {/* How it works link */}
                <button
                  onClick={() => setShowHowItWorks(true)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontWeight: 700, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <HelpCircle style={{ width: 13, height: 13 }} />
                  How does it work?
                </button>

                {/* Friends list */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RiGroupFill style={{ width: 13, height: 13 }} />
                    Friends ({referrals.length})
                  </p>

                  {referralsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                      <Loader2 style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.2)' }} className="animate-spin" />
                    </div>
                  ) : referrals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <RiGroupFill style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.08)', margin: '0 auto 10px' }} />
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 700 }}>No friends yet</p>
                      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', marginTop: '4px' }}>Share your link to fill your Well!</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {referrals.map((r, i) => (
                        <div key={i} style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.15)', clipPath: CUT_SM, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                                {r.isActive
                                  ? <CheckCircle style={{ width: 13, height: 13, color: '#4ade80', flexShrink: 0 }} />
                                  : <XCircle style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
                              </div>
                              {r.username && (
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '2px' }}>@{r.username}</p>
                              )}
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', flexShrink: 0, color: r.isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', background: r.isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', clipPath: CUT_SM }}>
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
              <div style={{ padding: '10px 16px 14px', borderTop: '1px solid rgba(0,120,255,0.15)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <button onClick={onClose}
                  style={{ width: '100%', height: '40px', clipPath: CUT_SM, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'transform 0.12s' }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                >← CLOSE</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* How It Works modal */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center px-3"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHowItWorks(false)} />
            <motion.div
              className="relative w-full max-w-sm"
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <div style={{ background: 'linear-gradient(135deg,rgba(0,160,255,0.75) 0%,rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75) 100%)', clipPath: CUT_LG, padding: '1.5px', boxShadow: '0 0 32px rgba(0,120,255,0.45), 0 0 64px rgba(0,80,200,0.2)' }}>
                <div style={{ background: 'linear-gradient(180deg,rgba(5,16,44,0.99) 0%,rgba(3,9,26,0.99) 100%)', clipPath: CUT_LG, position: 'relative', overflow: 'hidden' }}>
                  {CORNER_ACCENTS.map((s, i) => (
                    <div key={i} className="absolute pointer-events-none"
                      style={{ ...s, background: 'rgba(0,200,255,0.75)', zIndex: 10 }} />
                  ))}
                  <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(0,120,255,0.18)', position: 'relative', zIndex: 1 }}>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How the Well Works</p>
                  </div>
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
                    {[
                      { icon: <RiLinkM style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: '#F5C542' }} />, title: "Invite friends", desc: "Share your unique invite link. Friends join via your link." },
                      { icon: <RiShareForwardFill style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: 'rgba(255,255,255,0.5)' }} />, title: "They mine & withdraw", desc: "Every time a friend withdraws AXN, 10% flows into your Well." },
                      { icon: <RiUserFollowFill style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1, color: '#60a5fa' }} />, title: "Machine level-up bonus", desc: "Earn 50 AXN each time a friend upgrades their mining machine." },
                      { icon: <AXNIcon size={15} />, title: "Claim your Well", desc: "When your Well has AXN, claim it anytime to add to your balance." },
                    ].map((item, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.15)', clipPath: CUT_SM, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        {item.icon}
                        <div>
                          <p style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{item.title}</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '4px 16px 14px', position: 'relative', zIndex: 1 }}>
                    <button onClick={() => setShowHowItWorks(false)}
                      style={{ width: '100%', height: '40px', clipPath: CUT_SM, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'transform 0.12s' }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >Got it</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

function canAffordShare(referralLink: string, isSharing: boolean) {
  return !!(referralLink && !isSharing);
}
