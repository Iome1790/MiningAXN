import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import MenuPopup from "@/components/MenuPopup";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#A78BFA';
const PURPLE_DIM = 'rgba(167,139,250,0.6)';
const CARD_BG = 'rgba(18,12,36,0.97)';
const BORDER = 'rgba(124,58,237,0.15)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

const sectionLabel = (text: string) => (
  <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>{text}</p>
);

const rewardBadge = (txt: string) => (
  <span style={{
    background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
    borderRadius: 6, color: PURPLE_LIGHT, fontSize: 10, fontWeight: 800, padding: '2px 8px', marginLeft: 6,
  }}>+{txt}</span>
);

const MISSIONS = [
  { count: 10, reward: 100, color: '#f59e0b', neon: '#fbbf24' },
  { count: 25, reward: 250, color: '#3b82f6', neon: '#60a5fa' },
  { count: 50, reward: 500, color: '#10b981', neon: '#34d399' },
  { count: 75, reward: 750, color: '#ef4444', neon: '#f87171' },
  { count: 100, reward: 1000, color: '#8b5cf6', neon: '#a78bfa' },
  { count: 200, reward: 2000, color: '#f59e0b', neon: '#fbbf24' },
  { count: 300, reward: 3000, color: '#3b82f6', neon: '#60a5fa' },
  { count: 500, reward: 5000, color: '#10b981', neon: '#34d399' },
];

type Tab = 'tasks' | 'mission' | 'partner';

