import { useState } from "react";
import { motion } from "framer-motion";
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

const AD_TASKS = [
  { id: 1, title: 'Start Bot and Join #1', reward: 20, icon: '📡' },
  { id: 2, title: 'Start Bot and Join #2', reward: 20, icon: '📡' },
  { id: 3, title: 'Start Bot and Join #3', reward: 20, icon: '📡' },
  { id: 4, title: 'Start Bot and Join #4', reward: 5, icon: '📡' },
  { id: 5, title: 'Start Bot and Join #5', reward: 5, icon: '📡' },
];

type State = 'idle' | 'pending' | 'claim' | 'done';

function AdRow({ task }: { task: typeof AD_TASKS[0] }) {
  const [state, setState] = useState<State>('idle');

  const handleClick = () => {
    if (state === 'idle') {
      setState('pending');
      setTimeout(() => setState('claim'), 3000);
    } else if (state === 'claim') {
      setState('done');
    }
  };

  const isDone = state === 'done';
  const isClaim = state === 'claim';
  const isPending = state === 'pending';

  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 44, height: 44,
        background: isDone ? 'rgba(74,222,128,0.08)' : 'rgba(124,58,237,0.15)',
        border: `1px solid ${isDone ? 'rgba(74,222,128,0.2)' : 'rgba(124,58,237,0.25)'}`,
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {isDone ? '✓' : task.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ color: isDone ? TEXT_DIM : TEXT, fontSize: 13, fontWeight: 700 }}>{task.title}</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 8, color: PURPLE_LIGHT,
            fontSize: 10, fontWeight: 700, padding: '1px 7px',
          }}>+{task.reward} AXN</span>
        </div>
        {isPending && (
          <span style={{ color: PURPLE_LIGHT, fontSize: 11, fontWeight: 600 }}>Verifying membership...</span>
        )}
        {isDone && (
          <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>✓ Reward credited</span>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={isDone || isPending}
        className="active:scale-95 transition-transform"
        style={{
          background: isDone
            ? 'rgba(74,222,128,0.08)'
            : isClaim
            ? 'linear-gradient(135deg, #4ade80, #16a34a)'
            : isPending
            ? 'rgba(124,58,237,0.08)'
            : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
          border: `1px solid ${isDone ? 'rgba(74,222,128,0.2)' : isClaim ? 'rgba(74,222,128,0.4)' : 'rgba(124,58,237,0.3)'}`,
          color: isDone ? '#4ade80' : '#fff',
          fontSize: 11, fontWeight: 800,
          padding: '7px 14px', cursor: (state === 'idle' || state === 'claim') ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 50,
          opacity: isPending ? 0.6 : 1,
          boxShadow: isDone || isPending ? 'none' : '0 3px 10px rgba(124,58,237,0.3)',
        }}
      >
        {isDone ? '✓ Done' : isPending ? 'Verifying...' : isClaim ? 'Claim →' : 'Start →'}
      </button>
    </div>
  );
}

export default function Watch() {
  const [, setLocation] = useLocation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0614', display: 'flex', flexDirection: 'column' }}>

      <Header
        onMenuOpen={() => setMenuOpen(true)}
        onInviteOpen={() => setInviteOpen(true)}
        onWithdrawOpen={() => setLocation('/wallet')}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 80px', paddingTop: 90 }}>

        <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Ad Rewards
        </p>

        {AD_TASKS.map((task, i) => (
          <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <AdRow task={task} />
          </motion.div>
        ))}

        <div style={{ marginTop: 8 }}>
          <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Important Notes
          </p>
          <div style={{
            ...cardStyle,
            borderLeft: `3px solid rgba(124,58,237,0.4)`,
            background: 'rgba(124,58,237,0.06)',
          }}>
            {[
              '💡 Token credited after verification',
              '⚠️ Exploits result in account suspension',
              '⚡ Instant payment upon approval',
            ].map((note, i) => (
              <div key={i} style={{ color: TEXT_DIM, fontSize: 12, fontWeight: 600, padding: i > 0 ? '6px 0 0' : '0' }}>
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>

      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
