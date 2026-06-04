import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useTonConnectUI, useTonAddress, TonConnectButton } from "@tonconnect/ui-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const TREASURY = 'UQDeroBz4zvOntJ4xuMdiwFtNddMhJ4cGxghF9B7fYz50q8b';
const MIN_AXN = 1000;
const FEE_NANO = '30000000';

const OPEN_UTC_MINS = 16 * 60 + 30;
const CLOSE_UTC_MINS = 18 * 60 + 30;

function isWithdrawOpen() {
  const now = new Date();
  const t = now.getUTCHours() * 60 + now.getUTCMinutes();
  return t >= OPEN_UTC_MINS && t < CLOSE_UTC_MINS;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: 'spin' | 'check' | 'fail' | 'clock' }> = {
  pending_payment: { label: 'Waiting for TON payment', color: '#f59e0b', icon: 'clock' },
  payment_confirmed: { label: 'Payment confirmed, sending AXN', color: '#3b82f6', icon: 'spin' },
  axn_sent: { label: 'AXN dispatched', color: '#3b82f6', icon: 'spin' },
  completed: { label: 'Withdrawal complete', color: '#4ade80', icon: 'check' },
  failed: { label: 'Failed — contact support', color: '#f87171', icon: 'fail' },
  expired: { label: 'Expired — balance refunded', color: '#f87171', icon: 'fail' },
};

interface Props { onClose: () => void; userBalance: number; isAdmin?: boolean; }

