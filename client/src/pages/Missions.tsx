import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import Header from "@/components/Header";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';

interface MissionStatus {
  success: boolean;
  secsUntilReset: number;
  hasNewReferralToday: boolean;
  login: { claimed: boolean };
  announcement: { claimed: boolean };
  watchAd: { claimed: boolean };
  shareApp: { claimed: boolean };
  appTime: { claimed: boolean; seconds: number };
  community: { claimed: boolean };
  invite: { claimed: boolean; available: boolean };
}

function formatReset(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function MissionRow({ emoji, title, reward, claimed, actionLabel, disabled, loading, subtext, onAction }: {
  emoji: string; title: string; reward: string; claimed: boolean;
  actionLabel: string; disabled?: boolean; loading?: boolean; subtext?: string; onAction: () => void;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.14)', clipPath: CUT_SM, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, lineHeight: 1.2 }}>{title}</p>
        {subtext && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{subtext}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <AXNIcon size={11} />
          <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700 }}>{reward}</span>
        </div>
      </div>
      {claimed ? (
        <div style={{ width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', clipPath: CUT_SM, flexShrink: 0 }}>
          <Check style={{ width: 14, height: 14, color: '#60a5fa' }} />
        </div>
      ) : (
        <button onClick={onAction} disabled={disabled || loading}
          style={{ width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: disabled ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,rgba(0,120,255,0.9),rgba(0,80,200,0.85))', border: `1px solid ${disabled ? 'rgba(255,255,255,0.09)' : 'rgba(59,130,246,0.5)'}`, clipPath: CUT_SM, flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 700, color: disabled ? 'rgba(255,255,255,0.3)' : '#fff', opacity: loading ? 0.6 : 1 }}>
          {loading ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : actionLabel}
        </button>
      )}
    </div>
  );
}

export default function Missions() {
  const queryClient = useQueryClient();
  const [adLoading, setAdLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const timeTrackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: status, isLoading } = useQuery<MissionStatus>({
    queryKey: ['/api/daily-missions/status'],
    refetchInterval: 15000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/daily-missions/status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, [queryClient]);

  const claimMutation = useMutation({
    mutationFn: (endpoint: string) => apiRequest('POST', endpoint, {}).then(r => r.json()),
    onSuccess: (d) => { showNotification(d.message || 'Reward claimed!', 'success'); invalidate(); },
    onError: (e: any) => showNotification(e.message || 'Failed to claim', 'error'),
  });

  const trackTimeMutation = useMutation({
    mutationFn: (secs: number) => apiRequest('POST', '/api/daily-missions/track-app-time', { seconds: secs }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/daily-missions/status'] }),
  });

  useEffect(() => {
    if (!status?.appTime.claimed) {
      timeTrackRef.current = setInterval(() => trackTimeMutation.mutate(30), 30000);
    }
    return () => { if (timeTrackRef.current) clearInterval(timeTrackRef.current); };
  }, [status?.appTime.claimed]);

  const handleWatchAd = async () => {
    if (adLoading) return;
    setAdLoading(true);
    try {
      if ((window as any).Adsgram) {
        await (window as any).Adsgram.init({ blockId: "int-20373" }).show();
        claimMutation.mutate('/api/daily-missions/claim/watch-ad');
      } else showNotification('Ad not available right now', 'error');
    } catch { showNotification('Ad failed or was skipped', 'error'); }
    finally { setAdLoading(false); }
  };

  const handleShareApp = async () => {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const res = await apiRequest('POST', '/api/share/prepare-message', {});
      const data = await res.json();
      const link = data.referralLink || '';
      if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Join me on Axionet Miner and earn AXN together!')}`);
      setTimeout(() => { claimMutation.mutate('/api/daily-missions/claim/share-app'); setShareLoading(false); }, 2000);
    } catch { claimMutation.mutate('/api/daily-missions/claim/share-app'); setShareLoading(false); }
  };

  const handleOpenLink = (url: string, endpoint: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
    setTimeout(() => claimMutation.mutate(endpoint), 3000);
  };

  const appTimePct = Math.min(100, Math.round(((status?.appTime.seconds ?? 0) / 600) * 100));
  const appTimeMins = Math.floor((status?.appTime.seconds ?? 0) / 60);

  const totalClaimed = status ? [
    status.login.claimed, status.announcement.claimed, status.watchAd.claimed,
    status.shareApp.claimed, status.appTime.claimed, status.community.claimed,
    ...(status.hasNewReferralToday ? [status.invite.claimed] : []),
  ].filter(Boolean).length : 0;
  const totalMissions = status ? (status.hasNewReferralToday ? 7 : 6) : 6;

  return (
    <Layout>
      <Header />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', paddingTop: 64, paddingBottom: 76 }}>

        {/* Page title */}
        <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: 0, letterSpacing: 0.5 }}>Daily Missions</h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>
                {status ? `Resets in ${formatReset(status.secsUntilReset)}` : 'Loading…'}
              </p>
            </div>
            {status && (
              <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 12, padding: '6px 14px', textAlign: 'center' }}>
                <p style={{ color: '#60a5fa', fontWeight: 900, fontSize: 18, margin: 0 }}>{totalClaimed}</p>
                <p style={{ color: 'rgba(59,130,246,0.6)', fontSize: 10, margin: 0 }}>of {totalMissions}</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, height: 2, background: 'rgba(59,130,246,0.08)', borderRadius: 1, overflow: 'hidden' }}>
            {status && <div style={{ height: '100%', width: `${(totalClaimed / totalMissions) * 100}%`, background: 'linear-gradient(90deg,#1d4ed8,#60a5fa)', borderRadius: 1, transition: 'width 0.5s' }} />}
          </div>
        </div>

        {/* Scrollable mission list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <Loader2 style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.2)' }} className="animate-spin" />
            </div>
          ) : !status ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0' }}>Failed to load missions</p>
          ) : (
            <>
              <MissionRow emoji="🌅" title="Daily Login" reward="+2 AXN" claimed={status.login.claimed} actionLabel="Claim" loading={claimMutation.isPending} onAction={() => claimMutation.mutate('/api/daily-missions/claim/login')} />
              <MissionRow emoji="📢" title="Check Announcement" reward="+1 AXN" claimed={status.announcement.claimed} actionLabel="Open" loading={claimMutation.isPending} onAction={() => handleOpenLink('https://t.me/LightningSatoshi', '/api/daily-missions/claim/announcement')} />
              <MissionRow emoji="📺" title="Watch an Ad" reward="+3 AXN" claimed={status.watchAd.claimed} actionLabel="Watch" loading={adLoading} onAction={handleWatchAd} />
              <MissionRow emoji="🔗" title="Share the App" reward="+2 AXN" claimed={status.shareApp.claimed} actionLabel="Share" loading={shareLoading} onAction={handleShareApp} />

              {/* App time row */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.14)', clipPath: CUT_SM, padding: '13px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>⏱️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>Stay Active 10 min</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <AXNIcon size={11} />
                      <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 700 }}>+2 AXN</span>
                    </div>
                    <div style={{ marginTop: 6, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${appTimePct}%`, background: 'linear-gradient(90deg,#1d4ed8,#3b82f6)', borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>{appTimeMins}/10 min</p>
                  </div>
                  {status.appTime.claimed ? (
                    <div style={{ width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', clipPath: CUT_SM, flexShrink: 0 }}>
                      <Check style={{ width: 14, height: 14, color: '#60a5fa' }} />
                    </div>
                  ) : (
                    <div style={{ width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', clipPath: CUT_SM, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                      {appTimePct}%
                    </div>
                  )}
                </div>
              </div>

              <MissionRow emoji="👥" title="Join Community" reward="+3 AXN" claimed={status.community.claimed} actionLabel="Join" loading={claimMutation.isPending} onAction={() => handleOpenLink('https://t.me/PaidAdzGroup', '/api/daily-missions/claim/community')} />

              {status.hasNewReferralToday && (
                <MissionRow emoji="🎉" title="New Referral Today!" reward="+5 AXN" claimed={status.invite.claimed} actionLabel="Claim" loading={claimMutation.isPending} onAction={() => claimMutation.mutate('/api/daily-missions/claim/invite')} />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
