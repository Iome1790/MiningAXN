import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { AXNIcon } from "@/components/AXNIcon";

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
  ({ onMenuOpen, onInviteOpen, onWithdrawOpen }, ref) => {
    const { data: user } = useQuery<any>({
      queryKey: ["/api/auth/user"],
      retry: false,
    });

    const axnBalance = Math.floor(parseFloat((user as any)?.balance || "0"));
    const firstName: string = user?.firstName || user?.username || "Miner";
    const username: string = user?.username ? `@${user.username}` : "";

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
          style={{
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
          }}
        >
          {/* Left — menu + avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <button
              onClick={onMenuOpen}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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

            <div style={{ minWidth: 0 }}>
              <p style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {firstName}
              </p>
              {username && (
                <p style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                  fontWeight: 600,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {username}
                </p>
              )}
            </div>
          </div>

          {/* Center — AXN balance */}
          <button
            onClick={onWithdrawOpen}
            className="active:scale-95 transition-transform"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(37,99,235,0.12)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 50,
              padding: "7px 14px",
              flexShrink: 0,
            }}
          >
            <AXNIcon size={18} />
            <span style={{
              color: "#fff",
              fontSize: 14,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.5px",
            }}>
              {axnBalance.toLocaleString()}
            </span>
            <span style={{
              color: "rgba(96,165,250,0.8)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              AXN
            </span>
          </button>

        </div>
      </div>
    );
  }
);

Header.displayName = "Header";

export default Header;