export default function WithdrawPopup({ onClose, userBalance, isAdmin = false }: Props) {
  const [tonConnectUI] = useTonConnectUI();
  const connectedAddress = useTonAddress();

  const [amount, setAmount] = useState('');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState('pending_payment');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [step, setStep] = useState<'input' | 'paying' | 'tracking'>('input');
  const [countdown, setCountdown] = useState('');
  const queryClient = useQueryClient();

  const shortAddr = connectedAddress
    ? `${connectedAddress.slice(0, 6)}…${connectedAddress.slice(-4)}`
    : '';

  useEffect(() => {
    if (!expiresAt || step !== 'tracking') return;
    const iv = setInterval(() => {
      const diff = Math.max(0, expiresAt.getTime() - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`);
      if (diff === 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, step]);

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
    if (['completed', 'failed', 'expired'].includes(claimStatus)) return;
    const iv = setInterval(() => pollStatus(claimId), 5000);
    return () => clearInterval(iv);
  }, [step, claimId, claimStatus, pollStatus]);

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!connectedAddress) throw new Error('Connect your TON wallet first');
      if (!amt || amt < MIN_AXN) throw new Error(`Minimum ${MIN_AXN.toLocaleString()} AXN`);
      if (amt > userBalance) throw new Error('Insufficient balance');
      if (!isAdmin && !isWithdrawOpen()) throw new Error('Withdraw is locked. Opens at 10:00 PM IST (4:30 PM UTC)');
      const res = await apiRequest('POST', '/api/ton-withdraw/initiate', { walletAddress: connectedAddress, axnAmount: amt });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed');
      return data;
    },
    onSuccess: async (data) => {
      setClaimId(data.claimId);
      setExpiresAt(new Date(data.expiresAt));
      setStep('paying');
      try {
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 1800,
          messages: [{ address: TREASURY, amount: data.feeNano || FEE_NANO }],
        });
        setStep('tracking');
        setClaimStatus('pending_payment');
      } catch {
        // User cancelled TON payment — cancel the withdrawal and refund balance
        try {
          await apiRequest('POST', `/api/ton-withdraw/cancel/${data.claimId}`, {});
        } catch {}
        showNotification('Payment cancelled — your balance has been refunded', 'info');
        setStep('input');
        setClaimId(null);
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      }
    },
    onError: (e: any) => {
      let msg = 'Withdrawal failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch { msg = e.message || msg; }
      showNotification(msg, 'error');
    },
  });

  const amtNum = parseFloat(amount) || 0;
  const isProcessing = initiateMutation.isPending || step === 'paying';
  const isDone = ['completed', 'failed', 'expired'].includes(claimStatus);
  const windowOpen = isAdmin || isWithdrawOpen();

  const canSubmit = !!connectedAddress && amtNum >= MIN_AXN && amtNum <= userBalance && windowOpen && !isProcessing;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <style>{`
        @keyframes wd-spin { to { transform: rotate(360deg); } }
        @keyframes wd-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />

      <div
        style={{
          position: 'relative', width: '100%',
          background: 'linear-gradient(160deg, #0d0d0f, #111118)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '28px 28px 0 0',
          padding: '28px 20px',
          paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
          zIndex: 901, overflow: 'hidden',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #2563eb, #3b82f6, #2563eb, transparent)' }} />

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v14M5 9l7 7 7-7"/><path d="M3 20h18"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 900 }}>Withdraw AXN</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
              {windowOpen ? 'Window open now' : 'Opens 10:00 PM IST · 4:30 PM UTC'}
            </div>
          </div>
        </div>

        {/* ── TRACKING VIEW ── */}
        {step === 'tracking' && claimId && (
          <TrackingView
            claimStatus={claimStatus}
            claimId={claimId}
            axnAmount={amtNum}
            countdown={countdown}
            isDone={isDone}
            onClose={onClose}
          />
        )}

        {/* ── INPUT VIEW ── */}
        {step !== 'tracking' && (
          <>
            {/* Info rows */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '4px 0', marginBottom: 18 }}>
              {[
                { label: 'Your balance', val: `${Math.floor(userBalance).toLocaleString()} AXN` },
                { label: 'Minimum', val: `${MIN_AXN.toLocaleString()} AXN` },
                { label: 'Network fee', val: '0.03 TON (to admin wallet)' },
                { label: 'Window', val: isAdmin ? 'Always open (admin)' : windowOpen ? 'Open now' : '10 PM – 12 AM IST' },
              ].map((r, i, arr) => (
                <div key={r.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{r.label}</span>
                    <span style={{ color: i === 3 && windowOpen ? '#4ade80' : i === 3 ? '#f59e0b' : '#fff', fontSize: 13, fontWeight: 700 }}>{r.val}</span>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
                </div>
              ))}
            </div>

            {/* TON Wallet */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                TON Wallet
              </div>
              {connectedAddress ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)',
                  borderRadius: 12, padding: '11px 14px',
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#d1fae5' }}>{shortAddr}</span>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600, padding: 0 }}
                    onClick={() => tonConnectUI.disconnect()}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <TonConnectButton />
                    <div
                      style={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 10 }}
                      onClick={() => tonConnectUI.openModal()}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</div>
                <button
                  onClick={() => setAmount(Math.floor(userBalance).toString())}
                  style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Min ${MIN_AXN.toLocaleString()} AXN`}
                disabled={isProcessing}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: 15, color: '#fff',
                  background: 'rgba(255,255,255,0.04)', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {amtNum > 0 && amtNum < MIN_AXN && (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 5 }}>
                  Minimum {MIN_AXN.toLocaleString()} AXN required
                </div>
              )}
            </div>

            {/* Summary */}
            {amtNum >= MIN_AXN && connectedAddress && (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '4px 0', marginBottom: 18, animation: 'wd-fade 0.2s ease' }}>
                {[
                  { label: 'You receive', val: `${amtNum.toFixed(0)} AXN`, hi: true },
                  { label: 'Fee', val: '0.03 TON' },
                  { label: 'Destination', val: shortAddr },
                ].map((r, i, arr) => (
                  <div key={r.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{r.label}</span>
                      <span style={{ color: r.hi ? '#4ade80' : '#fff', fontSize: 13, fontWeight: 700 }}>{r.val}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={() => initiateMutation.mutate()}
              disabled={!canSubmit}
              className="active:scale-95 transition-transform"
              style={{
                width: '100%', padding: '14px 0', border: 'none', borderRadius: 14,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit
                  ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                  : 'rgba(255,255,255,0.06)',
                color: canSubmit ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 15, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: canSubmit ? '0 4px 20px rgba(37,99,235,0.4)' : 'none',
              } as React.CSSProperties}
            >
              {isProcessing && <Loader2 size={15} style={{ animation: 'wd-spin 1s linear infinite' }} />}
              {!connectedAddress
                ? 'Connect wallet above'
                : !windowOpen
                ? 'Locked — opens 10:00 PM IST'
                : amtNum < MIN_AXN
                ? `Min ${MIN_AXN.toLocaleString()} AXN`
                : step === 'paying'
                ? 'Opening wallet…'
                : isProcessing
                ? 'Processing…'
                : 'Confirm Withdrawal'
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TrackingView({ claimStatus, claimId, axnAmount, countdown, isDone, onClose }: {
  claimStatus: string; claimId: string; axnAmount: number;
  countdown: string; isDone: boolean; onClose: () => void;
}) {
  const info = STATUS_LABELS[claimStatus] || STATUS_LABELS.pending_payment;
  const steps = [
    { key: 'pending_payment', label: 'TON fee payment' },
    { key: 'payment_confirmed', label: 'Payment verified on-chain' },
    { key: 'axn_sent', label: 'AXN dispatched' },
    { key: 'completed', label: 'Delivered to wallet' },
  ];
  const order = ['pending_payment', 'payment_confirmed', 'axn_sent', 'completed'];
  const currentIdx = order.indexOf(claimStatus);

  return (
    <div style={{ animation: 'wd-fade 0.3s ease' }}>
      {/* Status icon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: `${info.color}14`, border: `2px solid ${info.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        }}>
          {info.icon === 'spin' && <Loader2 size={26} style={{ color: info.color, animation: 'wd-spin 1s linear infinite' }} />}
          {info.icon === 'check' && <CheckCircle2 size={26} style={{ color: info.color }} />}
          {info.icon === 'fail' && <XCircle size={26} style={{ color: info.color }} />}
          {info.icon === 'clock' && <Clock size={26} style={{ color: info.color }} />}
        </div>
        <div style={{ color: info.color, fontSize: 15, fontWeight: 800, textAlign: 'center' }}>{info.label}</div>
        {claimStatus === 'pending_payment' && countdown && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Expires in {countdown}</div>
        )}
        {claimStatus === 'completed' && (
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4 }}>{axnAmount.toFixed(0)} AXN sent</div>
        )}
      </div>

      {/* Steps */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '4px 0', marginBottom: 18 }}>
        {steps.map((s, idx) => {
          const done = currentIdx > idx || claimStatus === 'completed';
          const active = currentIdx === idx && !isDone;
          const failed = (claimStatus === 'failed' || claimStatus === 'expired') && idx === Math.max(0, currentIdx);
          return (
            <div key={s.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: failed ? 'rgba(248,113,113,0.12)' : done ? 'rgba(74,222,128,0.12)' : active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${failed ? '#f87171' : done ? '#4ade80' : active ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: failed ? '#f87171' : done ? '#4ade80' : active ? '#3b82f6' : 'rgba(255,255,255,0.25)',
                }}>
                  {done ? '✓' : failed ? '✕' : idx + 1}
                </div>
                <span style={{ flex: 1, color: done ? '#d1fae5' : active ? '#93c5fd' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: (done || active) ? 700 : 400 }}>
                  {s.label}
                </span>
                {active && !failed && <Loader2 size={12} style={{ color: '#3b82f6', animation: 'wd-spin 1s linear infinite' }} />}
              </div>
              {idx < steps.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
            </div>
          );
        })}
      </div>

      {/* Request ID */}
      <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.18)', marginBottom: 18, wordBreak: 'break-all', padding: '0 2px' }}>
        ID: {claimId}
      </div>

      {isDone && (
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
            cursor: 'pointer',
            background: claimStatus === 'completed' ? 'linear-gradient(135deg, #14532d, #16a34a)' : 'rgba(255,255,255,0.08)',
            color: '#fff', fontSize: 14, fontWeight: 800,
          }}
        >
          {claimStatus === 'completed' ? 'Done' : 'Close'}
        </button>
      )}
    </div>
  );
}
