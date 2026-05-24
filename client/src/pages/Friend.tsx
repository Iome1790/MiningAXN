import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import MenuPopup from "@/components/MenuPopup";

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#A78BFA';
const PURPLE_DIM = 'rgba(167,139,250,0.6)';
const CARD = 'rgba(18,12,36,0.97)';
const BORDER = 'rgba(124,58,237,0.15)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

const cardStyle = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: '14px 14px',
  marginBottom: 10,
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

  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0614', display: 'flex', flexDirection: 'column' }}>

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onWithdrawOpen={() => setLocation('/wallet')}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', paddingBottom: 80, paddingTop: 90 }}>

        {/* Invite banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(91,33,182,0.16) 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20, padding: '18px 16px',
          }}
        >
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 900, margin: '0 0 4px' }}>
            🎉 Invite new users and earn rewards!
          </p>
          <p style={{ color: PURPLE_DIM, fontSize: 12, margin: '0 0 12px' }}>
            Earn 150 AXN per friend + 10% of their earnings
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 14, padding: '10px 12px',
            }}>
              <p style={{ color: TEXT_DIM, fontSize: 10, margin: 0 }}>Invited Miners</p>
              <p style={{ color: PURPLE_LIGHT, fontSize: 22, fontWeight: 900, margin: '2px 0 0' }}>{totalFriends}</p>
            </div>
            <div style={{
              background: 'rgba(124,58,237,0.12)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 14, padding: '10px 12px',
            }}>
              <p style={{ color: TEXT_DIM, fontSize: 10, margin: 0 }}>Unclaimed AXN</p>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '2px 0 0' }}>
                {wellBalance.toFixed(2)}
              </p>
            </div>
          </div>
          {wellBalance > 0 && (
            <button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="active:scale-95 transition-transform"
              style={{
                width: '100%', marginTop: 12,
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                border: 'none', borderRadius: 50,
                color: '#fff', fontSize: 13, fontWeight: 900,
                padding: '11px 0', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              }}
            >
              {claimMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Claim {wellBalance.toFixed(2)} AXN
            </button>
          )}
        </motion.div>

        {/* Invite Link Section */}
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(124,58,237,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🔗</div>
            <div>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 800, margin: 0 }}>Share the link and invite friends!</p>
              <p style={{ color: TEXT_DIM, fontSize: 11, margin: 0 }}>Copy your link or share via Telegram</p>
            </div>
          </div>

          <div style={{
            background: 'rgba(124,58,237,0.06)',
            border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: 12, padding: '9px 12px',
            marginBottom: 10, wordBreak: 'break-all',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span style={{ color: TEXT_DIM, fontSize: 11, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink || 'Loading...'}
            </span>
            <button
              onClick={copyLink}
              disabled={!referralLink}
              style={{
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 8, padding: '4px 10px',
                color: PURPLE_LIGHT, fontSize: 11, fontWeight: 700,
                cursor: referralLink ? 'pointer' : 'not-allowed', flexShrink: 0,
              }}
            >Copy</button>
          </div>

          <button
            onClick={shareLink}
            disabled={!referralLink || isSharing}
            className="active:scale-95 transition-transform"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              border: 'none', borderRadius: 50,
              color: '#fff', fontSize: 13, fontWeight: 800,
              padding: '11px 0', cursor: referralLink ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
              opacity: !referralLink ? 0.5 : 1,
            }}
          >
            {isSharing ? <Loader2 size={13} className="animate-spin" /> : <span>📢</span>}
            Share in Telegram
          </button>
        </div>

        {/* Friends List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <p style={{ color: TEXT, fontSize: 15, fontWeight: 900, margin: 0 }}>Your Statistics</p>
          <div style={{
            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 50, padding: '3px 10px',
          }}>
            <span style={{ color: PURPLE_LIGHT, fontSize: 11, fontWeight: 700 }}>{referrals.length} friends</span>
          </div>
        </div>

        {referralsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 0' }}>
            <Loader2 size={20} color="#A78BFA" className="animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 4 }}>No friends yet</p>
            <p style={{ color: TEXT_DIM, fontSize: 12 }}>Share your invite link to get started.</p>
          </div>
        ) : (
          referrals.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: r.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(124,58,237,0.1)',
                  border: `1px solid ${r.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(124,58,237,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {r.isActive ? '⛏️' : '👤'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{r.name}</span>
                    {r.isActive
                      ? <CheckCircle size={13} color="#4ade80" />
                      : <XCircle size={13} color="rgba(255,255,255,0.3)" />}
                  </div>
                  {r.username && <div style={{ color: TEXT_DIM, fontSize: 11 }}>@{r.username}</div>}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 50,
                  background: r.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${r.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  color: r.isActive ? '#4ade80' : TEXT_DIM,
                }}>
                  {r.isActive ? 'Active' : r.referralStatus === 'pending' ? 'Pending' : 'Inactive'}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
