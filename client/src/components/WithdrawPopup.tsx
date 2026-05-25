import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

const animStyles = `
@keyframes wd-popup-in {
  from { opacity: 0; transform: scale(0.93) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes wd-glow-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
`;

const POOL_AXN = 8292;
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
  const [method, setMethod] = useState<'TON' | 'USDT'>('TON');
  const queryClient = useQueryClient();

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/withdrawals', {
        address: address.trim(),
        amount: amount,
        method: method === 'TON' ? 'TON' : 'USDT-BSC',
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification('Withdrawal submitted for review!', 'success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onClose();
    },
    onError: (e: any) => {
      let msg = 'Withdrawal failed';
      try { const p = JSON.parse(e.message); if (p.message) msg = p.message; } catch { msg = e.message || msg; }
      showNotification(msg, 'error');
    },
  });

  const handleWithdraw = () => {
    if (!address.trim()) { showNotification('Enter wallet address', 'error'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_AXN) { showNotification(`Minimum ${MIN_AXN} AXN required`, 'error'); return; }
    if (amt > userBalance) { showNotification('Insufficient balance', 'error'); return; }
    withdrawMutation.mutate();
  };

  const net = Math.max(0, parseFloat(amount || '0') - FEE_AXN);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <style>{animStyles}</style>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'linear-gradient(160deg, #0d0d0f 0%, #111118 100%)',
        border: '1px solid rgba(37,99,235,0.25)',
        borderRadius: '28px 28px 0 0', padding: '28px 20px 40px',
        animation: 'wd-popup-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 -8px 60px rgba(37,99,235,0.2), 0 0 0 1px rgba(255,255,255,0.03)',
        position: 'relative', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Top blue glow bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #2563eb, #2563eb, transparent)',
          animation: 'wd-glow-pulse 2s ease-in-out infinite',
        }} />

        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 24px' }} />

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(124,58,237,0.2))',
              border: '1px solid rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(37,99,235,0.25)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, letterSpacing: '-0.3px' }}>Withdraw AXN</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Send to external wallet</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          {[
            { label: 'Available Pool', value: `${POOL_AXN.toLocaleString()} AXN`, color: '#60a5fa' },
            { label: 'Min. Withdrawal', value: `${MIN_AXN.toLocaleString()} AXN`, color: '#a78bfa' },
            { label: 'Fee', value: `${FEE_AXN.toLocaleString()} AXN`, color: '#f87171' },
          ].map(c => (
            <div key={c.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '10px 8px', textAlign: 'center',
            }}>
              <div style={{ color: c.color, fontSize: 12, fontWeight: 800 }}>{c.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Method toggle */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 14,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 50, padding: 4,
        }}>
          {(['TON', 'USDT'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: 50,
              background: method === m ? 'linear-gradient(135deg, #2563eb, #2563eb)' : 'transparent',
              color: method === m ? '#fff' : 'rgba(255,255,255,0.35)',
              fontSize: 12, fontWeight: method === m ? 800 : 600, cursor: 'pointer',
              boxShadow: method === m ? '0 2px 10px rgba(37,99,235,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>{m === 'TON' ? 'TON Network' : 'USDT (BEP-20)'}</button>
          ))}
        </div>

        {/* Wallet address */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {method === 'TON' ? 'TON Wallet Address' : 'USDT Address (BEP-20)'}
          </div>
          <input
            type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder={method === 'TON' ? 'Enter TON wallet address' : '0x... BSC address'}
            style={{
              width: '100%', height: 46,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(37,99,235,0.2)',
              color: '#fff', fontSize: 13, padding: '0 14px', outline: 'none',
              boxSizing: 'border-box', borderRadius: 12,
              fontFamily: method === 'USDT' ? 'monospace' : 'inherit',
            }}
          />
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (AXN)</div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>Balance: {userBalance.toLocaleString()}</span>
          </div>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={`Min ${MIN_AXN.toLocaleString()} AXN`}
            style={{
              width: '100%', height: 46,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(37,99,235,0.2)',
              color: '#fff', fontSize: 13, padding: '0 14px', outline: 'none',
              boxSizing: 'border-box', borderRadius: 12,
            }}
          />
          {parseFloat(amount) > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 5 }}>
              You receive: <span style={{ color: '#4ade80', fontWeight: 700 }}>{net.toFixed(0)} AXN</span> (after {FEE_AXN} AXN fee)
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleWithdraw}
          disabled={withdrawMutation.isPending}
          className="active:scale-95 transition-transform"
          style={{
            width: '100%', padding: '14px 0', border: 'none', borderRadius: 50, cursor: 'pointer',
            background: 'linear-gradient(135deg, #2563eb, #2563eb)',
            color: '#fff', fontSize: 15, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 24px rgba(37,99,235,0.4)',
            opacity: withdrawMutation.isPending ? 0.7 : 1,
          }}
        >
          {withdrawMutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Confirm Withdrawal
        </button>
      </div>
    </div>
  );
}
