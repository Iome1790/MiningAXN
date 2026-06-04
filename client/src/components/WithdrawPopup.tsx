import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Clock, CheckCircle2, XCircle, Wallet, ArrowRight, Copy, ExternalLink } from "lucide-react";
import { useTonConnectUI, useTonAddress, TonConnectButton } from "@tonconnect/ui-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const POPUP_STYLES = `
@keyframes wd-glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
@keyframes wd-spin {
  to { transform: rotate(360deg); }
}
@keyframes wd-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const TREASURY = 'UQDeroBz4zvOntJ4xuMdiwFtNddMhJ4cGxghF9B7fYz50q8b';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: 'spin' | 'check' | 'fail' | 'clock' }> = {
  pending_payment: { label: 'Waiting for TON payment…', color: '#f59e0b', icon: 'clock' },
  payment_confirmed: { label: 'Payment received! Sending AXN…', color: '#3b82f6', icon: 'spin' },
  axn_sent: { label: 'AXN is on its way…', color: '#3b82f6', icon: 'spin' },
  completed: { label: 'Withdrawal complete! 🎉', color: '#4ade80', icon: 'check' },
  failed: { label: 'Sending failed — contact support', color: '#f87171', icon: 'fail' },
  expired: { label: 'Expired — balance refunded', color: '#f87171', icon: 'fail' },
};

interface Props {
  onClose: () => void;
  userBalance: number;
}

