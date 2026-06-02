import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import MenuPopup from "@/components/MenuPopup";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import { showMonatagRewardedAd, showAdgramAd, showGigapubAd } from "@/lib/showAd";

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

type AdProvider = 'Monetag' | 'Adgram' | 'Gigapub';
const AD_TASKS: { id: number; provider: AdProvider; desc: string; reward: number; dailyLimit: number }[] = [
  { id: 1, provider: 'Monetag',  desc: 'Rewarded interstitial ads',   reward: 10, dailyLimit: 50 },
  { id: 2, provider: 'Adgram',   desc: 'In-app telegram ads',         reward: 10, dailyLimit: 10 },
  { id: 3, provider: 'Gigapub',  desc: 'Display & native ads',        reward: 10, dailyLimit: 30 },
];
async function runAdForProvider(provider: AdProvider): Promise<void> {
  if (provider === 'Monetag') await showMonatagRewardedAd();
  else if (provider === 'Adgram') await showAdgramAd();
  else await showGigapubAd();
}
type AdState = 'idle' | 'loading' | 'claiming';
const PROVIDER_LOGOS: Record<AdProvider, string> = {
  Monetag: '/monetag-logo.jpg',
  Adgram:  '/adsgram-logo.jpg',
  Gigapub: '/gigapub-logo.jpg',
};
const ProviderIcon = ({ provider }: { provider: AdProvider }) => (
  <img src={PROVIDER_LOGOS[provider]} alt={provider} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
);

