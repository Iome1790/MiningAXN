import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";

const CARD = 'rgba(255,255,255,0.07)';
const BORDER = 'rgba(255,255,255,0.1)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';

const sectionLabel = (text: string) => (
  <p style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>{text}</p>
);

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
  const [menuOpen, setMenuOpen] = useState(false);

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
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join Axionet! I earn 150 AXN for every friend who completes 10 tasks. Start earning now!')}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(url);
      else window.open(url, '_blank');
    } catch {}
    setIsSharing(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <Header onMenuOpen={() => setMenuOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 86, paddingTop: 'calc(var(--header-height, 62px) + 12px)' }}>

        {/* Page title */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Invite &amp; <span style={{ color: BLUE }}>Earn</span>
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>Earn 150 AXN per friend who completes 10 ad tasks</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div style={{ background: CARD, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <div>
                <div style={{ color: TEXT, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{totalFriends}</div>
                <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2 }}>Total Friends</div>
              </div>
            </div>
          </div>
          <div style={{ background: CARD, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              <div>
                <div style={{ color: TEXT, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{totalEarned.toFixed(0)}</div>
                <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2 }}>AXN Earned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Invite link */}
        {sectionLabel('Your Invite Link')}
        <div style={{ background: CARD, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: TEXT_DIM, fontSize: 11, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink || 'Loading...'}
            </span>
            <button onClick={copyLink} disabled={!referralLink} style={{
              background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 7, padding: '5px 12px', color: '#60a5fa',
              fontSize: 11, fontWeight: 700, cursor: referralLink ? 'pointer' : 'not-allowed', flexShrink: 0,
            }}>Copy</button>
          </div>

          <button onClick={shareLink} disabled={!referralLink || isSharing} className="active:scale-95 transition-transform" style={{
            width: '100%',
            background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 14, fontWeight: 800, padding: '13px 0',
            cursor: referralLink ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
            opacity: !referralLink ? 0.5 : 1,
          }}>
            {isSharing ? <Loader2 size={16} className="animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
            Share in Telegram
          </button>
        </div>

        {/* Friends list */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {sectionLabel('Your Network')}
          <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{referrals.length} friends</span>
        </div>

        {referralsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader2 size={22} color="#60a5fa" className="animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <div style={{
            background: CARD, borderRadius: 14,
            padding: '40px 24px', textAlign: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.4)" strokeWidth="2" strokeLinecap="round" style={{ marginBottom: 14 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>No friends yet</p>
            <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0 }}>Share your link. Earn 150 AXN when each friend completes 10 ad tasks.</p>
          </div>
        ) : (
          referrals.map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: CARD,
              borderRadius: 14, marginBottom: 8, padding: '12px 16px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={r.isActive ? '#4ade80' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                {r.username && <div style={{ color: TEXT_DIM, fontSize: 12 }}>@{r.username}</div>}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                background: r.isActive ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${r.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
                color: r.isActive ? '#4ade80' : TEXT_DIM,
              }}>
                {r.isActive ? 'Active' : r.referralStatus === 'pending' ? 'Pending' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
