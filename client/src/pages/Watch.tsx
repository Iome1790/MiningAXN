import { useState } from "react";
import { motion } from "framer-motion";

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

  const btnLabel = state === 'idle' ? '→ Start' : state === 'pending' ? 'Verifying...' : state === 'claim' ? '→ Claim ←' : '✓ Done';
  const btnBorder = state === 'done' ? '#2a2a2a' : state === 'claim' ? '#22c55e' : AMBER;
  const btnColor = state === 'done' ? '#4ade80' : state === 'claim' ? '#4ade80' : AMBER_BRIGHT;
  const btnBg = state === 'done' ? '#1a1a1a' : state === 'claim' ? '#002210' : '#1c1100';

  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 38, height: 38, background: '#1a1100', border: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {task.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ color: TEXT, fontSize: 13, fontFamily: MONO }}>{task.title}</span>
          <span style={{
            display: 'inline-block', background: AMBER, color: '#000',
            fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: '2px 7px',
          }}>+{task.reward} AXN</span>
        </div>
        {state === 'pending' && (
          <span style={{ color: AMBER, fontSize: 11, fontFamily: MONO }}>Verifying membership...</span>
        )}
        {state === 'done' && (
          <span style={{ color: '#4ade80', fontSize: 11, fontFamily: MONO }}>Reward credited</span>
        )}
      </div>
      <button
        onClick={handleClick}
        disabled={state === 'done' || state === 'pending'}
        style={{
          background: btnBg, border: `1px solid ${btnBorder}`,
          color: btnColor, fontFamily: MONO, fontSize: 11,
          padding: '7px 12px', cursor: (state === 'idle' || state === 'claim') ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap', flexShrink: 0,
          opacity: state === 'pending' ? 0.6 : 1,
        }}
      >{btnLabel}</button>
    </div>
  );
}

export default function Watch() {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', fontFamily: MONO }}>

      <div style={{ padding: 'max(env(safe-area-inset-top), 16px) 14px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ color: TEXT_DIM, fontSize: 11, letterSpacing: '0.08em' }}>Watch & Earn</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 64px' }}>

        <p style={sectionLabel}>Ad Rewards</p>

        {AD_TASKS.map((task, i) => (
          <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
            <AdRow task={task} />
          </motion.div>
        ))}

        {/* Bottom notes */}
        <div style={{ marginTop: 8 }}>
          <p style={sectionLabel}>Important Notes</p>
          <div style={{ ...cardStyle, borderLeft: `2px solid #3a3a3a` }}>
            {[
              '→ Token Credited after Verification',
              '→ Exploit results in account suspension',
              '→ Instant payment upon approval',
            ].map((note, i) => (
              <div key={i} style={{ color: TEXT_DIM, fontSize: 12, padding: i > 0 ? '6px 0 0' : '0', fontFamily: MONO }}>
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
