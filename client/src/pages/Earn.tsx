import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { showRewardedInterstitial } from "@/lib/showAd";

const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';
const CARD = 'rgba(255,255,255,0.07)';
const BORDER = 'rgba(255,255,255,0.1)';
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

type AdState = 'idle' | 'cooldown' | 'loading' | 'claim' | 'claiming' | 'done';

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function formatCooldown(msLeft: number): string {
  if (msLeft <= 0) return '00:00';
  const totalSec = Math.ceil(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function AdTaskRow({ task, cooldownMs }: { task: typeof AD_TASKS[0]; cooldownMs: number }) {
  const [state, setState] = useState<AdState>(cooldownMs > 0 ? 'cooldown' : 'idle');
  const [msLeft, setMsLeft] = useState(cooldownMs);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (cooldownMs > 0) {
      setState('cooldown');
      setMsLeft(cooldownMs);
    } else if (state === 'cooldown') {
      setState('idle');
    }
  }, [cooldownMs]);

  useEffect(() => {
    if (state === 'cooldown' && msLeft > 0) {
      timerRef.current = setInterval(() => {
        setMsLeft(prev => {
          const next = prev - 1000;
          if (next <= 0) {
            clearInterval(timerRef.current!);
            setState('idle');
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

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
      const res = await apiRequest('POST', '/api/ads/slot-watch', { slot: task.id });
      const data = await res.json();
      setState('done');
      showNotification(`+${data.rewardAXN ?? task.reward} AXN earned!`, 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ads/slot-cooldowns'] });
      const cd = data.cooldownMs ?? 3600000;
      setMsLeft(cd);
      setTimeout(() => setState('cooldown'), 100);
    } catch (e: any) {
      let msg = 'Failed to claim reward. Please try again.';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      setState('claim');
      showNotification(msg, 'error');
    }
  };

  const isCooldown = state === 'cooldown';
  const isDone = state === 'done';

  const iconColor = isDone ? '#4ade80' : isCooldown ? '#f59e0b' : '#60a5fa';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: CARD, borderRadius: 14,
      marginBottom: 8, padding: '14px 16px',
    }}>
      <div style={{ flexShrink: 0 }}>
        {isDone
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          : isCooldown
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="#60a5fa" stroke="none"/></svg>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: isDone || isCooldown ? TEXT_DIM : TEXT, fontSize: 14, fontWeight: 700 }}>Watch to Earn AXN</div>
        <div style={{ fontSize: 12, marginTop: 2, color: state === 'loading' ? BLUE : state === 'claim' ? '#fbbf24' : isDone ? '#4ade80' : isCooldown ? '#f59e0b' : 'rgba(255,255,255,0.35)' }}>
          {state === 'loading' ? 'Loading ad...'
            : state === 'claim' ? 'Ad watched — tap Claim'
            : isDone ? 'Reward credited'
            : isCooldown ? `Ready in ${formatCooldown(msLeft)}`
            : `+${task.reward} AXN`}
        </div>
      </div>

      <button
        onClick={state === 'idle' ? handleStart : state === 'claim' ? handleClaim : undefined}
        disabled={isDone || isCooldown || state === 'loading' || state === 'claiming'}
        style={{
          background: isDone ? 'rgba(255,255,255,0.06)'
            : isCooldown ? 'rgba(255,255,255,0.06)'
            : state === 'claim' ? 'linear-gradient(135deg, #16a34a, #22c55e)'
            : (state === 'loading' || state === 'claiming') ? 'rgba(255,255,255,0.06)'
            : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
          border: isDone || isCooldown ? '1px solid rgba(255,255,255,0.08)' : 'none',
          color: isDone ? TEXT_DIM : isCooldown ? '#f59e0b' : '#fff',
          fontSize: 12, fontWeight: 800, padding: '9px 16px',
          cursor: state === 'idle' || state === 'claim' ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap', borderRadius: 10, flexShrink: 0,
          boxShadow: (isDone || isCooldown || state === 'loading' || state === 'claiming') ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
        }}
      >
        {isDone ? 'Done' : isCooldown ? formatCooldown(msLeft) : (state === 'loading' || state === 'claiming') ? '...' : state === 'claim' ? 'Claim' : 'Watch'}
      </button>
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
      display: 'flex', alignItems: 'center', gap: 14,
      background: CARD, borderRadius: 14,
      marginBottom: 8, padding: '14px 16px',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={claimed ? '#4ade80' : done ? '#60a5fa' : 'rgba(255,255,255,0.25)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ color: claimed ? TEXT_DIM : TEXT, fontSize: 14, fontWeight: 700 }}>Invite {count} Friends</span>
          {badge(`${reward.toLocaleString()} AXN`)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${BLUE_D}, ${BLUE})`, borderRadius: 9999, transition: 'width 0.5s' }} />
          </div>
          <span style={{ color: TEXT_DIM, fontSize: 10, whiteSpace: 'nowrap' }}>{Math.min(progress, count)}/{count}</span>
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {claimed ? (
          <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 700 }}>✓ Done</span>
        ) : done ? (
          <button onClick={onClaim} disabled={isClaiming} style={{
            background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            color: '#fff', border: 'none', fontSize: 12, fontWeight: 800,
            padding: '9px 16px', cursor: 'pointer', borderRadius: 10,
            boxShadow: '0 2px 12px rgba(37,99,235,0.4)', opacity: isClaiming ? 0.6 : 1,
          }}>{isClaiming ? '...' : 'Claim'}</button>
        ) : (
          <span style={{ fontSize: 11, color: TEXT_DIM }}>—</span>
        )}
      </div>
    </div>
  );
}

type Tab = 'tasks' | 'mission' | 'partner';

export default function Earn() {
  const [tab, setTab] = useState<Tab>('tasks');
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

  const { data: cooldownData } = useQuery<{ cooldowns: Record<string, { availableAt: number; msLeft: number }> }>({
    queryKey: ['/api/ads/slot-cooldowns'],
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const { data: newReferralData } = useQuery<{ count: number }>({
    queryKey: ['/api/referrals/new-count'],
    staleTime: 60000,
  });

  const todayInvites = Number(user?.todayReferrals ?? 0);
  const dailyProgress = Math.min(todayInvites, 3);
  const dailyComplete = dailyProgress >= 3;
  const claimedMilestones = new Set(claimedData?.claimed ?? []);
  const newFriendsCount = newReferralData?.count ?? 0;

  const getCooldownMs = (slot: number): number => {
    const entry = cooldownData?.cooldowns?.[slot.toString()];
    if (!entry) return 0;
    return Math.max(0, entry.msLeft);
  };

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

  const [menuOpen, setMenuOpen] = useState(false);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tasks', label: 'Active' },
    { id: 'mission', label: 'Milestones' },
    { id: 'partner', label: 'Partner' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

      <Header
        onMenuOpen={() => setMenuOpen(true)}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 86, paddingTop: 'calc(var(--header-height, 62px) + 12px)' }}>

        {/* Page title */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Earn in the <span style={{ color: '#3b82f6' }}>Axionet</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Watch ads, complete tasks, hit milestones</div>
        </div>

        {/* Daily Goal */}
        {sectionLabel('Daily Milestone Bonus')}
        <div style={{
          background: CARD, borderRadius: 14, marginBottom: 14, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Daily Milestone</span>
                {badge('50 AXN')}
              </div>
              <p style={{ color: TEXT_DIM, fontSize: 11, margin: '0 0 10px' }}>3 different friends each complete 10 ad tasks today</p>
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

          {/* ACTIVE TAB */}
          {tab === 'tasks' && (
            <>
              {sectionLabel('Ad Rewards')}
              {AD_TASKS.map(task => (
                <AdTaskRow key={task.id} task={task} cooldownMs={getCooldownMs(task.id)} />
              ))}

            </>
          )}

          {/* MILESTONES TAB */}
          {tab === 'mission' && (
            <>
              {sectionLabel(`Invite Milestones · ${newFriendsCount} new friends`)}
              <div style={{
                background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(59,130,246,0.12)',
                borderRadius: 12, padding: '10px 14px', marginBottom: 12,
              }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>
                  Only friends invited after May 25, 2026 count toward milestones.
                </p>
              </div>
              {MISSIONS.map(m => (
                <MissionRow
                  key={m.count}
                  count={m.count} reward={m.reward} progress={newFriendsCount}
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
              background: CARD,
              borderRadius: 14, padding: '40px 24px', textAlign: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.5)" strokeWidth="2" strokeLinecap="round" style={{ marginBottom: 16 }}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <p style={{ color: TEXT, fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>Coming Soon</p>
              <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0 }}>Partner offers coming soon. Stay tuned for exclusive AXN opportunities.</p>
            </div>
          )}
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
