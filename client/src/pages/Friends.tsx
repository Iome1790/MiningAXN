import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { FaCopy } from "react-icons/fa";
import { RiShareForwardFill, RiGroupFill } from "react-icons/ri";
import { showNotification } from "@/components/AppNotification";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import Header from "@/components/Header";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';

interface ReferralItem {
  refereeId: string;
  name: string;
  username?: string;
  isActive: boolean;
  referralStatus: string;
  commissionRate: number;
}

interface WellData { totalEarned: number; totalFriends: number; }

export default function Friends() {
  const [isSharing, setIsSharing] = useState(false);
  const [showHow, setShowHow] = useState(false);

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], staleTime: 60000 });
  const { data: referralData, isLoading } = useQuery<{ referrals: ReferralItem[] }>({ queryKey: ["/api/referrals/list"], staleTime: 60000 });
  const { data: wellData } = useQuery<WellData>({ queryKey: ["/api/referrals/well"], staleTime: 30000 });
  const { data: botInfo } = useQuery<{ username: string }>({ queryKey: ["/api/bot-info"], staleTime: 3600000 });

  const botUsername = botInfo?.username || "bot";
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : "";
  const referrals = referralData?.referrals || [];
  const totalFriends = wellData?.totalFriends ?? referrals.length;
  const totalEarned = wellData?.totalEarned ?? 0;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showNotification("Link copied!", "success");
  };

  const shareLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("⛏️ Mine AXN with me on Axionet! Use my invite link:")}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank");
    } catch {}
    setIsSharing(false);
  };

  return (
    <Layout>
      <Header />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', paddingTop: 64, paddingBottom: 76 }}>

        {/* Page title */}
        <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: 0, letterSpacing: 0.5 }}>Invite Friends</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>Earn 15 🔑 Keys per verified referral</p>
          </div>
          <button onClick={() => setShowHow(true)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, cursor: 'pointer' }}>
            <HelpCircle style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0 }}>{totalFriends}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Friends</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ color: '#FFD700', fontWeight: 900, fontSize: 18, margin: 0 }}>15 🔑</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Per Ref</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.14)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ color: '#60a5fa', fontWeight: 900, fontSize: 20, margin: 0 }}>{totalEarned.toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Keys Earned</p>
            </div>
          </div>

          {/* Invite link */}
          <div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Your Invite Link</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 10, padding: '11px 14px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 8 }}>
              {referralLink || "Loading..."}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={copyLink} disabled={!referralLink}
                style={{ height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer', opacity: !referralLink ? 0.4 : 1 }}>
                <FaCopy style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)' }} /> Copy
              </button>
              <button onClick={shareLink} disabled={!referralLink || isSharing}
                style={{ height: 44, borderRadius: 10, background: (referralLink && !isSharing) ? 'linear-gradient(135deg,#0847c8,#1560e0)' : 'rgba(255,255,255,0.04)', border: (referralLink && !isSharing) ? '1px solid rgba(80,150,255,0.4)' : '1px solid rgba(255,255,255,0.08)', color: (referralLink && !isSharing) ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                {isSharing ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <><RiShareForwardFill style={{ width: 15, height: 15 }} /> Share</>}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

          {/* Friends list */}
          <div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <RiGroupFill style={{ width: 12, height: 12 }} /> Friends ({referrals.length})
            </p>

            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Loader2 style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.2)' }} className="animate-spin" />
              </div>
            ) : referrals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <RiGroupFill style={{ width: 30, height: 30, color: 'rgba(255,255,255,0.07)', margin: '0 auto 10px' }} />
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 700 }}>No friends yet</p>
                <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 4 }}>Invite friends to earn 10% on their withdrawals</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {referrals.map((r, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                        {r.isActive ? <CheckCircle style={{ width: 13, height: 13, color: '#4ade80', flexShrink: 0 }} /> : <XCircle style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
                      </div>
                      {r.username && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 2 }}>@{r.username}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: r.isActive ? '#4ade80' : 'rgba(255,255,255,0.25)', background: r.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${r.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                        {r.isActive ? "Active" : r.referralStatus === "pending" ? "Pending" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works modal */}
      <AnimatePresence>
        {showHow && (
          <motion.div className="fixed inset-0 z-[300] flex items-center justify-center px-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHow(false)} />
            <motion.div className="relative w-full max-w-sm" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 320 }}>
              <div style={{ background: 'rgba(5,16,44,0.99)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: 16, marginBottom: 4 }}>How It Works</p>
                {[
                  { icon: "🔗", title: "1. Invite friends", desc: "Share your unique invite link. Friends join Axionet via your link." },
                  { icon: "🎯", title: "2. They complete 10 tasks", desc: "Your friend must complete at least 10 bounty tasks to be verified." },
                  { icon: "🔑", title: "3. You earn 15 Keys instantly", desc: "Once verified, 15 Keys are added to your balance automatically." },
                  { icon: "🚀", title: "More friends = more Keys", desc: "No limit. Each verified friend earns you 15 Keys." },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{item.icon}</span>
                    <div>
                      <p style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{item.title}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
                <button onClick={() => setShowHow(false)} style={{ height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                  Got it ✓
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
