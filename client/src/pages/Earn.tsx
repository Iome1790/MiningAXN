import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { showRewardedInterstitial } from "@/lib/showAd";

const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';
const CARD = 'rgba(10,10,10,0.97)';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.38)';

const sectionLabel = (text: string) => (
  <p style={{ color: TEXT_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>{text}</p>
);

const badge = (txt: string) => (
  <span style={{
    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)',
    borderRadius: 6, color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 8px', marginLeft: 6,
    whiteSpace: 'nowrap',
  }}>{txt}</span>
);

const MISSIONS = [
  { count: 10,  reward: 100  },
  { count: 25,  reward: 250  },
  { count: 50,  reward: 500  },
  { count: 75,  reward: 750  },
  { count: 100, reward: 1000 },
  { count: 200, reward: 2000 },
  { count: 300, reward: 3000 },
  { count: 500, reward: 5000 },
];

const AD_TASKS = [
  { id: 1, reward: 20 },
  { id: 2, reward: 20 },
  { id: 3, reward: 20 },
  { id: 4, reward: 5  },
  { id: 5, reward: 5  },
];

type AdState = 'idle' | 'loading' | 'claim' | 'claiming' | 'done';

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function AdTaskRow({ task }: { task: typeof AD_TASKS[0] }) {
  const [state, setState] = useState<AdState>('idle');
  const queryClient = useQueryClient();

  const handleStart = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try { await showRewardedInterstitial(); } catch {}
    setState('claim');
  };

  const handleClaim = async () => {
    if (state !== 'claim') return;
    setState('claiming');
    try {
      const res = await apiRequest('POST', '/api/ads/extra-watch', {});
      const data = await res.json();
      setState('done');
      showNotification(`+${data.rewardAXN ?? task.reward} AXN earned!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    } catch {
      setState('claim');
      showNotification('Failed to claim reward. Please try again.', 'error');
    }
  };

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      marginBottom: 8, overflow: 'hidden',
      boxShadow: state === 'done' ? '0 2px 12px rgba(74,222,128,0.08)' : '0 2px 12px rgba(37,99,235,0.08)',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${state === 'done' ? '#4ade80' : BLUE}, transparent)`, opacity: state === 'done' ? 0.3 : 0.7 }} />

      {/* Play icon — no colored box background */}
      <div style={{
        width: 50, height: 62, flexShrink: 0, marginLeft: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: state === 'done' ? '#4ade80' : BLUE,
      }}>
        {state === 'done'
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          : <PlayIcon size={22} />
        }
      </div>

      <div style={{ flex: 1, padding: '0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: state === 'done' ? TEXT_DIM : TEXT, fontSize: 13, fontWeight: 700 }}>
            Watch to Earn AXN
          </span>
        </div>
        <div style={{ fontSize: 11, marginTop: 2, color: state === 'loading' ? BLUE : state === 'claim' ? '#fbbf24' : state === 'done' ? '#4ade80' : BLUE }}>
          {state === 'loading' ? 'Loading ad...' : state === 'claim' ? 'Ad watched — claim reward' : state === 'done' ? 'Reward credited' : `+${task.reward} AXN`}
        </div>
      </div>

      <div style={{ paddingRight: 12, flexShrink: 0 }}>
        <button
          onClick={state === 'idle' ? handleStart : state === 'claim' ? handleClaim : undefined}
          disabled={state === 'done' || state === 'loading' || state === 'claiming'}
          style={{
            background: state === 'done' ? 'rgba(74,222,128,0.08)'
              : state === 'claim' ? 'linear-gradient(135deg, #16a34a, #22c55e)'
              : (state === 'loading' || state === 'claiming') ? 'rgba(255,255,255,0.05)'
              : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            border: `1px solid ${state === 'done' ? 'rgba(74,222,128,0.18)' : state === 'claim' ? 'rgba(74,222,128,0.3)' : 'rgba(37,99,235,0.4)'}`,
            color: state === 'done' ? '#4ade80' : '#fff',
            fontSize: 11, fontWeight: 800, padding: '7px 14px',
            cursor: state === 'idle' || state === 'claim' ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap', borderRadius: 50, opacity: (state === 'loading' || state === 'claiming') ? 0.5 : 1,
            boxShadow: (state === 'done' || state === 'loading' || state === 'claiming') ? 'none' : '0 3px 10px rgba(37,99,235,0.35)',
          }}
        >
          {state === 'done' ? 'Done' : (state === 'loading' || state === 'claiming') ? '...' : state === 'claim' ? 'Claim' : 'Watch'}
        </button>
      </div>
    </div>
  );
}

function MissionRow({
  count, reward, progress, claimed, onClaim, isClaiming,
}: {
  count: number; reward: number; progress: number;
  claimed: boolean; onClaim: () => void; isClaiming: boolean;
}) {
  const done = progress >= count;
  const pct = Math.min((progress / count) * 100, 100);

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      marginBottom: 8, overflow: 'hidden',
      boxShadow: done ? '0 2px 14px rgba(37,99,235,0.12)' : 'none',
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${BLUE}, transparent)`, opacity: done ? 1 : 0.35 }} />
      <div style={{
        width: 54, height: 58, flexShrink: 0, marginLeft: 3,
        background: `linear-gradient(160deg, ${BLUE_D}bb, ${BLUE_D}55)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1,
      }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{count}</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>Friends</span>
      </div>
      <div style={{ flex: 1, padding: '10px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ color: claimed ? TEXT_DIM : TEXT, fontSize: 12, fontWeight: 700 }}>Invite {count} Verified Friends</span>
          {badge(`${reward.toLocaleString()} AXN`)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${BLUE_D}, ${BLUE})`, borderRadius: 9999, transition: 'width 0.5s' }} />
          </div>
          <span style={{ color: TEXT_DIM, fontSize: 10, whiteSpace: 'nowrap' }}>{Math.min(progress, count)}/{count}</span>
        </div>
      </div>
      <div style={{ paddingRight: 12, flexShrink: 0 }}>
        {claimed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800 }}>Claimed</span>
          </div>
        ) : done ? (
          <button onClick={onClaim} disabled={isClaiming} style={{
            background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            color: '#fff', border: 'none', fontSize: 11, fontWeight: 800,
            padding: '7px 14px', cursor: 'pointer', borderRadius: 50,
            boxShadow: '0 2px 10px rgba(37,99,235,0.4)', opacity: isClaiming ? 0.6 : 1,
          }}>{isClaiming ? '...' : 'Claim'}</button>
        ) : (
          <span style={{ fontSize: 10, color: TEXT_DIM }}>Pending</span>
        )}
      </div>
    </div>
  );
}

type Tab = 'tasks' | 'mission' | 'partner';

export default function Earn() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [taskDone, setTaskDone] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });

  useEffect(() => {
    if (user?.dailyInviteClaimed) setDailyClaimed(true);
  }, [user?.dailyInviteClaimed]);
  const { data: claimedData } = useQuery<{ claimed: number[] }>({
    queryKey: ['/api/milestone/claimed'],
    staleTime: 60000,
  });

  const verifiedFriends = Number(user?.friendsInvited ?? 0);
  const todayInvites = Number(user?.todayReferrals ?? 0);
  const dailyProgress = Math.min(todayInvites, 3);
  const dailyComplete = dailyProgress >= 3;
  const claimedMilestones = new Set(claimedData?.claimed ?? []);

  const claimDailyMutation = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/daily-tasks/claim/invite', {})).json(),
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

  const claimMilestoneMutation = useMutation({
    mutationFn: async ({ count, reward }: { count: number; reward: number }) => {
      const res = await apiRequest('POST', '/api/milestone/claim', { count, reward });
      return res.json();
    },
    onSuccess: (data, vars) => {
      showNotification(`${vars.reward.toLocaleString()} AXN claimed!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/milestone/claimed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setClaimingMilestone(null);
    },
    onError: (e: any) => {
      let msg = 'Failed to claim';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      if (msg.includes('Already')) {
        queryClient.invalidateQueries({ queryKey: ['/api/milestone/claimed'] });
      }
      showNotification(msg, 'error');
      setClaimingMilestone(null);
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
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column' }}>

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onInviteOpen={() => setInviteOpen(true)}
        onWithdrawOpen={() => setLocation('/wallet')}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', paddingBottom: 86, paddingTop: 88 }}>

        {/* Daily Goal */}
        {sectionLabel('Daily Network Goal')}
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, marginBottom: 14,
          boxShadow: dailyComplete ? '0 4px 20px rgba(37,99,235,0.18)' : 'none',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #60a5fa, transparent)' }} />
          <div style={{ padding: '13px 13px 13px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Referral Bonus</span>
                {badge('50 AXN')}
              </div>
              <p style={{ color: TEXT_DIM, fontSize: 11, margin: '0 0 10px' }}>Invite 3 new friends today</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 5, borderRadius: 9999,
                    background: dailyProgress > i ? 'linear-gradient(90deg, #2563eb, #60a5fa)' : 'rgba(255,255,255,0.06)',
                    transition: 'all 0.3s',
                  }} />
                ))}
                <span style={{ color: BLUE, fontSize: 11, fontWeight: 700, marginLeft: 6, whiteSpace: 'nowrap' }}>{dailyProgress}/3</span>
              </div>
            </div>
            <button
              onClick={() => dailyComplete && !dailyClaimed && !claimDailyMutation.isPending && claimDailyMutation.mutate()}
              disabled={!dailyComplete || dailyClaimed || claimDailyMutation.isPending}
              style={{
                flexShrink: 0, padding: '8px 16px',
                background: dailyComplete && !dailyClaimed ? `linear-gradient(135deg, ${BLUE_D}, ${BLUE})` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${dailyComplete && !dailyClaimed ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: dailyClaimed ? '#4ade80' : dailyComplete ? '#fff' : TEXT_DIM,
                fontSize: 12, fontWeight: 800, cursor: (dailyComplete && !dailyClaimed) ? 'pointer' : 'default',
                whiteSpace: 'nowrap', borderRadius: 50,
                boxShadow: dailyComplete && !dailyClaimed ? '0 3px 12px rgba(37,99,235,0.35)' : 'none',
              }}
            >{dailyClaimed ? 'Claimed' : dailyComplete ? 'Claim' : 'In Progress'}</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 50, padding: 4,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 0', border: 'none',
              background: tab === t.id ? `linear-gradient(135deg, ${BLUE_D}, ${BLUE})` : 'transparent',
              fontSize: 12, fontWeight: tab === t.id ? 800 : 600,
              color: tab === t.id ? '#fff' : TEXT_DIM,
              cursor: 'pointer', borderRadius: 50,
              boxShadow: tab === t.id ? '0 2px 10px rgba(37,99,235,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

            {/* ACTIVE TAB */}
            {tab === 'tasks' && (
              <>
                {sectionLabel('Ad Rewards')}
                {AD_TASKS.map((task, i) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <AdTaskRow task={task} />
                  </motion.div>
                ))}

                <div style={{ marginTop: 14 }}>
                  {sectionLabel('Official Task')}
                  <div style={{
                    position: 'relative', display: 'flex', alignItems: 'center',
                    background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: taskDone ? '0 2px 12px rgba(74,222,128,0.08)' : '0 2px 12px rgba(37,99,235,0.08)',
                  }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${taskDone ? '#4ade80' : BLUE}, transparent)` }} />
                    <div style={{
                      width: 58, height: 62, flexShrink: 0, marginLeft: 3,
                      background: taskDone ? 'rgba(74,222,128,0.12)' : `linear-gradient(160deg, ${BLUE_D}cc, ${BLUE_D}88)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {taskDone
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                      }
                    </div>
                    <div style={{ flex: 1, padding: '0 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: taskDone ? TEXT_DIM : TEXT, fontSize: 13, fontWeight: 700 }}>Visit Website</span>
                        {badge('10 AXN')}
                      </div>
                      <span style={{ color: TEXT_DIM, fontSize: 11 }}>Visit official Axionet website</span>
                    </div>
                    <div style={{ paddingRight: 12, flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          window.open('https://axionet.io', '_blank');
                          setTimeout(async () => {
                            try {
                              const res = await apiRequest('POST', '/api/ads/extra-watch', {});
                              const data = await res.json();
                              showNotification(`+${data.rewardAXN ?? 10} AXN earned!`, 'success');
                              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                            } catch {}
                            setTaskDone(true);
                          }, 2000);
                        }}
                        disabled={taskDone}
                        style={{
                          background: taskDone ? 'rgba(74,222,128,0.07)' : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
                          color: taskDone ? '#4ade80' : '#fff',
                          border: taskDone ? '1px solid rgba(74,222,128,0.2)' : 'none',
                          fontSize: 11, fontWeight: 800, padding: '7px 14px',
                          cursor: taskDone ? 'default' : 'pointer', borderRadius: 50,
                          boxShadow: taskDone ? 'none' : '0 3px 10px rgba(37,99,235,0.35)',
                        }}
                      >{taskDone ? 'Done' : 'Visit'}</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MILESTONES TAB */}
            {tab === 'mission' && (
              <>
                {sectionLabel(`Invite Milestones · ${verifiedFriends} Verified`)}
                {MISSIONS.map(m => (
                  <MissionRow
                    key={m.count}
                    count={m.count} reward={m.reward} progress={verifiedFriends}
                    claimed={claimedMilestones.has(m.count)}
                    isClaiming={claimingMilestone === m.count}
                    onClaim={() => {
                      setClaimingMilestone(m.count);
                      claimMilestoneMutation.mutate({ count: m.count, reward: m.reward });
                    }}
                  />
                ))}
              </>
            )}

            {/* PARTNER TAB */}
            {tab === 'partner' && (
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 18, padding: '40px 24px', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${BLUE}, transparent)`, opacity: 0.4 }} />
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                  background: `linear-gradient(160deg, ${BLUE_D}cc, ${BLUE_D}66)`,
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

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
