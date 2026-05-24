import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

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
  fontWeight: 400,
};

const badge = (reward: string | number) => (
  <span style={{
    display: 'inline-block',
    background: AMBER,
    color: '#000',
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    marginLeft: 8,
  }}>+{reward}</span>
);

const arrowBtn = (label: string, onClick: () => void, disabled?: boolean) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: '100%',
      background: disabled ? '#1a1a1a' : '#1c1100',
      border: `1px solid ${disabled ? '#2a2a2a' : AMBER}`,
      color: disabled ? TEXT_DIM : AMBER_BRIGHT,
      fontFamily: MONO,
      fontSize: 13,
      padding: '11px 0',
      cursor: disabled ? 'not-allowed' : 'pointer',
      letterSpacing: '0.05em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}
  >
    {!disabled && <span style={{ color: AMBER }}>→</span>}
    {label}
    {!disabled && <span style={{ color: AMBER }}>←</span>}
  </button>
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

  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontFamily: MONO, color: done ? AMBER_BRIGHT : TEXT, fontSize: 13 }}>
            Invite {count} Friends
          </span>
          {badge(reward.toLocaleString() + ' AXN')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {/* Segmented progress */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 5,
              background: (progress / count) * 10 > i ? AMBER_BRIGHT : '#2a2a2a',
            }} />
          ))}
          <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
            {Math.min(progress, count)}/{count}
          </span>
        </div>
      </div>
      {done && !claimed && (
        <button
          onClick={() => setClaimed(true)}
          style={{
            background: AMBER, color: '#000', border: 'none',
            fontFamily: MONO, fontSize: 12, fontWeight: 700,
            padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >Claim</button>
      )}
      {claimed && <span style={{ fontFamily: MONO, fontSize: 11, color: '#4ade80' }}>✓ Done</span>}
      {!done && !claimed && (
        <span style={{ fontFamily: MONO, fontSize: 10, color: TEXT_DIM, whiteSpace: 'nowrap' }}>
          Pending
        </span>
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

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tasks', label: 'Active' },
    { id: 'mission', label: 'Mission' },
    { id: 'partner', label: 'Partner' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: MONO }}>

      {/* Header */}
      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 14px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: TEXT_DIM, fontSize: 11, letterSpacing: '0.08em' }}>Earn Axionet</span>
          <span style={{ color: AMBER_BRIGHT, fontSize: 13, fontWeight: 700 }}>
            {axnBalance.toLocaleString()} AXN
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 64, padding: '14px 14px 64px' }}>

        {/* Daily Network Goal */}
        <p style={sectionLabel}>Daily Network Goal</p>
        <div style={{ ...cardStyle, borderLeft: `2px solid ${AMBER_BRIGHT}`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                <span style={{ color: TEXT, fontSize: 13 }}>Referral Bonus</span>
                {badge('50 AXN')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <span style={{ color: TEXT_DIM, fontSize: 11 }}>Invite 3 friends today</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 8,
                    background: dailyProgress > i ? AMBER_BRIGHT : '#2a2a2a',
                    border: `1px solid ${dailyProgress > i ? AMBER : '#3a3a3a'}`,
                  }} />
                ))}
                <span style={{ color: AMBER, fontSize: 11, marginLeft: 6 }}>{dailyProgress}/3</span>
              </div>
            </div>
            <button
              onClick={() => dailyComplete && !dailyClaimed && setDailyClaimed(true)}
              disabled={!dailyComplete || dailyClaimed}
              style={{
                flexShrink: 0, padding: '7px 14px', border: `1px solid ${dailyComplete && !dailyClaimed ? AMBER_BRIGHT : BORDER}`,
                background: dailyComplete && !dailyClaimed ? '#1c1100' : '#1a1a1a',
                color: dailyClaimed ? '#4ade80' : dailyComplete ? AMBER_BRIGHT : TEXT_DIM,
                fontFamily: MONO, fontSize: 11, cursor: (dailyComplete && !dailyClaimed) ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
              }}
            >
              {dailyClaimed ? '✓ Claimed' : dailyComplete ? '→ Claim ←' : 'In Progress'}
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 14 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '9px 0', border: 'none', background: 'transparent',
                fontFamily: MONO, fontSize: 12, letterSpacing: '0.05em',
                color: tab === t.id ? AMBER_BRIGHT : TEXT_DIM,
                borderBottom: tab === t.id ? `2px solid ${AMBER_BRIGHT}` : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}
            >{t.label}</button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {tab === 'tasks' && (
              <>
                <p style={sectionLabel}>Official Task</p>
                <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, background: '#1d4ed8', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: TEXT, fontSize: 13 }}>Visit Website</span>
                      {badge('10 AXN')}
                    </div>
                    <span style={{ color: TEXT_DIM, fontSize: 11 }}>Visit the official Axionet website</span>
                  </div>
                  <button
                    onClick={() => { window.open('https://axionet.io', '_blank'); setTimeout(() => setTaskDone(true), 2000); }}
                    disabled={taskDone}
                    style={{
                      background: taskDone ? '#1a1a1a' : '#1c1100',
                      border: `1px solid ${taskDone ? '#2a2a2a' : AMBER}`,
                      color: taskDone ? '#4ade80' : AMBER_BRIGHT,
                      fontFamily: MONO, fontSize: 11, padding: '6px 12px',
                      cursor: taskDone ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >{taskDone ? '✓ Done' : '→ Visit'}</button>
                </div>
              </>
            )}

            {tab === 'mission' && (
              <>
                <p style={sectionLabel}>Invite Milestones</p>
                {MISSIONS.map(m => (
                  <MissionRow key={m.count} count={m.count} reward={m.reward} progress={friendsCount} />
                ))}
              </>
            )}

            {tab === 'partner' && (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
                <p style={{ color: TEXT_DIM, fontFamily: MONO, fontSize: 13 }}>
                  Partner offers coming soon.<br/>Stay tuned for exclusive AXN opportunities.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