function MissionRow({ count, reward, progress, color, neon }: { count: number; reward: number; progress: number; color: string; neon: string }) {
  const done = progress >= count;
  const [claimed, setClaimed] = useState(false);
  const pct = Math.min((progress / count) * 100, 100);

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 0,
      background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16,
      marginBottom: 8, overflow: 'hidden',
      boxShadow: done ? `0 2px 16px ${color}22` : 'none',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${neon}, transparent)`, opacity: done ? 1 : 0.4 }} />
      <div style={{
        width: 56, height: 60, flexShrink: 0, marginLeft: 3,
        background: `linear-gradient(160deg, ${color}cc, ${color}66)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2,
      }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{count}</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>Friends</span>
      </div>
      <div style={{ flex: 1, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ color: done ? PURPLE_LIGHT : TEXT, fontSize: 12, fontWeight: 700 }}>Invite {count} Verified Friends</span>
          {rewardBadge(`${reward.toLocaleString()} AXN`)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${neon})`, borderRadius: 9999, transition: 'width 0.5s' }} />
          </div>
          <span style={{ color: TEXT_DIM, fontSize: 10, whiteSpace: 'nowrap' }}>{Math.min(progress, count)}/{count}</span>
        </div>
      </div>
      <div style={{ paddingRight: 12, flexShrink: 0 }}>
        {done && !claimed ? (
          <button onClick={() => setClaimed(true)} style={{
            background: `linear-gradient(135deg, ${color}, ${neon})`,
            color: '#fff', border: 'none', fontSize: 11, fontWeight: 800,
            padding: '6px 14px', cursor: 'pointer', borderRadius: 50,
            boxShadow: `0 2px 10px ${color}55`,
          }}>Claim</button>
        ) : claimed ? (
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 800 }}>Done</span>
        ) : (
          <span style={{ fontSize: 10, color: TEXT_DIM }}>Pending</span>
        )}
      </div>
    </div>
  );
}

export default function Earn() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [taskDone, setTaskDone] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  const queryClient = useQueryClient();
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: wellData } = useQuery<any>({ queryKey: ['/api/referrals/well'], staleTime: 30000 });

  const verifiedFriends = Number(user?.friendsInvited ?? 0);
  const todayInvites = Number(user?.todayReferrals ?? 0);
  const dailyProgress = Math.min(todayInvites, 3);
  const dailyComplete = dailyProgress >= 3;

  const claimDailyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-tasks/claim/invite', {});
      return res.json();
    },
    onSuccess: (data) => {
      showNotification(data.message || 'Reward claimed!', 'success');
      setDailyClaimed(true);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (e: any) => {
      let msg = 'Failed to claim';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch { msg = e.message || msg; }
      showNotification(msg, 'error');
    },
  });

  const [, setLocation] = useLocation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tasks', label: 'Active' },
    { id: 'mission', label: 'Milestones' },
    { id: 'partner', label: 'Partner' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0614', display: 'flex', flexDirection: 'column' }}>

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onInviteOpen={() => setInviteOpen(true)}
        onWithdrawOpen={() => setLocation('/wallet')}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', paddingBottom: 80, paddingTop: 90 }}>

        {/* Daily Network Goal */}
        {sectionLabel('Daily Network Goal')}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: CARD_BG, border: `1px solid rgba(124,58,237,0.2)`,
          borderRadius: 18, marginBottom: 16,
          boxShadow: dailyComplete ? '0 4px 24px rgba(124,58,237,0.25)' : 'none',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #A78BFA, transparent)' }} />
          <div style={{ padding: '14px 14px 14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Referral Bonus</span>
                {rewardBadge('50 AXN')}
              </div>
              <p style={{ color: TEXT_DIM, fontSize: 11, margin: '0 0 10px' }}>Invite 3 new friends today</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 6, borderRadius: 9999,
                    background: dailyProgress > i ? 'linear-gradient(90deg, #7C3AED, #A78BFA)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${dailyProgress > i ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.3s',
                  }} />
                ))}
                <span style={{ color: PURPLE_LIGHT, fontSize: 11, fontWeight: 700, marginLeft: 6, whiteSpace: 'nowrap' }}>{dailyProgress}/3</span>
              </div>
            </div>
            <button
              onClick={() => dailyComplete && !dailyClaimed && !claimDailyMutation.isPending && claimDailyMutation.mutate()}
              disabled={!dailyComplete || dailyClaimed || claimDailyMutation.isPending}
              style={{
                flexShrink: 0, padding: '8px 16px',
                background: dailyComplete && !dailyClaimed ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${dailyComplete && !dailyClaimed ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: dailyClaimed ? '#4ade80' : dailyComplete ? '#fff' : TEXT_DIM,
                fontSize: 12, fontWeight: 800, cursor: (dailyComplete && !dailyClaimed) ? 'pointer' : 'default',
                whiteSpace: 'nowrap', borderRadius: 50,
                boxShadow: dailyComplete && !dailyClaimed ? '0 3px 12px rgba(124,58,237,0.4)' : 'none',
              }}
            >
              {dailyClaimed ? 'Claimed' : dailyComplete ? 'Claim' : 'In Progress'}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 14,
          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.1)',
          borderRadius: 50, padding: 4,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 0', border: 'none',
              background: tab === t.id ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'transparent',
              fontSize: 12, fontWeight: tab === t.id ? 800 : 600,
              color: tab === t.id ? '#fff' : TEXT_DIM,
              cursor: 'pointer', borderRadius: 50,
              boxShadow: tab === t.id ? '0 2px 10px rgba(124,58,237,0.35)' : 'none',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

            {tab === 'tasks' && (
              <>
                {sectionLabel('Official Task')}
                <div style={{
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 0,
                  background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16,
                  marginBottom: 8, overflow: 'hidden',
                  boxShadow: taskDone ? '0 2px 12px rgba(74,222,128,0.12)' : '0 2px 12px rgba(124,58,237,0.12)',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${taskDone ? '#4ade80' : '#A78BFA'}, transparent)` }} />
                  <div style={{
                    width: 62, height: 66, flexShrink: 0, marginLeft: 3,
                    background: taskDone ? 'linear-gradient(160deg, #16a34acc, #4ade8088)' : 'linear-gradient(160deg, #7C3AEDcc, #5B21B688)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, padding: '0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: taskDone ? TEXT_DIM : TEXT, fontSize: 14, fontWeight: 700 }}>Visit Website</span>
                      {rewardBadge('10 AXN')}
                    </div>
                    <span style={{ color: TEXT_DIM, fontSize: 11 }}>Visit the official Axionet website</span>
                  </div>
                  <div style={{ paddingRight: 12, flexShrink: 0 }}>
                    <button
                      onClick={() => { window.open('https://axionet.io', '_blank'); setTimeout(() => setTaskDone(true), 2000); }}
                      disabled={taskDone}
                      style={{
                        background: taskDone ? 'rgba(74,222,128,0.1)' : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                        color: taskDone ? '#4ade80' : '#fff',
                        border: taskDone ? '1px solid rgba(74,222,128,0.25)' : 'none',
                        fontSize: 11, fontWeight: 800, padding: '7px 14px',
                        cursor: taskDone ? 'default' : 'pointer', whiteSpace: 'nowrap',
                        borderRadius: 50, boxShadow: taskDone ? 'none' : '0 3px 10px rgba(124,58,237,0.4)',
                      }}
                    >{taskDone ? 'Done' : 'Visit'}</button>
                  </div>
                </div>
              </>
            )}

            {tab === 'mission' && (
              <>
                {sectionLabel(`Invite Milestones · ${verifiedFriends} Verified`)}
                {MISSIONS.map(m => (
                  <MissionRow key={m.count} count={m.count} reward={m.reward} progress={verifiedFriends} color={m.color} neon={m.neon} />
                ))}
              </>
            )}

            {tab === 'partner' && (
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 18, padding: '40px 24px', textAlign: 'center',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #A78BFA, transparent)', opacity: 0.5 }} />
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                  background: 'linear-gradient(160deg, #7C3AEDcc, #5B21B688)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <p style={{ color: TEXT, fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>Coming Soon</p>
                <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0 }}>Partner offers coming soon. Stay tuned for exclusive AXN opportunities.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
