import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { AXNIcon } from "@/components/AXNIcon";
import { RiSettings3Fill, RiExchangeFill, RiCoupon3Fill, RiShareFill, RiArrowUpCircleFill } from "react-icons/ri";
import { BsLightningChargeFill } from "react-icons/bs";

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
  ({ onMenuOpen, onWithdrawOpen, onSettingsOpen, onTransactionsOpen, onPromoOpen, onShareOpen }, ref) => {
    const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], retry: false });
    const { data: machine } = useQuery<any>({ queryKey: ["/api/axn-mining/machine"], retry: false });

    const axnBalance = Math.floor(parseFloat((user as any)?.balance || "0"));
    const usdValue = (axnBalance * 0.001).toFixed(2);
    const energy = machine?.energy ?? 100;
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
        {/* Floating rounded card with horizontal margin */}
        <div
          className="mx-3"
          style={{
            background: "linear-gradient(140deg, #1228e0 0%, #2a48ff 30%, #5530d5 65%, #7820e0 100%)",
            borderRadius: 26,
            padding: "14px 14px 14px",
            boxShadow:
              "0 8px 40px rgba(60, 20, 220, 0.55), 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {/* Row 1: profile + app name | history + settings */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <button
                onClick={onMenuOpen}
                className="active:scale-95 transition-transform flex-shrink-0"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={firstName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
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

            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={onWithdrawOpen}
                className="active:scale-95 transition-transform"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RiArrowUpCircleFill size={16} color="#fff" />
              </button>
              <button
                onClick={onSettingsOpen}
                className="active:scale-95 transition-transform"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RiSettings3Fill size={16} color="#fff" />
              </button>
            </div>
          </div>

          {/* Row 2: Big balance */}
          <div style={{ marginBottom: 6, paddingLeft: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AXNIcon size={28} />
              <span
                style={{
                  color: "#fff",
                  fontSize: 36,
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  textShadow: "0 2px 16px rgba(0,0,0,0.25)",
                }}
              >
                {axnBalance.toLocaleString()}
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 4, marginLeft: 36 }}>
              ${usdValue} USD
            </p>
          </div>

          {/* Row 3: Energy */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 14, paddingLeft: 2 }}>
            <BsLightningChargeFill size={12} color="#facc15" />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700 }}>
              {energy}
            </span>
          </div>

          {/* Row 4: Transactions left | Promo Code + Share right */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>

            {/* Transactions — left */}
            <button
              onClick={onTransactionsOpen}
              className="active:scale-95 transition-transform"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.13)",
                borderRadius: 50,
                padding: "7px 14px",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <RiExchangeFill size={14} color="rgba(255,255,255,0.9)" />
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                Transactions
              </span>
            </button>

            {/* Promo Code + Share — right */}
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={onPromoOpen}
                className="active:scale-95 transition-transform"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.13)",
                  borderRadius: 50,
                  padding: "7px 13px",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <RiCoupon3Fill size={14} color="rgba(255,255,255,0.9)" />
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                  Promo Code
                </span>
              </button>
              <button
                onClick={onShareOpen}
                className="active:scale-95 transition-transform"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.13)",
                  borderRadius: 50,
                  padding: "7px 13px",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <RiShareFill size={14} color="rgba(255,255,255,0.9)" />
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                  Share
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }
);

Header.displayName = "Header";
export default Header;
