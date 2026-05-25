import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";

const CARD = 'rgba(10,10,10,0.97)';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.4)';
const PURPLE = '#2563eb';
const PURPLE_L = '#60a5fa';

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
      const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Mine AXN with me on Axionet! Get 50 AXN on signup.')}`;
      if (tg?.openTelegramLink) tg.openTelegramLink(url);
      else window.open(url, '_blank');
    } catch {}
    setIsSharing(false);
  };

  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>
      <Header onMenuOpen={() => setMenuOpen(true)} onWithdrawOpen={() => setLocation('/wallet')} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 86, paddingTop: 88 }}>

        {/* Hero banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{
          textAlign: 'center', marginBottom: 18,
          background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(29,78,216,0.06))',
          border: '1px solid rgba(37,99,235,0.18)',
          borderRadius: 22, padding: '22px 16px 18px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, transparent)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <p style={{ color: TEXT, fontSize: 22, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px', position: 'relative' }}>
            Refer &amp; Win Big!
          </p>
          <p style={{ color: TEXT_DIM, fontSize: 12, margin: '0 0 18px', position: 'relative' }}>
            Invite friends — earn forever
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, position: 'relative' }}>
            {[
              { label: 'Signup Bonus', value: '50 AXN', color: '#f59e0b', icon: '🏆' },
              { label: 'Commission', value: '10%', color: '#22c55e', icon: '∞' },
              { label: 'Your Miners', value: String(totalFriends), color: '#60a5fa', icon: '👥' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '10px 6px',
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: 15, fontWeight: 900 }}>{s.value}</div>
                <div style={{ color: TEXT_DIM, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Total earned */}
        <div style={{
          background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 16, padding: '12px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div>
              <div style={{ color: TEXT_DIM, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Earned</div>
              <div style={{ color: '#4ade80', fontSize: 20, fontWeight: 900 }}>
                {totalEarned.toFixed(0)} <span style={{ fontSize: 12, opacity: 0.6 }}>AXN</span>
              </div>
            </div>
          </div>
          <div style={{ color: TEXT_DIM, fontSize: 11 }}>Auto-credited</div>
        </div>

        {/* Invite link card */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 18, padding: '14px', marginBottom: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #3b82f6, transparent)' }} />
          <div style={{ paddingLeft: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 800 }}>Your Invite Link</div>
                <div style={{ color: TEXT_DIM, fontSize: 11 }}>Share with friends to earn together</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '9px 12px', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ color: TEXT_DIM, fontSize: 11, fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {referralLink || 'Loading...'}
              </span>
              <button onClick={copyLink} disabled={!referralLink} style={{
                background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
                borderRadius: 8, padding: '4px 12px', color: PURPLE_L,
                fontSize: 11, fontWeight: 700, cursor: referralLink ? 'pointer' : 'not-allowed', flexShrink: 0,
              }}>Copy</button>
            </div>

            <button onClick={shareLink} disabled={!referralLink || isSharing} className="active:scale-95 transition-transform" style={{
              width: '100%',
              background: 'linear-gradient(135deg, #2563eb, #2563eb)',
              border: 'none', borderRadius: 50, color: '#fff',
              fontSize: 13, fontWeight: 800, padding: '12px 0',
              cursor: referralLink ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
              opacity: !referralLink ? 0.5 : 1,
            }}>
              {isSharing ? <Loader2 size={14} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                </svg>
              )}
              Share in Telegram
            </button>
          </div>
        </div>

        {/* Perks */}
        <div style={{
          background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: '12px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ color: '#fbbf24', fontSize: 18 }}>✦</div>
            <div>
              <div style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>Lifetime Commission</div>
              <div style={{ color: TEXT_DIM, fontSize: 11 }}>Earn 10% of their earnings forever</div>
            </div>
          </div>
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 50, padding: '4px 12px', color: '#f59e0b', fontSize: 12, fontWeight: 900,
          }}>10%</div>
        </div>

        {/* Friends list */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>Your Network</span>
          <div style={{
            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.18)',
            borderRadius: 50, padding: '3px 12px',
          }}>
            <span style={{ color: PURPLE_L, fontSize: 11, fontWeight: 700 }}>{referrals.length} friends</span>
          </div>
        </div>

        {referralsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader2 size={22} color="#60a5fa" className="animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18,
            padding: '36px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: '0 auto 16px',
              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.6)" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>No miners yet</p>
            <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0 }}>Share your link and start earning 10% forever.</p>
          </div>
        ) : (
          referrals.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 14, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 0,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${r.isActive ? '#4ade80' : 'rgba(255,255,255,0.12)'}, transparent)` }} />
                <div style={{
                  width: 54, height: 58, flexShrink: 0, marginLeft: 3,
                  background: r.isActive ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={r.isActive ? '#4ade80' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div style={{ flex: 1, padding: '10px 10px', minWidth: 0 }}>
                  <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  {r.username && <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 1 }}>@{r.username}</div>}
                </div>
                <div style={{ paddingRight: 12, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 50,
                    background: r.isActive ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${r.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.06)'}`,
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
