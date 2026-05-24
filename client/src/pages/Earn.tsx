import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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

const badge = (reward: string | number) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    background: 'rgba(124,58,237,0.15)',
    border: '1px solid rgba(124,58,237,0.25)',
    borderRadius: 8,
    color: PURPLE_LIGHT,
    fontSize: 11, fontWeight: 700,
    padding: '2px 8px', marginLeft: 8,
  }}>+{reward}</span>
);

const MISSIONS = [
  { count: 10, reward: 100 },
  { count: 25, reward: 250 },
  { count: 50, reward: 500 },
  { count: 75, reward: 750 },
  { count: 100, reward: 1000 },
  { count: 200, reward: 2000 },
  { count: 300, reward: 3000 },
  { count: 500, reward: 5000 },
];

type Tab = 'tasks' | 'mission' | 'partner';

function MissionRow({ count, reward, progress }: { count: number; reward: number; progress: number }) {
  const done = progress >= count;
  const [claimed, setClaimed] = useState(false);
  const pct = Math.min((progress / count) * 100, 100);

  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <span style={{ color: done ? PURPLE_LIGHT : TEXT, fontSize: 13, fontWeight: 700 }}>
            Invite {count} Friends
          </span>
          {badge(reward.toLocaleString() + ' AXN')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: done ? 'linear-gradient(90deg, #7C3AED, #A78BFA)' : 'linear-gradient(90deg, #5B21B6, #7C3AED)',
              borderRadius: 9999, transition: 'width 0.5s',
            }} />
          </div>
          <span style={{ color: TEXT_DIM, fontSize: 10, whiteSpace: 'nowrap' }}>
            {Math.min(progress, count)}/{count}
          </span>
        </div>
      </div>
      {done && !claimed && (
        <button
          onClick={() => setClaimed(true)}
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 800,
            padding: '7px 16px', cursor: 'pointer', whiteSpace: 'nowrap',
            borderRadius: 50, boxShadow: '0 3px 12px rgba(124,58,237,0.35)',
          }}
        >Claim</button>
      )}
      {claimed && <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>✓ Done</span>}
      {!done && !claimed && (
        <span style={{ fontSize: 10, color: TEXT_DIM, whiteSpace: 'nowrap' }}>Pending</span>
      )}
    </div>
  );
}

export default function Earn() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [taskDone, setTaskDone] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: wellData } = useQuery<any>({ queryKey: ['/api/referrals/well'], staleTime: 30000 });

  const axnBalance = Math.floor(parseFloat(user?.balance || '0'));
  const friendsCount = wellData?.totalFriends ?? 0;
  const dailyProgress = Math.min(friendsCount, 3);
  const dailyComplete = dailyProgress >= 3;

  const [, setLocation] = useLocation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tasks', label: 'Active' },
    { id: 'mission', label: 'Mission' },
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
        <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Daily Network Goal
        </p>
        <div style={{
          ...cardStyle,
          borderLeft: `3px solid ${PURPLE}`,
          marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(18,12,36,0.97))',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Referral Bonus</span>
                {badge('50 AXN')}
              </div>
              <p style={{ color: TEXT_DIM, fontSize: 11, margin: '0 0 8px' }}>Invite 3 friends today</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 7, borderRadius: 9999,
                    background: dailyProgress > i
                      ? 'linear-gradient(90deg, #7C3AED, #A78BFA)'
                      : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${dailyProgress > i ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }} />
                ))}
                <span style={{ color: PURPLE_LIGHT, fontSize: 11, fontWeight: 700, marginLeft: 6 }}>{dailyProgress}/3</span>
              </div>
            </div>
            <button
              onClick={() => dailyComplete && !dailyClaimed && setDailyClaimed(true)}
              disabled={!dailyComplete || dailyClaimed}
              style={{
                flexShrink: 0, padding: '7px 14px',
                background: dailyComplete && !dailyClaimed ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${dailyComplete && !dailyClaimed ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: dailyClaimed ? '#4ade80' : dailyComplete ? '#fff' : TEXT_DIM,
                fontSize: 11, fontWeight: 800, cursor: (dailyComplete && !dailyClaimed) ? 'pointer' : 'default',
                whiteSpace: 'nowrap', borderRadius: 50,
                boxShadow: dailyComplete && !dailyClaimed ? '0 3px 12px rgba(124,58,237,0.35)' : 'none',
              }}
            >
              {dailyClaimed ? '✓ Claimed' : dailyComplete ? 'Claim' : 'In Progress'}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 14,
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid rgba(124,58,237,0.1)',
          borderRadius: 50, padding: 4,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '8px 0', border: 'none',
                background: tab === t.id ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'transparent',
                fontSize: 12, fontWeight: tab === t.id ? 800 : 600,
                color: tab === t.id ? '#fff' : TEXT_DIM,
                cursor: 'pointer', borderRadius: 50,
                boxShadow: tab === t.id ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

            {tab === 'tasks' && (
              <>
                <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Official Task</p>
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Visit Website</span>
                      {badge('10 AXN')}
                    </div>
                    <span style={{ color: TEXT_DIM, fontSize: 11 }}>Visit the official Axionet website</span>
                  </div>
                  <button
                    onClick={() => { window.open('https://axionet.io', '_blank'); setTimeout(() => setTaskDone(true), 2000); }}
                    disabled={taskDone}
                    style={{
                      background: taskDone ? 'rgba(74,222,128,0.1)' : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                      color: taskDone ? '#4ade80' : '#fff',
                      border: taskDone ? '1px solid rgba(74,222,128,0.2)' : 'none',
                      fontSize: 11, fontWeight: 800, padding: '7px 14px',
                      cursor: taskDone ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      borderRadius: 50, boxShadow: taskDone ? 'none' : '0 3px 10px rgba(124,58,237,0.35)',
                    }}
                  >{taskDone ? '✓ Done' : 'Visit →'}</button>
                </div>
              </>
            )}

            {tab === 'mission' && (
              <>
                <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Invite Milestones</p>
                {MISSIONS.map(m => (
                  <MissionRow key={m.count} count={m.count} reward={m.reward} progress={friendsCount} />
                ))}
              </>
            )}

            {tab === 'partner' && (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                <p style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Coming Soon</p>
                <p style={{ color: TEXT_DIM, fontSize: 13 }}>
                  Partner offers coming soon.<br />Stay tuned for exclusive AXN opportunities.
                </p>
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
