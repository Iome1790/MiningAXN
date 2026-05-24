import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import InvitePopup from "@/components/InvitePopup";
import MenuPopup from "@/components/MenuPopup";
import { showRewardedInterstitial } from "@/lib/showAd";

const PURPLE_LIGHT = '#A78BFA';
const PURPLE_DIM = 'rgba(167,139,250,0.6)';
const CARD_BG = 'rgba(18,12,36,0.97)';
const BORDER = 'rgba(124,58,237,0.15)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.45)';

const AD_TASKS = [
  { id: 1, title: 'Start Bot and Join #1', reward: 20, color: '#3b82f6', neon: '#60a5fa' },
  { id: 2, title: 'Start Bot and Join #2', reward: 20, color: '#8b5cf6', neon: '#a78bfa' },
  { id: 3, title: 'Start Bot and Join #3', reward: 20, color: '#10b981', neon: '#34d399' },
  { id: 4, title: 'Start Bot and Join #4', reward: 5,  color: '#f59e0b', neon: '#fbbf24' },
  { id: 5, title: 'Start Bot and Join #5', reward: 5,  color: '#ef4444', neon: '#f87171' },
];

type State = 'idle' | 'loading' | 'claim' | 'done';

function AdRow({ task }: { task: typeof AD_TASKS[0] }) {
  const [state, setState] = useState<State>('idle');

  const handleStart = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      await showRewardedInterstitial();
    } catch {}
    setState('claim');
  };

  const handleClaim = () => {
    if (state === 'claim') setState('done');
  };

  const isDone = state === 'done';
  const isClaim = state === 'claim';
  const isLoading = state === 'loading';

  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 0,
      background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16,
      marginBottom: 8, overflow: 'hidden',
      boxShadow: isDone ? `0 2px 12px rgba(74,222,128,0.1)` : `0 2px 12px ${task.color}18`,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${task.neon}, transparent)`, opacity: isDone ? 0.4 : 0.8 }} />
      <div style={{
        width: 62, height: 66, flexShrink: 0, marginLeft: 3,
        background: isDone ? 'linear-gradient(160deg, #16a34acc, #4ade8088)' : `linear-gradient(160deg, ${task.color}cc, ${task.color}66)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)' }} />
        {isDone ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M4.93 4.93C3.12 6.74 2 9.24 2 12a10 10 0 1 0 10-10c-2.76 0-5.26 1.12-7.07 2.93z"/>
            <path d="M12 8v4l2.5 2.5"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
          <span style={{ color: isDone ? TEXT_DIM : TEXT, fontSize: 13, fontWeight: 700 }}>{task.title}</span>
          <span style={{
            background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 6, color: PURPLE_LIGHT, fontSize: 10, fontWeight: 800, padding: '2px 7px',
          }}>+{task.reward} AXN</span>
        </div>
        {isLoading && <span style={{ color: PURPLE_LIGHT, fontSize: 11 }}>Loading ad...</span>}
        {isClaim && <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>Ad watched — claim your reward</span>}
        {isDone && <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>Reward credited</span>}
      </div>
      <div style={{ paddingRight: 12, flexShrink: 0 }}>
        <button
          onClick={state === 'idle' ? handleStart : state === 'claim' ? handleClaim : undefined}
          disabled={isDone || isLoading}
          className="active:scale-95 transition-transform"
          style={{
            background: isDone
              ? 'rgba(74,222,128,0.1)'
              : isClaim
              ? 'linear-gradient(135deg, #16a34a, #4ade80)'
              : isLoading
              ? 'rgba(255,255,255,0.06)'
              : `linear-gradient(135deg, ${task.color}, ${task.neon})`,
            border: `1px solid ${isDone ? 'rgba(74,222,128,0.25)' : isClaim ? 'rgba(74,222,128,0.4)' : `${task.color}55`}`,
            color: isDone ? '#4ade80' : '#fff',
            fontSize: 11, fontWeight: 800,
            padding: '7px 14px', cursor: (state === 'idle' || state === 'claim') ? 'pointer' : 'not-allowed',
            whiteSpace: 'nowrap', borderRadius: 50,
            opacity: isLoading ? 0.6 : 1,
            boxShadow: (isDone || isLoading) ? 'none' : `0 3px 10px ${task.color}44`,
          }}
        >
          {isDone ? 'Done' : isLoading ? 'Loading...' : isClaim ? 'Claim' : 'Start'}
        </button>
      </div>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 90px', paddingTop: 90 }}>

        <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Ad Rewards
        </p>

        {AD_TASKS.map((task, i) => (
          <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <AdRow task={task} />
          </motion.div>
        ))}

        <div style={{ marginTop: 14 }}>
          <p style={{ color: PURPLE_DIM, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Important
          </p>
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, transparent, #A78BFA, transparent)', opacity: 0.5 }} />
            <div style={{ padding: '12px 14px 12px 18px' }}>
              {[
                'Token credited after verification',
                'Exploits result in account suspension',
                'Instant payment upon approval',
              ].map((note, i) => (
                <div key={i} style={{ color: TEXT_DIM, fontSize: 12, fontWeight: 500, padding: i > 0 ? '6px 0 0' : '0' }}>
                  {note}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {inviteOpen && <InvitePopup onClose={() => setInviteOpen(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
