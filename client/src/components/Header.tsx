import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";

interface HeaderProps {
  onMenuOpen?: () => void;
  onInviteOpen?: () => void;
  onWithdrawOpen?: () => void;
  onSettingsOpen?: () => void;
  onTransactionsOpen?: () => void;
  onPromoOpen?: () => void;
  onShareOpen?: () => void;
}

function statusColor(status: string) {
  if (status === 'approved' || status === 'completed' || status === 'paid') return '#4ade80';
  if (status === 'rejected') return '#f87171';
  return '#fbbf24';
}

const Header = forwardRef<HTMLDivElement, HeaderProps>(
  ({ onMenuOpen }, ref) => {
    const [notifOpen, setNotifOpen] = useState(false);

    const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], retry: false });
    const { data: withdrawalsData } = useQuery<any>({
      queryKey: ['/api/withdrawals'],
      staleTime: 30000,
      enabled: notifOpen,
    });

    const firstName: string = user?.firstName || user?.username || "Miner";
    const username: string = user?.username ? `@${user.username}` : "";
    const profileImageUrl: string | null =
      user?.profileImageUrl ||
      (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ||
      null;
    const initials = firstName.slice(0, 2).toUpperCase();

    const withdrawals: any[] = withdrawalsData?.withdrawals ?? [];
    const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

    return (
      <div ref={ref} className="fixed top-0 left-0 right-0 z-40" style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}>
        <div style={{
          margin: "0 12px 8px",
          borderRadius: 20,
          background: "rgba(0,0,0,0.97)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}>

          {/* Left — Profile photo */}
          <button
            onClick={onMenuOpen}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              overflow: "hidden", display: "flex",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              background: "rgba(255,255,255,0.06)",
              border: "1.5px solid rgba(255,255,255,0.1)",
            }}
            className="active:scale-90 transition-transform"
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={firstName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    const span = document.createElement("span");
                    span.style.cssText = "color:#fff;font-size:13px;font-weight:900;";
                    span.textContent = initials;
                    parent.appendChild(span);
                  }
                }}
              />
            ) : (
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>{initials}</span>
            )}
          </button>

          {/* Center — AXIONET branding */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
              <span style={{ color: '#3b82f6' }}>A</span>
              <span style={{ color: '#fff' }}>XIONET</span>
            </span>
          </div>

          {/* Right — Notification bell */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setNotifOpen(v => !v)}
              className="active:scale-90 transition-transform"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: notifOpen ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.06)',
                border: notifOpen ? '1.5px solid rgba(59,130,246,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: 'pointer',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke={notifOpen ? '#60a5fa' : 'rgba(255,255,255,0.65)'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {pendingCount > 0 && (
                <div style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 15, height: 15, borderRadius: '50%',
                  background: '#ef4444', border: '2px solid #000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 900, color: '#fff',
                }}>
                  {pendingCount}
                </div>
              )}
            </button>

            {notifOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setNotifOpen(false)} />
                <div style={{
                  position: 'fixed',
                  top: 'calc(max(env(safe-area-inset-top), 10px) + 62px)',
                  right: 12, width: 290, zIndex: 999,
                  background: '#0d0d0f',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Withdrawal History</span>
                    <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {withdrawals.length === 0 ? (
                      <div style={{ padding: '28px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>
                        No withdrawals yet
                      </div>
                    ) : (
                      withdrawals.map((w: any) => {
                        const sc = statusColor(w.status);
                        const date = new Date(w.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                        return (
                          <div key={w.id} style={{
                            padding: '11px 16px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}>
                            <div>
                              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                                {parseFloat(w.amount).toLocaleString()} AXN
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, marginTop: 2 }}>{date}</div>
                            </div>
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 50,
                              background: `${sc}18`, border: `1px solid ${sc}40`, color: sc,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>{w.status}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    );
  }
);

Header.displayName = "Header";
export default Header;
