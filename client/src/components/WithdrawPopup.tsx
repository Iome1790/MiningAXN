import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Clock } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const POPUP_STYLES = `
@keyframes wd-glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
`;

const MIN_AXN = 500;
const FEE_AXN = 100;

interface Props {
  onClose: () => void;
  userBalance: number;
  connectedAddress?: string;
}

export default function WithdrawPopup({ onClose, userBalance, connectedAddress }: Props) {
  const [address, setAddress] = useState(connectedAddress || '');
  const [amount, setAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: withdrawalsData } = useQuery({
    queryKey: ['/api/withdrawals'],
    staleTime: 30000,
  });

  const hasPendingWithdrawal = (withdrawalsData as any)?.withdrawals?.some(
    (w: any) => w.status === 'pending'
  ) ?? false;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/withdrawals', {
        address: address.trim(),
        amount: amount,
        method: 'TON',
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification('Withdrawal submitted for review!', 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/withdrawals'] });
      onClose();
    },
    onError: (e: any) => {
      let msg = 'Withdrawal failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch { msg = e.message || msg; }
      showNotification(msg, 'error');
    },
  });

  const handleWithdraw = () => {
    if (hasPendingWithdrawal) return;
    if (!address.trim()) { showNotification('Enter wallet address', 'error'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_AXN) { showNotification(`Minimum ${MIN_AXN} AXN required`, 'error'); return; }
    if (amt > userBalance) { showNotification('Insufficient balance', 'error'); return; }
    withdrawMutation.mutate();
  };

  const net = Math.max(0, parseFloat(amount || '0') - FEE_AXN);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 14px', borderRadius: 14,
    border: '1.5px solid rgba(37,99,235,0.25)',
    fontSize: 15, color: '#fff',
    background: 'rgba(255,255,255,0.04)', outline: 'none',
    boxSizing: 'border-box',
  };

  const disabledInputStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900, display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <style>{POPUP_STYLES}</style>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'relative', width: '100%',
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '24px 20px 52px', zIndex: 901,
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Full-width animated blue glow bar */}
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
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Pending withdrawal banner */}
        {hasPendingWithdrawal && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 20,
          }}>
            <Clock size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 800, marginBottom: 2 }}>Pending Request</div>
              <div style={{ color: 'rgba(251,191,36,0.65)', fontSize: 11, lineHeight: 1.4 }}>
                You have a withdrawal pending approval. You can submit a new request once it is processed.
              </div>
            </div>
          </div>
        )}

        {/* Wallet address */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            TON Wallet Address
          </div>
          <input
            type="text" value={address}
            onChange={e => !hasPendingWithdrawal && setAddress(e.target.value)}
            placeholder="EQ... or UQ... TON address"
            readOnly={hasPendingWithdrawal}
            style={{ ...(hasPendingWithdrawal ? disabledInputStyle : inputStyle), fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (AXN)</div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>Balance: {userBalance.toLocaleString()}</span>
          </div>
          <input
            type="number" value={amount}
            onChange={e => !hasPendingWithdrawal && setAmount(e.target.value)}
            placeholder={`Min ${MIN_AXN.toLocaleString()} AXN`}
            readOnly={hasPendingWithdrawal}
            style={hasPendingWithdrawal ? disabledInputStyle : inputStyle}
          />
          {!hasPendingWithdrawal && parseFloat(amount) > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 6 }}>
              You receive: <span style={{ color: '#4ade80', fontWeight: 700 }}>{net.toFixed(0)} AXN</span> (after {FEE_AXN} AXN fee)
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleWithdraw}
          disabled={withdrawMutation.isPending || hasPendingWithdrawal}
          className="active:scale-95 transition-transform"
          style={{
            width: '100%', padding: '14px 0', border: 'none', borderRadius: 50,
            cursor: hasPendingWithdrawal ? 'not-allowed' : 'pointer',
            background: hasPendingWithdrawal
              ? 'rgba(255,255,255,0.06)'
              : 'linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)',
            color: hasPendingWithdrawal ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: 15, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: hasPendingWithdrawal ? 'none' : '0 4px 24px rgba(37,99,235,0.5)',
            opacity: withdrawMutation.isPending ? 0.7 : 1,
            border: hasPendingWithdrawal ? '1px solid rgba(255,255,255,0.08)' : 'none',
          } as React.CSSProperties}
        >
          {withdrawMutation.isPending && <Loader2 size={16} className="animate-spin" />}
          {hasPendingWithdrawal ? 'Awaiting Approval' : 'Confirm Withdrawal'}
        </button>
      </div>
    </div>
  );
}