function AdRow({ slotId, provider, desc, reward, dailyLimit, isLast }: {
  slotId: number; provider: AdProvider; desc: string; reward: number; dailyLimit: number; isLast: boolean;
}) {
  const [state, setState] = useState<AdState>('idle');
  const [count, setCount] = useState(() => getSlotCount(slotId));
  const queryClient = useQueryClient();
  const atLimit = count >= dailyLimit;
  const busy = state !== 'idle';

  const handleWatch = useCallback(async () => {
    if (busy || atLimit) return;
    setState('loading');
    try { await runAdForProvider(provider); } catch {
      setState('idle');
      showNotification('Ad did not complete. Please try again.', 'error');
      return;
    }
    setState('claiming');
    try {
      const res = await apiRequest('POST', '/api/ads/slot-watch', { slot: slotId });
      const data = await res.json();
      const earned = data.rewardAXN ?? reward;
      const newCount = incrementSlotCount(slotId);
      setCount(newCount);
      queryClient.setQueryData(['/api/auth/user'], (old: any) => {
        if (!old) return old;
        return { ...old, balance: String(Math.floor(parseFloat(old.balance || '0') + earned)) };
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      showNotification(`+${earned} CIPHER earned!`, 'success');
    } catch (e: any) {
      let msg = 'Failed to claim. Try again.';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    }
    setState('idle');
  }, [busy, atLimit, provider, slotId, reward, queryClient]);

  const btnLabel = state === 'loading' ? 'Loading…' : state === 'claiming' ? 'Saving…' : atLimit ? 'DONE' : 'WATCH';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
        {atLimit
          ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
          : <img src={PROVIDER_LOGOS[provider]} alt={provider} style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{provider}</span>
            <span style={{ background: 'rgba(37,99,235,0.12)', borderRadius: 5, color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 6px' }}>+{reward} CIPHER</span>
          </div>
          <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
            {atLimit ? `${dailyLimit}/${dailyLimit} — come back tomorrow` : `${count}/${dailyLimit} today · ${desc}`}
          </div>
        </div>
        <button onClick={handleWatch} disabled={busy || atLimit} style={{
          flexShrink: 0,
          background: atLimit ? 'rgba(255,255,255,0.06)' : busy ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
          color: atLimit ? 'rgba(255,255,255,0.3)' : busy ? 'rgba(255,255,255,0.4)' : '#fff',
          border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, fontWeight: 800,
          cursor: busy || atLimit ? 'not-allowed' : 'pointer',
          boxShadow: busy || atLimit ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
          display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.03em',
        }} className={busy || atLimit ? '' : 'active:scale-95 transition-transform'}>
          {state === 'loading' && <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
          {btnLabel}
        </button>
      </div>
      {!isLast && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
    </>
  );
}

function AxnNameTaskDaily({ claimedToday }: { claimedToday: boolean }) {
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(claimedToday);
  const [state, setState] = useState<'idle' | 'checking'>('idle');
  const queryClient = useQueryClient();

  if (done) return null;

  const handleCopy = () => { navigator.clipboard.writeText('$AXN').then(() => setCopied(true)).catch(() => setCopied(true)); };

  const handleClaim = async () => {
    if (!copied || state === 'checking') return;
    setState('checking');
    try {
      const res = await apiRequest('POST', '/api/axn-name/verify', {});
      const data = await res.json();
      if (data.success) {
        setDone(true);
        showNotification(data.message || '+10 CIPHER earned!', 'success');
        queryClient.setQueryData(['/api/auth/user'], (old: any) => {
          if (!old) return old;
          return { ...old, balance: String(Math.floor(parseFloat(old.balance || '0') + 10)), axnNameClaimedToday: true };
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>Add $AXN to your name</span>
          <span style={{ background: 'rgba(37,99,235,0.12)', borderRadius: 5, color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 6px' }}>+10 CIPHER</span>
        </div>
        <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>Daily task · resets every day</div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {state === 'checking' ? (
          <button disabled style={{ background: 'rgba(255,255,255,0.06)', border: 'none', fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10, color: TEXT_DIM, cursor: 'default' }}>Checking…</button>
        ) : copied ? (
          <button onClick={handleClaim} style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(34,197,94,0.35)' }} className="active:scale-95 transition-transform">CLAIM</button>
        ) : (
          <button onClick={handleCopy} style={{ background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`, border: 'none', fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,99,235,0.3)' }} className="active:scale-95 transition-transform">COPY</button>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, children, rightEl }: { title: string; subtitle: string; children: React.ReactNode; rightEl?: React.ReactNode }) {
  return (
    <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: TEXT }}>{title}</div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>{subtitle}</div>
        </div>
        {rightEl}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center' }}>
      <div style={{ color: TEXT_DIM, fontSize: 13, fontWeight: 600 }}>No Task</div>
    </div>
  );
}

function PartnerTaskRow({ task, isLast }: { task: any; isLast: boolean }) {
  const [clicked, setClicked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(task.completed);
  const queryClient = useQueryClient();

  const handleGo = () => {
    if (task.url) window.open(task.url, '_blank');
    setClicked(true);
  };

  const handleClaim = async () => {
    if (claiming || done) return;
    setClaiming(true);
    try {
      const res = await apiRequest('POST', `/api/bounty-tasks/${task.id}/complete`, {});
      const data = await res.json();
      if (data.success !== false) {
        setDone(true);
        showNotification(`+${task.rewardAxn} CIPHER earned!`, 'success');
        queryClient.setQueryData(['/api/auth/user'], (old: any) => {
          if (!old) return old;
          return { ...old, balance: String(Math.floor(parseFloat(old.balance || '0') + (task.rewardAxn || 0))) };
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bounty-tasks'] });
      } else {
        showNotification(data.message || 'Failed to claim', 'error');
      }
    } catch (e: any) {
      let msg = 'Failed to claim';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    }
    setClaiming(false);
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
        {done
          ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              {/* External link / partner task icon */}
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{task.title}</span>
            <span style={{ background: 'rgba(37,99,235,0.12)', borderRadius: 5, color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 6px' }}>+{task.rewardAxn} CIPHER</span>
          </div>
          {task.description && <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>{task.description}</div>}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
          {!done && !clicked && (
            <button onClick={handleGo} style={{ background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`, border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(37,99,235,0.3)' }} className="active:scale-95 transition-transform">GO</button>
          )}
          {!done && clicked && (
            <button onClick={handleClaim} disabled={claiming} style={{ background: claiming ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 800, color: claiming ? TEXT_DIM : '#fff', cursor: claiming ? 'not-allowed' : 'pointer', boxShadow: claiming ? 'none' : '0 2px 12px rgba(34,197,94,0.35)' }} className="active:scale-95 transition-transform">
              {claiming ? '…' : 'CLAIM'}
            </button>
          )}
          {done && <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 800, padding: '9px 4px' }}>DONE</span>}
        </div>
      </div>
      {!isLast && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
    </>
  );
}

function UserTaskRow({ task, isLast }: { task: any; isLast: boolean }) {
  const [clicked, setClicked] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(!!task.completed_by_me);
  const queryClient = useQueryClient();

  const handleGo = () => {
    if (task.link) window.open(task.link, '_blank');
    setClicked(true);
  };

  const handleClaim = async () => {
    if (claiming || done) return;
    setClaiming(true);
    try {
      const res = await apiRequest('POST', `/api/user-tasks/${task.id}/complete`, {});
      const data = await res.json();
      if (data.success) {
        setDone(true);
        showNotification(`+${task.reward_per_completion} CIPHER earned!`, 'success');
        queryClient.setQueryData(['/api/auth/user'], (old: any) => {
          if (!old) return old;
          return { ...old, balance: String(Math.floor(parseFloat(old.balance || '0') + (task.reward_per_completion || 10))) };
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-tasks'] });
      } else {
        showNotification(data.message || 'Failed to claim', 'error');
      }
    } catch (e: any) {
      let msg = 'Failed to claim';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    }
    setClaiming(false);
  };

  const remaining = (task.impressions || 0) - (task.completed_count || 0);

  const isChannel = task.category === 'channel_group';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px' }}>
        {done
          ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
          : isChannel
            ? /* Channel / Group icon — two people */
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            : /* Bot / Website icon — terminal prompt */
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{task.title}</span>
            <span style={{ background: 'rgba(168,85,247,0.12)', borderRadius: 5, color: '#a855f7', fontSize: 10, fontWeight: 800, padding: '2px 6px' }}>+{task.reward_per_completion} CIPHER</span>
          </div>
          <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>{remaining} slots left</div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
          {!done && !clicked && (
            <button onClick={handleGo} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 10px rgba(168,85,247,0.3)' }} className="active:scale-95 transition-transform">GO</button>
          )}
          {!done && clicked && (
            <button onClick={handleClaim} disabled={claiming} style={{ background: claiming ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 12, fontWeight: 800, color: claiming ? TEXT_DIM : '#fff', cursor: claiming ? 'not-allowed' : 'pointer', boxShadow: claiming ? 'none' : '0 2px 12px rgba(34,197,94,0.35)' }} className="active:scale-95 transition-transform">
              {claiming ? '…' : 'CLAIM'}
            </button>
          )}
          {done && <span style={{ color: '#4ade80', fontSize: 12, fontWeight: 800, padding: '9px 4px' }}>DONE</span>}
        </div>
      </div>
      {!isLast && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
    </>
  );
}

function AddMissionPopup({ onClose, userBalance }: { onClose: () => void; userBalance: number }) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState<'channel_group' | 'website_bot'>('channel_group');
  const [impressions, setImpressions] = useState('10');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const imp = parseInt(impressions, 10) || 0;
  const totalCost = imp * 35;
  const canAfford = userBalance >= totalCost;

  const handleCreate = async () => {
    if (!title.trim()) { showNotification('Enter a task name', 'error'); return; }
    if (!link.trim()) { showNotification('Enter a task link', 'error'); return; }
    if (imp < 10) { showNotification('Minimum 10 impressions required', 'error'); return; }
    if (!canAfford) { showNotification(`Insufficient balance. Need ${totalCost} CIPHER`, 'error'); return; }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/user-tasks', { title: title.trim(), link: link.trim(), category, impressions: imp });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Task submitted for review!', 'success');
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-tasks'] });
        onClose();
      } else {
        showNotification(data.message || 'Failed to create task', 'error');
      }
    } catch (e: any) {
      let msg = 'Failed to create task';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch {}
      showNotification(msg, 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f, #111118)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px',
        paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: TEXT, marginBottom: 4 }}>Add Mision</div>
          <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>Promote your channel or bot and get real users.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Task Name</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Join My Channel"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Task Link</label>
            <input
              value={link} onChange={e => setLink(e.target.value)}
              placeholder="https://t.me/..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' }}>Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([['channel_group', 'Channel / Group'], ['website_bot', 'Website / Bot']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setCategory(val)} style={{
                  padding: '11px 0', borderRadius: 12, border: `1.5px solid ${category === val ? BLUE : 'rgba(255,255,255,0.1)'}`,
                  background: category === val ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)',
                  color: category === val ? BLUE : TEXT_DIM, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5 }}>
              Important: You must add the verification bot as an admin in your Channel/Group for task verification.
            </span>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Number of Impressions <span style={{ color: TEXT_DIM }}>(min 10)</span></label>
            <input
              type="number" value={impressions} onChange={e => setImpressions(e.target.value)}
              min={10} placeholder="10"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: TEXT_DIM, fontSize: 13 }}>Price per impression</span>
              <span style={{ color: BLUE, fontSize: 13, fontWeight: 700 }}>35 CIPHER</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: TEXT_DIM, fontSize: 13 }}>User reward per completion</span>
              <span style={{ color: '#4ade80', fontSize: 13, fontWeight: 700 }}>+10 CIPHER</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>Total Cost</span>
              <span style={{ color: canAfford ? TEXT : '#f87171', fontSize: 14, fontWeight: 900 }}>{totalCost} CIPHER</span>
            </div>
            {!canAfford && imp >= 10 && (
              <div style={{ color: '#f87171', fontSize: 11, marginTop: 6 }}>Insufficient balance. You have {Math.floor(userBalance)} CIPHER.</div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !canAfford || imp < 10}
            style={{
              width: '100%', padding: '15px 0',
              background: loading || !canAfford || imp < 10 ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
              border: 'none', borderRadius: 14, color: loading || !canAfford || imp < 10 ? TEXT_DIM : '#fff',
              fontSize: 15, fontWeight: 800, cursor: loading || !canAfford || imp < 10 ? 'not-allowed' : 'pointer',
              boxShadow: loading || !canAfford || imp < 10 ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            className={loading || !canAfford || imp < 10 ? '' : 'active:scale-95 transition-transform'}
          >
            {loading && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
            {loading ? 'Publishing…' : `Publish Task · ${totalCost} CIPHER`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPartnerTaskPopup({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [rewardAxn, setRewardAxn] = useState('50');
  const [totalImpressions, setTotalImpressions] = useState('0');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!title.trim()) { showNotification('Enter a title', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiRequest('POST', '/api/admin/partner-tasks', { title: title.trim(), description: description.trim(), url: url.trim(), rewardAxn: parseInt(rewardAxn, 10), totalImpressions: parseInt(totalImpressions, 10) });
      const data = await res.json();
      if (data.success) {
        showNotification('Partner task created!', 'success');
        queryClient.invalidateQueries({ queryKey: ['/api/bounty-tasks'] });
        onClose();
      } else {
        showNotification(data.message || 'Failed', 'error');
      }
    } catch {
      showNotification('Failed to create', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f, #111118)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px 24px 0 0',
        padding: '24px 20px',
        paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />
        <div style={{ fontSize: 18, fontWeight: 900, color: TEXT, marginBottom: 18 }}>Add Partner Task</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Title', value: title, set: setTitle, placeholder: 'Task title' },
            { label: 'Description', value: description, set: setDescription, placeholder: 'Short description (optional)' },
            { label: 'Link URL', value: url, set: setUrl, placeholder: 'https://...' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Reward (CIPHER)</label>
              <input type="number" value={rewardAxn} onChange={e => setRewardAxn(e.target.value)} min={1}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Total Impressions</label>
              <input type="number" value={totalImpressions} onChange={e => setTotalImpressions(e.target.value)} min={0}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: TEXT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={loading} style={{
            width: '100%', padding: '15px 0',
            background: loading ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            border: 'none', borderRadius: 14, color: loading ? TEXT_DIM : '#fff',
            fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }} className={loading ? '' : 'active:scale-95 transition-transform'}>
            {loading && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
            {loading ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Earn() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddMission, setShowAddMission] = useState(false);
  const [showAdminPartner, setShowAdminPartner] = useState(false);

  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });
  const { data: bountyTasksRaw } = useQuery<any>({ queryKey: ['/api/bounty-tasks'], staleTime: 30000 });
  const bountyTasks: any[] = Array.isArray(bountyTasksRaw) ? bountyTasksRaw : (bountyTasksRaw?.tasks ?? []);
  const { data: userTasks = [] } = useQuery<any[]>({ queryKey: ['/api/user-tasks'], staleTime: 30000 });

  const axnNameClaimedToday = !!user?.axnNameClaimedToday;
  const userBalance = Math.floor(parseFloat(user?.balance || '0'));
  const isAdmin = !!user?.isAdmin;

  const activeBountyTasks = bountyTasks.filter((t: any) => t.isActive !== false);
  const botTasks = userTasks.filter((t: any) => t.category === 'website_bot');
  const socialTasks = userTasks.filter((t: any) => t.category === 'channel_group');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', overflowX: 'hidden', width: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Header onMenuOpen={() => setMenuOpen(true)} />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'max(86px, calc(env(safe-area-inset-bottom, 0px) + 86px))', paddingTop: 'calc(var(--header-height, 62px) + 12px)', width: '100%' }}>

        <div style={{ padding: '0 16px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '-0.5px' }}>
                Earn in the <span style={{ color: BLUE }}>Axionet</span>
              </div>
              <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>Watch ads · Complete tasks · Earn CIPHER</div>
            </div>
            <button onClick={() => setShowAddMission(true)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              background: `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
              border: 'none', borderRadius: 12, padding: '9px 14px',
              color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(37,99,235,0.4)', marginTop: 2,
            }} className="active:scale-95 transition-transform">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Mision
            </button>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>

          {/* Special Daily Task */}
          {!axnNameClaimedToday && (
            <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', marginBottom: 18 }}>
              <AxnNameTaskDaily claimedToday={axnNameClaimedToday} />
            </div>
          )}

          {/* Earn with Ads */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Earn with Ads</span>
          </div>
          <div style={{ background: CARD, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
            {AD_TASKS.map((t, i) => (
              <AdRow key={t.id} slotId={t.id} provider={t.provider} desc={t.desc} reward={t.reward} dailyLimit={t.dailyLimit} isLast={i === AD_TASKS.length - 1} />
            ))}
          </div>

          {/* Partner Tasks */}
          <SectionCard
            title="Partner Tasks"
            subtitle="Complete tasks with increased rewards."
            rightEl={isAdmin ? (
              <button onClick={() => setShowAdminPartner(true)} style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '6px 12px', color: BLUE, fontSize: 12, fontWeight: 800, cursor: 'pointer' }} className="active:scale-95 transition-transform">+ Add</button>
            ) : undefined}
          >
            {activeBountyTasks.length === 0
              ? <EmptyState />
              : activeBountyTasks.map((t: any, i: number) => (
                  <PartnerTaskRow key={t.id} task={t} isLast={i === activeBountyTasks.length - 1} />
                ))
            }
          </SectionCard>

          {/* Bot Tasks */}
          <SectionCard title="Bot Tasks" subtitle="Launch BOT and get rewards.">
            {botTasks.length === 0
              ? <EmptyState />
              : botTasks.map((t: any, i: number) => (
                  <UserTaskRow key={t.id} task={t} isLast={i === botTasks.length - 1} />
                ))
            }
          </SectionCard>

          {/* Social Tasks */}
          <SectionCard title="Social Tasks" subtitle="Complete social tasks and get rewards.">
            {socialTasks.length === 0
              ? <EmptyState />
              : socialTasks.map((t: any, i: number) => (
                  <UserTaskRow key={t.id} task={t} isLast={i === socialTasks.length - 1} />
                ))
            }
          </SectionCard>

          {/* Info note */}
          <div style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.5 }}>
              Each CIPHER earned increases your Season Drop chance. Watch more ads to maximize your rewards.
            </span>
          </div>

        </div>
      </div>

      {showAddMission && <AddMissionPopup onClose={() => setShowAddMission(false)} userBalance={userBalance} />}
      {showAdminPartner && <AdminPartnerTaskPopup onClose={() => setShowAdminPartner(false)} />}
      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
