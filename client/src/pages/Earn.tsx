import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { showRewardedInterstitial } from "@/lib/showAd";

const BLUE = '#3b82f6';
const BLUE_D = '#2563eb';
const CARD = 'rgba(255,255,255,0.07)';
const TEXT = '#fff';
const TEXT_DIM = 'rgba(255,255,255,0.35)';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getSlotCount(slotId: number): number {
  return parseInt(localStorage.getItem(`ad_slot_count_${slotId}_${getTodayKey()}`) || '0', 10);
}

function incrementSlotCount(slotId: number): number {
  const key = `ad_slot_count_${slotId}_${getTodayKey()}`;
  const next = getSlotCount(slotId) + 1;
  localStorage.setItem(key, String(next));
  return next;
}

const AD_TASKS = [
  { id: 1, label: 'Ad Reward 1', reward: 12, dailyLimit: 30 },
  { id: 2, label: 'Ad Reward 2', reward: 20, dailyLimit: 50 },
  { id: 3, label: 'Ad Reward 3', reward: 15, dailyLimit: 30 },
  { id: 4, label: 'Ad Reward 4', reward: 15, dailyLimit: 30 },
  { id: 5, label: 'Ad Reward 5', reward: 10, dailyLimit: 30 },
  { id: 6, label: 'Ad Reward 6', reward: 10, dailyLimit: 30 },
  { id: 7, label: 'Ad Reward 7', reward: 10, dailyLimit: 30 },
];

type AdState = 'idle' | 'loading' | 'claim' | 'claiming';

