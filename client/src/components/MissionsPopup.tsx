import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';
const CUT_LG = 'polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)';

interface MissionsPopupProps {
  onClose: () => void;
}

interface MissionStatus {
  success: boolean;
  secsUntilReset: number;
  appTimeSeconds: number;
  hasNewReferralToday: boolean;
  login: { claimed: boolean };
  announcement: { claimed: boolean };
  watchAd: { claimed: boolean };
  shareApp: { claimed: boolean };
  appTime: { claimed: boolean; seconds: number };
  community: { claimed: boolean };
  invite: { claimed: boolean; available: boolean };
  bonus: { claimed: boolean; available: boolean };
}

function formatReset(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

interface MissionRowProps {
  emoji: string;
  title: string;
  reward: string;
  claimed: boolean;
  actionLabel: string;
  actionColor: string;
  disabled?: boolean;
  loading?: boolean;
  subtext?: string;
  onAction: () => void;
}

function MissionRow({ emoji, title, reward, claimed, actionLabel, actionColor, disabled, loading, subtext, onAction }: MissionRowProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(59,130,246,0.14)',
      clipPath: CUT_SM,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0, lineHeight: 1.2 }}>{title}</p>
        {subtext && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '2px 0 0', lineHeight: 1 }}>{subtext}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <AXNIcon size={10} />
          <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>{reward}</span>
        </div>
      </div>
      {claimed ? (
        <div style={{
          width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)',
          clipPath: CUT_SM, flexShrink: 0,
        }}>
          <Check style={{ width: 14, height: 14, color: '#60a5fa' }} />
        </div>
      ) : (
        <button
          onClick={onAction}
          disabled={disabled || loading}
          style={{
            width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: disabled ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,rgba(0,120,255,0.9),rgba(0,80,200,0.85))',
            border: `1px solid ${disabled ? 'rgba(255,255,255,0.09)' : 'rgba(59,130,246,0.5)'}`,
            clipPath: CUT_SM, flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: 11, fontWeight: 700, color: disabled ? 'rgba(255,255,255,0.3)' : '#fff',
            letterSpacing: 0.3, transition: 'opacity 0.15s',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : actionLabel}
        </button>
      )}
    </div>
  );
}

