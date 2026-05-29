import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FaTrophy, FaCrown } from "react-icons/fa";
import { FaMedal, FaAward } from "react-icons/fa6";
import { showNotification } from "@/components/AppNotification";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";

const CARD = 'rgba(255,255,255,0.07)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.38)';
const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';

const MEDAL: Record<number, { icon: React.ReactNode; color: string; glow: string }> = {
  1: { icon: <FaCrown size={18} color="#FFD700" />, color: '#FFD700', glow: 'rgba(255,215,0,0.14)' },
  2: { icon: <FaMedal size={18} color="#C0C0C0" />, color: '#C0C0C0', glow: 'rgba(192,192,192,0.10)' },
  3: { icon: <FaAward size={18} color="#CD7F32" />, color: '#CD7F32', glow: 'rgba(205,127,50,0.10)' },
};

interface LeaderEntry {
  rank: number;
  username: string | null;
  firstName: string;
  referrals: number;
  axnEarned: number;
}

interface LbResponse {
  leaderboard: LeaderEntry[];
  myRank: LeaderEntry | null;
}

interface WellData {
  wellBalance: number; totalEarned: number;
  totalFriends: number; totalWithdrawalCommission: number;
}

export default function Friend() {
  const [isSharing, setIsSharing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 60000 });
  const { data: wellData } = useQuery<WellData>({ queryKey: ['/api/referrals/well'], staleTime: 30000 });
  const { data: botInfo } = useQuery<{ username: string }>({ queryKey: ['/api/bot-info'], staleTime: 3600000 });
  const { data: lbData, isLoading: lbLoading } = useQuery<LbResponse>({
    queryKey: ['/api/leaderboard/referrals'],
    staleTime: 60000,
  });

  const botUsername = botInfo?.username || 'bot';
  const referralLink = user?.referralCode ? `https://t.me/${botUsername}?start=${user.referralCode}` : '';
  const totalFriends = wellData?.totalFriends ?? (user?.friendsInvited ?? 0);
  const totalEarned = wellData?.totalEarned ?? 0;
  const leaderboard = lbData?.leaderboard ?? [];
  const myRank = lbData?.myRank ?? null;
  // Is the current user already in the top 10?
  const myRankInTop10 = myRank ? leaderboard.some(e => e.rank === myRank.rank) : false;

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
                <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 2 }}>My Friends</div>
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
        <p style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>Your Invite Link</p>
        <div style={{ background: CARD, borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
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

        {/* Leaderboard */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FaTrophy size={12} color="#FFD700" /> Top Inviters
          </p>
          <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>Top 10</span>
        </div>

        {lbLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader2 size={22} color="#60a5fa" className="animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{ background: CARD, borderRadius: 14, padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <FaTrophy size={36} color="rgba(255,215,0,0.4)" />
            </div>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>No leaders yet</p>
            <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0 }}>Be the first to invite friends and top the board!</p>
          </div>
        ) : (
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto',
              padding: '9px 16px', gap: 12,
              background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color: TEXT_DIM, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>#</span>
              <span style={{ color: TEXT_DIM, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>USERNAME</span>
              <span style={{ color: TEXT_DIM, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textAlign: 'right' }}>AXN EARNED</span>
            </div>

            {leaderboard.map((entry, i) => {
              const medal = MEDAL[entry.rank];
              const isTop3 = entry.rank <= 3;
              const isMe = myRank?.rank === entry.rank;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '36px 1fr auto',
                    alignItems: 'center', padding: '12px 16px', gap: 12,
                    background: isMe
                      ? 'rgba(59,130,246,0.08)'
                      : isTop3 ? medal.glow : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    outline: isMe ? '1px solid rgba(59,130,246,0.25)' : 'none',
                  }}
                >
                  {/* Rank */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isTop3 ? (
                      <span style={{ display: 'flex', alignItems: 'center' }}>{medal.icon}</span>
                    ) : (
                      <span style={{ color: isMe ? '#60a5fa' : TEXT_DIM, fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Username */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        color: isTop3 ? medal.color : TEXT,
                        fontSize: 13, fontWeight: isTop3 ? 800 : 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entry.username ? `@${entry.username}` : entry.firstName}
                      </span>
                      {isMe && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                          color: '#60a5fa', background: 'rgba(59,130,246,0.15)',
                          border: '1px solid rgba(59,130,246,0.3)',
                          borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                        }}>YOU</span>
                      )}
                    </div>
                    <span style={{ color: TEXT_DIM, fontSize: 10, marginTop: 1, display: 'block' }}>
                      {entry.referrals} {entry.referrals === 1 ? 'friend' : 'friends'}
                    </span>
                  </div>

                  {/* AXN earned */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      color: isTop3 ? medal.color : '#4ade80',
                      fontSize: 13, fontWeight: 800,
                    }}>
                      {entry.axnEarned.toLocaleString()}
                    </span>
                    <span style={{ color: TEXT_DIM, fontSize: 10, marginLeft: 3 }}>AXN</span>
                  </div>
                </div>
              );
            })}

            {/* Your Rank row — shown only when user is outside top 10 and has ≥1 referral */}
            {myRank && !myRankInTop10 && myRank.referrals > 0 && (
              <>
                {/* Separator with dots */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '6px 16px', gap: 4,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: 'transparent',
                }}>
                  {[0,1,2].map(d => (
                    <div key={d} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
                  ))}
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr auto',
                  alignItems: 'center', padding: '12px 16px', gap: 12,
                  background: 'rgba(59,130,246,0.08)',
                  borderTop: '1px solid rgba(59,130,246,0.2)',
                }}>
                  {/* Rank number */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 800, fontFamily: 'monospace' }}>
                      {myRank.rank}
                    </span>
                  </div>

                  {/* Name + YOU badge */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        color: '#fff', fontSize: 13, fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {myRank.username ? `@${myRank.username}` : myRank.firstName}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                        color: '#60a5fa', background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                      }}>YOU</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, marginTop: 1, display: 'block' }}>
                      {myRank.referrals} {myRank.referrals === 1 ? 'friend' : 'friends'}
                    </span>
                  </div>

                  {/* AXN earned */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 800 }}>
                      {myRank.axnEarned.toLocaleString()}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, marginLeft: 3 }}>AXN</span>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