function AdTaskRow({ slotId, label, reward, dailyLimit }: { slotId: number; label: string; reward: number; dailyLimit: number }) {
  const [state, setState] = useState<AdState>('idle');
  const [count, setCount] = useState(() => getSlotCount(slotId));
  const queryClient = useQueryClient();

  const atLimit = count >= dailyLimit;

  const handleWatch = useCallback(async () => {
    if (state !== 'idle' || atLimit) return;
    setState('loading');
    try {
      await showRewardedInterstitial();
    } catch {}
    setState('claim');
  }, [state, atLimit]);

  const handleClaim = useCallback(async () => {
    if (state !== 'claim') return;
    setState('claiming');
    try {
      const res = await apiRequest('POST', '/api/ads/slot-watch', { slot: slotId });
      const data = await res.json();
      const earned = data.rewardAXN ?? reward;
      const newCount = incrementSlotCount(slotId);
      setCount(newCount);
      // Instantly update header CIPHER balance
      queryClient.setQueryData(['/api/auth/user'], (old: any) => {
        if (!old) return old;
        return { ...old, balance: String(Math.floor(parseFloat(old.balance || '0') + earned)) };
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      showNotification(`+${earned} CIPHER earned!`, 'success');
      setState('idle');
    } catch (e: any) {
      let msg = 'Failed to claim. Try again.';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      setState('idle');
      showNotification(msg, 'error');
    }
  }, [state, slotId, reward, queryClient]);

  const btnLabel = state === 'loading' ? 'Loading…' : state === 'claiming' ? 'Saving…' : 'Watch';
  const busy = state === 'loading' || state === 'claiming';

  return (
    <div style={{
      background: CARD, borderRadius: 14,
      padding: '14px 14px 14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      marginBottom: 8,
    }}>
      <div style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {atLimit ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={busy ? 'rgba(96,165,250,0.4)' : BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" fill={busy ? 'rgba(96,165,250,0.2)' : 'rgba(59,130,246,0.18)'} stroke={busy ? 'rgba(96,165,250,0.4)' : BLUE}/>
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: TEXT, fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
          +{reward} CIPHER
        </div>
        <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 3 }}>
          {atLimit ? `Completed  ${count}/${dailyLimit}` : `Today  ${count}/${dailyLimit}`}
        </div>
      </div>

      {state === 'claim' ? (
        <button
          onClick={handleClaim}
          style={{
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 12, fontWeight: 800,
            padding: '9px 18px', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(34,197,94,0.35)',
            flexShrink: 0,
          }}
          className="active:scale-95 transition-transform"
        >CLAIM</button>
      ) : atLimit ? (
        <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>✓ Done</span>
      ) : (
        <button
          onClick={handleWatch}
          disabled={busy}
          style={{
            background: busy ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            border: 'none', borderRadius: 10,
            color: busy ? TEXT_DIM : '#fff',
            fontSize: 12, fontWeight: 800,
            padding: '9px 18px',
            cursor: busy ? 'default' : 'pointer',
            boxShadow: busy ? 'none' : '0 2px 10px rgba(37,99,235,0.35)',
            flexShrink: 0,
          }}
          className={busy ? '' : 'active:scale-95 transition-transform'}
        >{btnLabel}</button>
      )}
    </div>
  );
}

function AxnNameTask({ claimed }: { claimed: boolean }) {
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(claimed);
  const [state, setState] = useState<'idle' | 'checking'>('idle');
  const queryClient = useQueryClient();

  if (done) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText('$AXN').then(() => { setCopied(true); }).catch(() => setCopied(true));
  };

  const handleClaim = async () => {
    if (!copied || state === 'checking') return;
    setState('checking');
    try {
      const res = await apiRequest('POST', '/api/axn-name/verify', {});
      const data = await res.json();
      if (data.success) {
        setDone(true);
        showNotification(data.message || '+50 CIPHER earned!', 'success');
        queryClient.setQueryData(['/api/auth/user'], (old: any) => {
          if (!old) return old;
          return { ...old, balance: String(Math.floor(parseFloat(old.balance || '0') + 50)), axnNameRewardClaimed: true };
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        setState('idle');
        showNotification(data.message || '$AXN not found in your Telegram name', 'error');
      }
    } catch (e: any) {
      setState('idle');
      let msg = 'Verification failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    }
  };

  return (
    <div style={{
      background: CARD, borderRadius: 14,
      padding: '14px 14px 14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
      marginBottom: 8,
    }}>
      <div style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>Add $AXN to your name</span>
          <span style={{
            background: 'rgba(37,99,235,0.12)', borderRadius: 5,
            color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 6px', flexShrink: 0,
          }}>+50 CIPHER</span>
        </div>
        <div style={{ color: TEXT_DIM, fontSize: 11, marginTop: 3 }}>One-time task</div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {state === 'checking' ? (
          <button disabled style={{
            background: 'rgba(255,255,255,0.06)', border: 'none',
            fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10,
            color: TEXT_DIM, cursor: 'default',
          }}>Checking…</button>
        ) : copied ? (
          <button onClick={handleClaim} style={{
            background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none',
            fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10,
            color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(34,197,94,0.35)',
          }} className="active:scale-95 transition-transform">CLAIM</button>
        ) : (
          <button onClick={handleCopy} style={{
            background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`, border: 'none',
            fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10,
            color: '#fff', cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
          }} className="active:scale-95 transition-transform">COPY</button>
        )}
      </div>
    </div>
  );
}

type Tab = 'tasks' | 'partner';

export default function Earn() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });

  const axnNameClaimed = !!user?.axnNameRewardClaimed;
  const hasSpecialTasks = !axnNameClaimed;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Header onMenuOpen={() => setMenuOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 86, paddingTop: 'calc(var(--header-height, 62px) + 12px)' }}>

        <div style={{ padding: '0 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
            Earn in the <span style={{ color: BLUE }}>Axionet</span>
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>Watch ads · Complete tasks · Earn CIPHER</div>
        </div>

        <div style={{ padding: '0 16px', marginBottom: 18 }}>
          <div style={{
            display: 'flex', gap: 4,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 50, padding: 4,
          }}>
            {(['tasks', 'partner'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '9px 0', border: 'none',
                background: tab === t ? `linear-gradient(135deg, ${BLUE_D}, ${BLUE})` : 'transparent',
                fontSize: 12, fontWeight: tab === t ? 800 : 600,
                color: tab === t ? '#fff' : TEXT_DIM,
                cursor: 'pointer', borderRadius: 50,
                boxShadow: tab === t ? '0 2px 10px rgba(37,99,235,0.3)' : 'none',
                transition: 'all 0.18s',
                textTransform: 'capitalize',
              }}>{t === 'tasks' ? 'Active' : 'Partner'}</button>
            ))}
          </div>
        </div>

        {tab === 'tasks' && (
          <div style={{ padding: '0 16px' }}>
            {/* Special Tasks — only shown when there are uncompleted tasks */}
            {hasSpecialTasks && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Special Tasks
                  </span>
                </div>
                <AxnNameTask claimed={axnNameClaimed} />
              </div>
            )}

            {/* Ad Rewards */}
            <div style={{ marginTop: hasSpecialTasks ? 8 : 0, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Ad Rewards
              </span>
            </div>
            {AD_TASKS.map(t => (
              <AdTaskRow key={t.id} slotId={t.id} label={t.label} reward={t.reward} dailyLimit={t.dailyLimit} />
            ))}
          </div>
        )}

        {tab === 'partner' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: CARD, borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.45)" strokeWidth="2" strokeLinecap="round" style={{ marginBottom: 14 }}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 800, margin: '0 0 8px' }}>Coming Soon</p>
              <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0, lineHeight: 1.6 }}>Partner offers coming soon. Exclusive CIPHER opportunities await.</p>
            </div>
          </div>
        )}
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