export default function MissionsPopup({ onClose }: MissionsPopupProps) {
  const queryClient = useQueryClient();
  const [adLoading, setAdLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const timeTrackRef = useRef<NodeJS.Timeout | null>(null);

  const { data: status, isLoading } = useQuery<MissionStatus>({
    queryKey: ['/api/daily-missions/status'],
    refetchInterval: 15000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/daily-missions/status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, [queryClient]);

  const claimMutation = useMutation({
    mutationFn: (endpoint: string) =>
      apiRequest('POST', endpoint, {}).then(r => r.json()),
    onSuccess: (d) => {
      showNotification(d.message || 'Reward claimed!', 'success');
      invalidate();
    },
    onError: (e: any) => showNotification(e.message || 'Failed to claim', 'error'),
  });

  const trackTimeMutation = useMutation({
    mutationFn: (secs: number) =>
      apiRequest('POST', '/api/daily-missions/track-app-time', { seconds: secs }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-missions/status'] });
    },
  });

  useEffect(() => {
    if (!status?.appTime.claimed) {
      timeTrackRef.current = setInterval(() => {
        trackTimeMutation.mutate(30);
      }, 30000);
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
      } else {
        showNotification('Ad not available right now', 'error');
      }
    } catch {
      showNotification('Ad failed or was skipped', 'error');
    } finally {
      setAdLoading(false);
    }
  };

  const handleShareApp = async () => {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const res = await apiRequest('POST', '/api/share/prepare-message', {});
      const data = await res.json();
      const referralLink = data.referralLink || '';
      const shareText = 'Join me on Axionet Miner and earn AXN together!';
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`);
      }
      setTimeout(() => {
        claimMutation.mutate('/api/daily-missions/claim/share-app');
        setShareLoading(false);
      }, 2000);
    } catch {
      claimMutation.mutate('/api/daily-missions/claim/share-app');
      setShareLoading(false);
    }
  };

  const handleOpenLink = (url: string, claimEndpoint: string) => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
    setTimeout(() => {
      claimMutation.mutate(claimEndpoint);
    }, 3000);
  };

  const appTimePct = Math.min(100, Math.round(((status?.appTime.seconds ?? 0) / 600) * 100));
  const appTimeMins = Math.floor((status?.appTime.seconds ?? 0) / 60);

  const totalClaimed = status ? [
    status.login.claimed,
    status.announcement.claimed,
    status.watchAd.claimed,
    status.shareApp.claimed,
    status.appTime.claimed,
    status.community.claimed,
    ...(status.hasNewReferralToday ? [status.invite.claimed] : []),
  ].filter(Boolean).length : 0;

  const totalMissions = status ? (status.hasNewReferralToday ? 7 : 6) : 6;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center"
        style={{ padding: '0 12px' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-sm"
          initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          <div style={{
            background: 'linear-gradient(135deg,rgba(0,160,255,0.75) 0%,rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75) 100%)',
            clipPath: CUT_LG,
            padding: '1.5px',
            boxShadow: '0 0 40px rgba(0,120,255,0.35)',
          }}>
            <div style={{
              background: 'linear-gradient(180deg,rgba(5,16,44,0.99) 0%,rgba(3,9,26,0.99) 100%)',
              clipPath: CUT_LG,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Corner accents */}
              {[
                { top:'2px', left:'14px', width:'30px', height:'1.5px' },
                { top:'14px', left:'2px', width:'1.5px', height:'30px' },
                { top:'2px', right:'14px', width:'30px', height:'1.5px' },
                { top:'14px', right:'2px', width:'1.5px', height:'30px' },
              ].map((s, i) => (
                <div key={i} className="absolute pointer-events-none" style={{ ...s, background:'rgba(0,200,255,0.75)', zIndex:10 }} />
              ))}

              {/* Header */}
              <div style={{ padding: '16px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/nav-mission.png" alt="Missions" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: 0, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1 }}>MISSIONS</p>
                  <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: 12, margin: '2px 0 0' }}>Daily AXN Rewards</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0 }}>Resets in</p>
                  <p style={{ color: '#facc15', fontSize: 12, fontWeight: 700, margin: 0 }}>
                    {status ? formatReset(status.secsUntilReset) : '--'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ padding: '0 16px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Daily Progress</span>
                  <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{totalClaimed} / {totalMissions}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(totalClaimed / totalMissions) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', borderRadius: 2 }}
                  />
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(0,120,255,0.18)', margin: '0 16px' }} />

              {/* Missions list */}
              <div style={{ padding: '10px 16px', maxHeight: '55vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <Loader2 style={{ width: 24, height: 24, color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>✅ Daily Missions</p>

                    <MissionRow
                      emoji="🔐"
                      title="Daily Login"
                      reward="+2 AXN"
                      claimed={status?.login.claimed ?? false}
                      actionLabel="Claim"
                      actionColor="rgba(59,130,246,0.8)"
                      loading={claimMutation.isPending && claimMutation.variables === '/api/daily-missions/claim/login'}
                      onAction={() => claimMutation.mutate('/api/daily-missions/claim/login')}
                    />

                    <MissionRow
                      emoji="📣"
                      title="Check Announcements"
                      reward="+1 AXN"
                      claimed={status?.announcement.claimed ?? false}
                      actionLabel="Open"
                      actionColor="rgba(99,102,241,0.8)"
                      loading={claimMutation.isPending && claimMutation.variables === '/api/daily-missions/claim/announcement'}
                      onAction={() => handleOpenLink('https://t.me/LightningSatoshi', '/api/daily-missions/claim/announcement')}
                    />

                    <MissionRow
                      emoji="🎬"
                      title="Watch 1 Ad"
                      reward="+3 AXN"
                      claimed={status?.watchAd.claimed ?? false}
                      actionLabel="Watch"
                      actionColor="rgba(245,158,11,0.8)"
                      loading={adLoading}
                      onAction={handleWatchAd}
                    />

                    <MissionRow
                      emoji="🔗"
                      title="Share the App"
                      reward="+5 AXN"
                      claimed={status?.shareApp.claimed ?? false}
                      actionLabel="Share"
                      actionColor="rgba(16,185,129,0.8)"
                      loading={shareLoading}
                      onAction={handleShareApp}
                    />

                    {/* App time mission with progress */}
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(59,130,246,0.14)',
                      clipPath: CUT_SM,
                      padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>⏱️</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0, lineHeight: 1.2 }}>Use App for 10 Minutes</p>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '2px 0 2px', lineHeight: 1 }}>
                            {appTimeMins} / 10 Minutes Completed
                          </p>
                          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                            <motion.div
                              animate={{ width: `${appTimePct}%` }}
                              transition={{ duration: 0.4 }}
                              style={{ height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 2 }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <AXNIcon size={10} />
                            <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>+6 AXN</span>
                          </div>
                        </div>
                        {status?.appTime.claimed ? (
                          <div style={{ width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', clipPath: CUT_SM, flexShrink: 0 }}>
                            <Check style={{ width: 14, height: 14, color: '#60a5fa' }} />
                          </div>
                        ) : (
                          <button
                            onClick={() => claimMutation.mutate('/api/daily-missions/claim/app-time')}
                            disabled={(status?.appTime.seconds ?? 0) < 600 || claimMutation.isPending}
                            style={{
                              width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: (status?.appTime.seconds ?? 0) >= 600 ? 'linear-gradient(135deg,rgba(0,120,255,0.9),rgba(0,80,200,0.85))' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${(status?.appTime.seconds ?? 0) >= 600 ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.09)'}`,
                              clipPath: CUT_SM, flexShrink: 0, cursor: (status?.appTime.seconds ?? 0) < 600 ? 'not-allowed' : 'pointer',
                              fontSize: 11, fontWeight: 700, color: (status?.appTime.seconds ?? 0) >= 600 ? '#fff' : 'rgba(255,255,255,0.3)',
                            }}
                          >
                            Claim
                          </button>
                        )}
                      </div>
                    </div>

                    <MissionRow
                      emoji="💬"
                      title="Join Community Chat"
                      reward="+2 AXN"
                      claimed={status?.community.claimed ?? false}
                      actionLabel="Join"
                      actionColor="rgba(6,182,212,0.8)"
                      loading={claimMutation.isPending && claimMutation.variables === '/api/daily-missions/claim/community'}
                      onAction={() => handleOpenLink('https://t.me/Axionetchat', '/api/daily-missions/claim/community')}
                    />

                    {status?.invite.available && (
                      <MissionRow
                        emoji="👥"
                        title="Invite a Friend"
                        reward="+50 AXN"
                        claimed={status?.invite.claimed ?? false}
                        actionLabel="Claim"
                        actionColor="rgba(236,72,153,0.8)"
                        subtext="New referral joined today!"
                        loading={claimMutation.isPending && claimMutation.variables === '/api/daily-missions/claim/invite'}
                        onAction={() => claimMutation.mutate('/api/daily-missions/claim/invite')}
                      />
                    )}

                    {/* Bonus mission */}
                    <div style={{ height: 1, background: 'rgba(0,120,255,0.18)', margin: '4px 0' }} />
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px' }}>🏆 Bonus Mission</p>

                    <div style={{
                      background: status?.bonus.available ? 'rgba(250,204,21,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${status?.bonus.available ? 'rgba(250,204,21,0.3)' : 'rgba(59,130,246,0.10)'}`,
                      clipPath: CUT_SM, padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>🔥</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>Complete All Daily Missions</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '2px 0 0' }}>
                          {status?.bonus.available ? 'All missions complete! Claim your bonus!' : `${totalClaimed}/${totalMissions} missions done`}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <AXNIcon size={10} />
                          <span style={{ color: '#facc15', fontSize: 11, fontWeight: 700 }}>+10 AXN</span>
                        </div>
                      </div>
                      {status?.bonus.claimed ? (
                        <div style={{ width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.35)', clipPath: CUT_SM, flexShrink: 0 }}>
                          <Check style={{ width: 14, height: 14, color: '#60a5fa' }} />
                        </div>
                      ) : (
                        <button
                          onClick={() => claimMutation.mutate('/api/daily-missions/claim/bonus')}
                          disabled={!status?.bonus.available || claimMutation.isPending}
                          style={{
                            width: 72, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: status?.bonus.available ? 'linear-gradient(135deg,rgba(0,120,255,0.9),rgba(0,80,200,0.85))' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${status?.bonus.available ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.09)'}`,
                            clipPath: CUT_SM, flexShrink: 0, cursor: !status?.bonus.available ? 'not-allowed' : 'pointer',
                            fontSize: 11, fontWeight: 700, color: status?.bonus.available ? '#fff' : 'rgba(255,255,255,0.3)',
                          }}
                        >
                          Claim
                        </button>
                      )}
                    </div>

                    <div style={{ height: 8 }} />
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
