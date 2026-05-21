import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { AXNIcon } from "@/components/AXNIcon";
import { RiSettings3Fill, RiCoupon3Fill, RiArrowUpCircleFill } from "react-icons/ri";

interface HeaderProps {
  onMenuOpen?: () => void;
  onInviteOpen?: () => void;
  onWithdrawOpen?: () => void;
  onSettingsOpen?: () => void;
  onTransactionsOpen?: () => void;
  onPromoOpen?: () => void;
  onShareOpen?: () => void;
}

const Header = forwardRef<HTMLDivElement, HeaderProps>(
  ({ onMenuOpen, onWithdrawOpen, onSettingsOpen, onPromoOpen }, ref) => {
    const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], retry: false });

    const axnBalance = Math.floor(parseFloat((user as any)?.balance || "0"));
    const usdValue = (axnBalance * 0.001).toFixed(2);
    const keyBalance = (user as any)?.keyBalance ?? (user as any)?.key_balance ?? 0;
    const firstName: string = user?.firstName || user?.username || "You";
    const profileImageUrl: string | null =
      user?.profileImageUrl ||
      (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ||
      null;
    const initials = firstName.slice(0, 2).toUpperCase();

    return (
      <div
        ref={ref}
        className="fixed top-0 left-0 right-0 z-40"
        style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}
      >
        <div
          className="mx-3"
          style={{
            background: "linear-gradient(140deg, #1228e0 0%, #2a48ff 30%, #5530d5 65%, #7820e0 100%)",
            borderRadius: 26,
            padding: "14px 14px 14px",
            boxShadow: "0 8px 40px rgba(60,20,220,0.55), 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {/* Row 1: profile + name | settings */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <button
                onClick={onMenuOpen}
                className="active:scale-95 transition-transform flex-shrink-0"
                style={{
                  width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>{initials}</span>
                )}
              </button>
              <div>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" }}>
                  Welcome back
                </p>
                <p style={{ color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: "0.01em", lineHeight: 1.2 }}>
                  {firstName}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Key balance pill */}
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(255,215,0,0.15)",
                border: "1px solid rgba(255,215,0,0.35)",
                borderRadius: 50, padding: "5px 10px",
              }}>
                <span style={{ fontSize: 13 }}>🔑</span>
                <span style={{ color: "#FFD700", fontSize: 12, fontWeight: 800 }}>{keyBalance}</span>
              </div>

              {/* Settings */}
              <button
                onClick={onSettingsOpen}
                className="active:scale-95 transition-transform"
                style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <RiSettings3Fill size={16} color="#fff" />
              </button>
            </div>
          </div>

          {/* Row 2: AXN icon + big amount | ≈USD value + withdraw icon */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AXNIcon size={30} />
              <span
                style={{
                  color: "#fff",
                  fontSize: 38,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  textShadow: "0 2px 16px rgba(0,0,0,0.25)",
                }}
              >
                {axnBalance.toLocaleString()}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                ≈${usdValue} USD
              </span>
              <button
                onClick={onWithdrawOpen}
                className="active:scale-95 transition-transform"
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                <RiArrowUpCircleFill size={20} color="#fff" />
              </button>
            </div>
          </div>

          {/* Row 3: Withdraw (left) | Promo Code (right) */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onWithdrawOpen}
              className="active:scale-95 transition-transform"
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "rgba(255,255,255,0.13)",
                borderRadius: 50, padding: "9px 14px",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <RiArrowUpCircleFill size={14} color="rgba(255,255,255,0.9)" />
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700 }}>
                Withdraw
              </span>
            </button>

            <button
              onClick={onPromoOpen}
              className="active:scale-95 transition-transform"
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "rgba(255,255,255,0.13)",
                borderRadius: 50, padding: "9px 14px",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <RiCoupon3Fill size={14} color="rgba(255,255,255,0.9)" />
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700 }}>
                Promo Code
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

Header.displayName = "Header";
export default Header;
