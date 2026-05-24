import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { showNotification } from "@/components/AppNotification";

const BG = '#0a0a0a';
const CARD = '#111111';
const BORDER = '#3a2800';
const AMBER = '#c67a00';
const AMBER_BRIGHT = '#f5a623';
const TEXT = '#e0e0e0';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const MONO = "'Courier New', Courier, monospace";

const cardStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderLeft: `2px solid ${AMBER}`,
  padding: '14px 14px',
  marginBottom: 10,
};

const sectionLabel = {
  fontFamily: MONO,
  fontSize: 11,
  color: AMBER,
  letterSpacing: '0.08em',
  margin: '0 0 8px',
};

interface ReferralItem {
  refereeId: string; name: string; username?: string;
  totalSatsEarned: number; referralStatus: string;
  channelMember: boolean; isActive: boolean;
}
interface WellData {
  wellBalance: number; totalEarned: number;
  totalFriends: number; totalWithdrawalCommission: number;
}

export default function Friend() {
  const [isSharing, setIsSharing] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 60000 });
  const { data: referralData, isLoading: referralsLoading } = useQuery<{ referrals: ReferralItem[] }>({ queryKey: ['/api/referrals/list'], staleTime: 60000 });
  const { data: wellData } = useQuery<WellData>({ queryKey: ['/api/referrals/well'], staleTime: 30000 });
  const { data: botInfo } = useQuery<{ username: string }>({ queryKey: ['/api/bot-info'], staleTime: 3600000 });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/referrals/well/claim', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      return data;
    },
    onSuccess: (data) => {
      showNotification(`+${data.amount?.toFixed(2) || 0} AXN claimed!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/referrals/well'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (e: any) => showNotification(e.message || 'Nothing to claim', 'error'),
  });

  const botUsername = botInfo?.username || 'bot';
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : '';
  const referrals = referralData?.referrals || [];
  const wellBalance = wellData?.wellBalance ?? 0;
  const totalFriends = wellData?.totalFriends ?? referrals.length;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showNotification('Link copied!', 'success');
  };

  const shareLink = async () => {
    if (!referralLink || isSharing) return;
    setIsSharing(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('⛏️ Mine AXN with me on Axionet!')}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(url);
      else window.open(url, '_blank');
    } catch {}
    setIsSharing(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: MONO }}>

      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 14px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ color: TEXT_DIM, fontSize: 11, letterSpacing: '0.08em' }}>Invite Friends</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 64px' }}>

        {/* Reward info */}
        <p style={sectionLabel}>Friends</p>
        <div style={{ ...cardStyle, borderLeft: `2px solid ${AMBER_BRIGHT}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ color: TEXT, fontSize: 13 }}>→ Invite Friends</span>
            <span style={{
              display: 'inline-block', background: AMBER, color: '#000',
              fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: '2px 7px',
            }}>+150 AXN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ color: TEXT_DIM, fontSize: 12 }}>→ 10% of their earnings forever</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ background: '#1a1a1a', border: `1px solid ${BORDER}`, padding: '10px 12px' }}>
              <div style={{ color: TEXT_DIM, fontSize: 10, marginBottom: 2 }}>Invited paid miners:</div>
              <div style={{ color: AMBER_BRIGHT, fontSize: 18, fontWeight: 700 }}>{totalFriends}</div>
            </div>
            <div style={{ background: '#1a1a1a', border: `1px solid ${BORDER}`, padding: '10px 12px' }}>
              <div style={{ color: TEXT_DIM, fontSize: 10, marginBottom: 2 }}>Unclaimed Energy</div>
              <div style={{ color: AMBER_BRIGHT, fontSize: 18, fontWeight: 700 }}>
                {wellBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div style={{ background: '#1a1100', border: `1px solid ${BORDER}`, padding: '8px 10px', marginBottom: 10 }}>
            <span style={{ color: TEXT_DIM, fontSize: 11 }}>
              Reward unlock instantly after your friends complete their initial tasks.
            </span>
          </div>
          {/* Claim Well */}
          {wellBalance > 0 && (
            <button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              style={{
                width: '100%', background: '#1c1100', border: `1px solid ${AMBER_BRIGHT}`,
                color: AMBER_BRIGHT, fontFamily: MONO, fontSize: 13,
                padding: '10px 0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {claimMutation.isPending ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : null}
              → Claim {wellBalance.toFixed(2)} AXN ←
            </button>
          )}
        </div>

        {/* Invite Link */}
        <div style={{ ...cardStyle }}>
          <div style={{ color: TEXT_DIM, fontSize: 11, marginBottom: 6 }}>Your invite link</div>
          <div style={{ background: '#1a1a1a', border: `1px solid ${BORDER}`, padding: '8px 10px', marginBottom: 10, wordBreak: 'break-all' }}>
            <span style={{ color: TEXT_DIM, fontSize: 11, fontFamily: 'monospace' }}>
              {referralLink || 'Loading...'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={copyLink}
              disabled={!referralLink}
              style={{
                background: '#1a1a1a', border: `1px solid ${BORDER}`,
                color: TEXT, fontFamily: MONO, fontSize: 12,
                padding: '10px 0', cursor: referralLink ? 'pointer' : 'not-allowed',
              }}
            >Copy Link</button>
            <button
              onClick={shareLink}
              disabled={!referralLink || isSharing}
              style={{
                background: '#1c1100', border: `1px solid ${AMBER_BRIGHT}`,
                color: AMBER_BRIGHT, fontFamily: MONO, fontSize: 12,
                padding: '10px 0', cursor: referralLink ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {isSharing ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : null}
              → Share ←
            </button>
          </div>
        </div>

        {/* Friends List */}
        <p style={sectionLabel}>Friends ({referrals.length})</p>
        {referralsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 style={{ width: 20, height: 20, color: AMBER }} className="animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '24px 16px' }}>
            <p style={{ color: TEXT_DIM, fontSize: 13 }}>No friends yet.</p>
            <p style={{ color: TEXT_DIM, fontSize: 11, marginTop: 4 }}>Share your invite link to get started.</p>
          </div>
        ) : (
          referrals.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: TEXT, fontSize: 13 }}>{r.name}</span>
                    {r.isActive
                      ? <CheckCircle style={{ width: 13, height: 13, color: '#4ade80' }} />
                      : <XCircle style={{ width: 13, height: 13, color: TEXT_DIM }} />}
                  </div>
                  {r.username && <div style={{ color: TEXT_DIM, fontSize: 11 }}>@{r.username}</div>}
                </div>
                <span style={{
                  fontFamily: MONO, fontSize: 10, padding: '3px 8px',
                  background: r.isActive ? '#002210' : '#1a1a1a',
                  border: `1px solid ${r.isActive ? '#22c55e' : BORDER}`,
                  color: r.isActive ? '#4ade80' : TEXT_DIM,
                }}>
                  {r.isActive ? 'Active' : r.referralStatus === 'pending' ? 'Pending' : 'Inactive'}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
