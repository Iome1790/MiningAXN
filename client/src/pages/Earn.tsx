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

const ProviderIcon = ({ provider }: { provider: AdProvider }) => {
  if (provider === 'Monetag') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
  if (provider === 'Adgram') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/>
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
    </svg>
  );
};

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
    try {
      await runAdForProvider(provider);
    } catch {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
        {/* Icon circle */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: atLimit ? 'rgba(74,222,128,0.1)' : 'rgba(59,130,246,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {atLimit
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <ProviderIcon provider={provider} />
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{provider}</span>
            <span style={{
              background: 'rgba(37,99,235,0.12)', borderRadius: 5,
              color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 6px',
            }}>+{reward} CIPHER</span>
          </div>
          <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
            {atLimit ? `${dailyLimit}/${dailyLimit} — come back tomorrow` : `${count}/${dailyLimit} today · ${desc}`}
          </div>
        </div>

        {/* Button */}
        <button
          onClick={handleWatch}
          disabled={busy || atLimit}
          style={{
            flexShrink: 0,
            background: atLimit
              ? 'rgba(255,255,255,0.06)'
              : busy
                ? 'rgba(255,255,255,0.06)'
                : `linear-gradient(135deg, ${BLUE_D}, ${BLUE})`,
            color: atLimit ? 'rgba(255,255,255,0.3)' : busy ? 'rgba(255,255,255,0.4)' : '#fff',
            border: 'none',
            borderRadius: 10, padding: '9px 16px',
            fontSize: 12, fontWeight: 800,
            cursor: busy || atLimit ? 'not-allowed' : 'pointer',
            boxShadow: busy || atLimit ? 'none' : '0 2px 12px rgba(37,99,235,0.4)',
            display: 'flex', alignItems: 'center', gap: 5,
            letterSpacing: '0.03em',
          }}
          className={busy || atLimit ? '' : 'active:scale-95 transition-transform'}
        >
          {state === 'loading' && (
            <span style={{ width: 11, height: 11, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          )}
          {btnLabel}
        </button>
      </div>
      {!isLast && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
    </>
  );
}

function AxnNameTask({ claimed }: { claimed: boolean }) {
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(claimed);
  const [state, setState] = useState<'idle' | 'checking'>('idle');
  const queryClient = useQueryClient();

  if (done) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText('$AXN').then(() => setCopied(true)).catch(() => setCopied(true));
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(59,130,246,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>Add $AXN to your name</span>
          <span style={{
            background: 'rgba(37,99,235,0.12)', borderRadius: 5,
            color: BLUE, fontSize: 10, fontWeight: 800, padding: '2px 6px',
          }}>+50 CIPHER</span>
        </div>
        <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>One-time task</div>
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

        {/* Page title */}
        <div style={{ padding: '0 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: TEXT, letterSpacing: '-0.5px' }}>
            Earn in the <span style={{ color: BLUE }}>Axionet</span>
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 3 }}>Watch ads · Complete tasks · Earn CIPHER</div>
        </div>

        {/* Tab toggle */}
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

            {/* Special Tasks */}
            {hasSpecialTasks && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Special Tasks
                  </span>
                </div>
                <div style={{ background: CARD, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                  <AxnNameTask claimed={axnNameClaimed} />
                </div>
              </>
            )}

            {/* Earn with Ads */}
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Earn with Ads
              </span>
            </div>
            <div style={{ background: CARD, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
              {AD_TASKS.map((t, i) => (
                <AdRow
                  key={t.id}
                  slotId={t.id}
                  provider={t.provider}
                  desc={t.desc}
                  reward={t.reward}
                  dailyLimit={t.dailyLimit}
                  isLast={i === AD_TASKS.length - 1}
                />
              ))}
            </div>

            {/* Info note */}
            <div style={{
              background: 'rgba(37,99,235,0.06)', borderRadius: 12,
              padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
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
        )}

        {tab === 'partner' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{ background: CARD, borderRadius: 14, padding: '40px 24px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(59,130,246,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(96,165,250,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 800, margin: '0 0 8px' }}>Coming Soon</p>
              <p style={{ color: TEXT_DIM, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                Partner offers coming soon. Exclusive CIPHER opportunities await.
              </p>
            </div>
          </div>
        )}
      </div>

      {menuOpen && <MenuPopup onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
