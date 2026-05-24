import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#A78BFA';
const PURPLE_DIM = 'rgba(167,139,250,0.6)';
const CARD_BG = 'rgba(18,12,36,0.97)';
const BORDER = 'rgba(124,58,237,0.15)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

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

  const botUsername = botInfo?.username || 'bot';
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : '';
  const referrals = referralData?.referrals || [];
  const totalFriends = wellData?.totalFriends ?? referrals.length;
  const totalEarned = wellData?.totalEarned ?? 0;

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
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Mine AXN with me on Axionet!')}`;
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
            position: 'relative', overflow: 'hidden',
            marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(91,33,182,0.12) 100%)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 20, padding: '16px 16px',
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #A78BFA, transparent)' }} />
          <div style={{ paddingLeft: 4 }}>
            <p style={{ color: TEXT, fontSize: 15, fontWeight: 900, margin: '0 0 3px' }}>
              Invite friends and earn rewards
            </p>
            <p style={{ color: PURPLE_DIM, fontSize: 12, margin: '0 0 14px' }}>
              150 AXN per friend · Auto-credited to your balance
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.18)',
                borderRadius: 14, padding: '10px 12px',
              }}>
                <p style={{ color: TEXT_DIM, fontSize: 10, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invited Miners</p>
                <p style={{ color: PURPLE_LIGHT, fontSize: 24, fontWeight: 900, margin: '2px 0 0' }}>{totalFriends}</p>
              </div>
              <div style={{
                background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)',
                borderRadius: 14, padding: '10px 12px',
              }}>
                <p style={{ color: TEXT_DIM, fontSize: 10, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Earned</p>
                <p style={{ color: '#4ade80', fontSize: 24, fontWeight: 900, margin: '2px 0 0' }}>
                  {totalEarned.toFixed(0)}
                  <span style={{ color: 'rgba(74,222,128,0.6)', fontSize: 11, marginLeft: 4 }}>AXN</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Invite Link Section */}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 18, padding: '14px 14px 14px 18px', marginBottom: 12,
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #60a5fa, transparent)', opacity: 0.7 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(160deg, #3b82f6cc, #3b82f666)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 800, margin: 0 }}>Share your invite link</p>
              <p style={{ color: TEXT_DIM, fontSize: 11, margin: 0 }}>Copy or share via Telegram</p>
            </div>
          </div>

          <div style={{
            background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)',
            borderRadius: 10, padding: '9px 12px', marginBottom: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span style={{ color: TEXT_DIM, fontSize: 11, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink || 'Loading...'}
            </span>
            <button
              onClick={copyLink}
              disabled={!referralLink}
              style={{
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 8, padding: '4px 12px',
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
              background: 'linear-gradient(135deg, #3b82f6, #7C3AED)',
              border: 'none', borderRadius: 50,
              color: '#fff', fontSize: 13, fontWeight: 800,
              padding: '11px 0', cursor: referralLink ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              opacity: !referralLink ? 0.5 : 1,
            }}
          >
            {isSharing ? <Loader2 size={13} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
            Share in Telegram
          </button>
        </div>

        {/* Friends List */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <p style={{ color: TEXT, fontSize: 14, fontWeight: 800, margin: 0 }}>Your Network</p>
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
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: CARD_BG, border: `1px solid ${BORDER}`,
            borderRadius: 18, padding: '32px 24px', textAlign: 'center',
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #A78BFA, transparent)', opacity: 0.3 }} />
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
              background: 'linear-gradient(160deg, rgba(124,58,237,0.4), rgba(91,33,182,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.8)" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 800, marginBottom: 4 }}>No friends yet</p>
            <p style={{ color: TEXT_DIM, fontSize: 12 }}>Share your invite link to get started.</p>
          </div>
        ) : (
          referrals.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 14, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 0,
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${r.isActive ? '#4ade80' : 'rgba(255,255,255,0.2)'}, transparent)` }} />
                <div style={{
                  width: 54, height: 58, flexShrink: 0, marginLeft: 3,
                  background: r.isActive ? 'linear-gradient(160deg, rgba(74,222,128,0.3), rgba(16,185,129,0.15))' : 'linear-gradient(160deg, rgba(124,58,237,0.2), rgba(91,33,182,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.isActive ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: TEXT, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  </div>
                  {r.username && <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 1 }}>@{r.username}</div>}
                </div>
                <div style={{ paddingRight: 12, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 50,
                    background: r.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${r.isActive ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    color: r.isActive ? '#4ade80' : TEXT_DIM,
                  }}>
                    {r.isActive ? 'Active' : r.referralStatus === 'pending' ? 'Pending' : 'Inactive'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