export default function WithdrawPopup({ onClose, userBalance }: Props) {
  const [tonConnectUI] = useTonConnectUI();
  const connectedAddress = useTonAddress();

  const [amount, setAmount] = useState('');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string>('pending_payment');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [step, setStep] = useState<'input' | 'paying' | 'tracking'>('input');
  const [countdown, setCountdown] = useState('');
  const queryClient = useQueryClient();

  // Truncate address for display
  const shortAddr = connectedAddress
    ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
    : '';

  // Countdown timer
  useEffect(() => {
    if (!expiresAt || step !== 'tracking') return;
    const interval = setInterval(() => {
      const diff = Math.max(0, expiresAt.getTime() - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, step]);

  // Poll claim status every 5 seconds
  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await apiRequest('GET', `/api/ton-withdraw/status/${id}`);
      const data = await res.json();
      const status = data.claim?.status;
      if (status) {
        setClaimStatus(status);
        if (status === 'completed') {
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        }
      }
    } catch {}
  }, [queryClient]);

  useEffect(() => {
    if (step !== 'tracking' || !claimId) return;
    if (claimStatus === 'completed' || claimStatus === 'failed' || claimStatus === 'expired') return;
    const interval = setInterval(() => pollStatus(claimId), 5000);
    return () => clearInterval(interval);
  }, [step, claimId, claimStatus, pollStatus]);

  // Step 1: Initiate withdrawal on backend
  const initiateMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!connectedAddress) throw new Error('Connect your TON wallet first');
      if (!amt || amt < 20) throw new Error('Minimum withdrawal is 20 AXN');
      if (amt > userBalance) throw new Error('Insufficient AXN balance');
      const res = await apiRequest('POST', '/api/ton-withdraw/initiate', {
        walletAddress: connectedAddress,
        axnAmount: amt,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to initiate withdrawal');
      return data;
    },
    onSuccess: async (data) => {
      setClaimId(data.claimId);
      setExpiresAt(new Date(data.expiresAt));
      setStep('paying');

      // Trigger TON Connect payment immediately
      try {
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 1800, // 30 min
          messages: [
            {
              address: TREASURY,
              amount: data.feeNano, // '30000000' = 0.03 TON
            },
          ],
        });
        // Payment sent — start tracking
        setStep('tracking');
        setClaimStatus('pending_payment');
      } catch (e: any) {
        // User cancelled payment or error
        const msg = e?.message || 'Payment cancelled';
        showNotification(`Payment cancelled — your balance was refunded automatically.`, 'error');
        // Mark as expired so the poller will refund
        await apiRequest('GET', `/api/ton-withdraw/status/${data.claimId}`).catch(() => {});
        setStep('input');
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      }
    },
    onError: (e: any) => {
      let msg = 'Withdrawal failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch { msg = e.message || msg; }
      showNotification(msg, 'error');
    },
  });

  const handleWithdraw = () => {
    if (!connectedAddress) { showNotification('Connect your TON wallet first', 'error'); return; }
    initiateMutation.mutate();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    border: '1.5px solid rgba(37,99,235,0.25)',
    fontSize: 15, color: '#fff',
    background: 'rgba(255,255,255,0.04)', outline: 'none',
    boxSizing: 'border-box',
  };

  const isProcessing = initiateMutation.isPending || step === 'paying';
  const isDone = claimStatus === 'completed' || claimStatus === 'failed' || claimStatus === 'expired';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <style>{POPUP_STYLES}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0',
        padding: '24px 20px',
        paddingBottom: 'max(52px, calc(env(safe-area-inset-bottom, 0px) + 28px))',
        zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
        maxHeight: '92vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        {/* Animated top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)',
          animation: 'wd-glow-pulse 2s ease-in-out infinite',
        }} />

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 22px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Withdraw AXN</span>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.06)', borderRadius: 20,
            padding: '4px 10px', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Auto · No Approval
          </div>
        </div>

        {/* ─── STEP: TRACKING STATUS ─── */}
        {step === 'tracking' && claimId && (
          <TrackingView
            claimStatus={claimStatus}
            claimId={claimId}
            axnAmount={parseFloat(amount)}
            countdown={countdown}
            isDone={isDone}
            onClose={onClose}
          />
        )}

        {/* ─── STEP: INPUT ─── */}
        {step !== 'tracking' && (
          <>
            {/* Fee info banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 14, padding: '12px 14px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 20 }}>⚡</div>
              <div>
                <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 800, marginBottom: 2 }}>Instant Withdrawal</div>
                <div style={{ color: 'rgba(147,197,253,0.6)', fontSize: 11, lineHeight: 1.4 }}>
                  Pay <span style={{ color: '#fff', fontWeight: 700 }}>0.03 TON</span> gas fee → AXN sent automatically to your TON wallet
                </div>
              </div>
            </div>

            {/* TON Wallet Connect */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                TON Wallet
              </div>
              {connectedAddress ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
                  borderRadius: 14, padding: '11px 14px',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#d1fae5', wordBreak: 'break-all' }}>
                    {shortAddr}
                  </div>
                  <div style={{ cursor: 'pointer' }} onClick={() => {
                    if (navigator.clipboard) navigator.clipboard.writeText(connectedAddress);
                    showNotification('Address copied', 'success');
                  }}>
                    <Copy size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <TonConnectButton style={{ width: '100%' }} />
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Amount (AXN)
                </div>
                <button
                  onClick={() => setAmount(Math.floor(userBalance).toString())}
                  style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  MAX {Math.floor(userBalance).toLocaleString()}
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Min 20 AXN"
                style={inputStyle}
                disabled={isProcessing}
              />
              {parseFloat(amount) > 0 && (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>
                  You receive: <span style={{ color: '#4ade80', fontWeight: 700 }}>{parseFloat(amount || '0').toFixed(0)} AXN</span> · No AXN fee
                </div>
              )}
            </div>

            {/* Summary row */}
            {parseFloat(amount) >= 20 && connectedAddress && (
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14, padding: '12px 14px', marginBottom: 20,
                animation: 'wd-fade-in 0.25s ease',
              }}>
                <SummaryRow label="Receive" value={`${parseFloat(amount).toFixed(0)} AXN`} accent="#4ade80" />
                <SummaryRow label="TON Gas Fee" value="0.03 TON" accent="#f59e0b" />
                <SummaryRow label="To wallet" value={shortAddr} />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleWithdraw}
              disabled={isProcessing || !connectedAddress}
              className="active:scale-95 transition-transform"
              style={{
                width: '100%', padding: '14px 0', border: 'none', borderRadius: 50,
                cursor: (isProcessing || !connectedAddress) ? 'not-allowed' : 'pointer',
                background: !connectedAddress
                  ? 'rgba(255,255,255,0.06)'
                  : isProcessing
                  ? 'rgba(37,99,235,0.5)'
                  : 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)',
                color: !connectedAddress ? 'rgba(255,255,255,0.3)' : '#fff',
                fontSize: 15, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: (!connectedAddress || isProcessing) ? 'none' : '0 4px 24px rgba(37,99,235,0.5)',
                opacity: isProcessing ? 0.7 : 1,
              } as React.CSSProperties}
            >
              {isProcessing && <Loader2 size={16} style={{ animation: 'wd-spin 1s linear infinite' }} />}
              {!connectedAddress
                ? 'Connect TON Wallet First'
                : step === 'paying'
                ? 'Opening wallet…'
                : isProcessing
                ? 'Processing…'
                : 'Withdraw AXN'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>{label}</span>
      <span style={{ color: accent || '#fff', fontWeight: 700, fontSize: 13 }}>{value}</span>
    </div>
  );
}

function TrackingView({
  claimStatus, claimId, axnAmount, countdown, isDone, onClose,
}: {
  claimStatus: string; claimId: string; axnAmount: number;
  countdown: string; isDone: boolean; onClose: () => void;
}) {
  const info = STATUS_LABELS[claimStatus] || STATUS_LABELS.pending_payment;

  const steps = [
    { key: 'pending_payment', label: 'TON fee payment' },
    { key: 'payment_confirmed', label: 'Payment verified' },
    { key: 'axn_sent', label: 'AXN dispatched' },
    { key: 'completed', label: 'Delivered to wallet' },
  ];
  const statusOrder = ['pending_payment', 'payment_confirmed', 'axn_sent', 'completed'];
  const currentIdx = statusOrder.indexOf(claimStatus);

  return (
    <div style={{ animation: 'wd-fade-in 0.3s ease' }}>
      {/* Status icon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `${info.color}18`,
          border: `2px solid ${info.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          {info.icon === 'spin' && (
            <Loader2 size={28} style={{ color: info.color, animation: 'wd-spin 1s linear infinite' }} />
          )}
          {info.icon === 'check' && <CheckCircle2 size={28} style={{ color: info.color }} />}
          {info.icon === 'fail' && <XCircle size={28} style={{ color: info.color }} />}
          {info.icon === 'clock' && <Clock size={28} style={{ color: info.color }} />}
        </div>
        <div style={{ color: info.color, fontSize: 15, fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>
          {info.label}
        </div>
        {claimStatus === 'pending_payment' && countdown && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Expires in {countdown}
          </div>
        )}
        {claimStatus === 'completed' && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
            {axnAmount.toFixed(0)} AXN sent successfully
          </div>
        )}
      </div>

      {/* Progress steps */}
      <div style={{ marginBottom: 24 }}>
        {steps.map((s, idx) => {
          const done = currentIdx > idx || claimStatus === 'completed';
          const active = currentIdx === idx && !isDone;
          const failed = (claimStatus === 'failed' || claimStatus === 'expired') && idx === Math.max(0, currentIdx);
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: idx < steps.length - 1 ? 12 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: failed ? 'rgba(248,113,113,0.15)'
                  : done ? 'rgba(74,222,128,0.15)'
                  : active ? 'rgba(59,130,246,0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${failed ? '#f87171' : done ? '#4ade80' : active ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                color: failed ? '#f87171' : done ? '#4ade80' : active ? '#3b82f6' : 'rgba(255,255,255,0.3)',
              }}>
                {done ? '✓' : failed ? '✕' : idx + 1}
              </div>
              <div style={{ color: done ? '#d1fae5' : active ? '#93c5fd' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: done || active ? 700 : 400 }}>
                {s.label}
              </div>
              {active && !failed && (
                <Loader2 size={12} style={{ color: '#3b82f6', animation: 'wd-spin 1s linear infinite', marginLeft: 'auto' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Claim ID */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '8px 12px',
        marginBottom: 20, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)',
        wordBreak: 'break-all',
      }}>
        ID: {claimId}
      </div>

      {/* Pending payment instructions */}
      {claimStatus === 'pending_payment' && (
        <div style={{
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 14, padding: '12px 14px', marginBottom: 16,
          animation: 'wd-fade-in 0.3s ease',
        }}>
          <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>Waiting for payment</div>
          <div style={{ color: 'rgba(251,191,36,0.65)', fontSize: 11, lineHeight: 1.6 }}>
            Your wallet should have opened to sign the <b style={{ color: '#fbbf24' }}>0.03 TON</b> payment.
            If it didn't open, reopen the popup and try again.
          </div>
        </div>
      )}

      {/* Done button */}
      {(isDone) && (
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px 0', border: 'none', borderRadius: 50,
            cursor: 'pointer',
            background: claimStatus === 'completed'
              ? 'linear-gradient(135deg, #14532d, #16a34a)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff', fontSize: 15, fontWeight: 900,
          }}
        >
          {claimStatus === 'completed' ? '✓ Done' : 'Close'}
        </button>
      )}
    </div>
  );
}
