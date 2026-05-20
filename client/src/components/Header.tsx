import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { AXNIcon } from "@/components/AXNIcon";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';

interface HeaderProps {
  onMenuOpen?: () => void;
  onInviteOpen?: () => void;
  onWithdrawOpen?: () => void;
}

const Header = forwardRef<HTMLDivElement, HeaderProps>(
  ({ onMenuOpen, onInviteOpen, onWithdrawOpen }, ref) => {
    const { data: user } = useQuery<any>({
      queryKey: ["/api/auth/user"],
      retry: false,
    });

    const satBalance = Math.floor(parseFloat((user as any)?.balance || "0"));
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
        style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
      >
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center gap-3">

          {/* Left — profile photo */}
          <button
            onClick={onMenuOpen}
            className="relative w-10 h-10 overflow-visible flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <div style={{ clipPath: CUT_SM, padding: '1.5px', background: 'linear-gradient(135deg,rgba(0,160,255,0.75),rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75))', boxShadow: '0 0 12px rgba(0,120,255,0.4)', width: 40, height: 40 }}>
              <div style={{ clipPath: CUT_SM, width: '100%', height: '100%', background: '#0d1225', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={firstName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement("span");
                        span.className = "text-white font-black text-sm select-none";
                        span.textContent = initials;
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-white font-black text-sm select-none">{initials}</span>
                )}
              </div>
            </div>
          </button>

          {/* Center — balance pill */}
          <div style={{ flex: 1, clipPath: CUT_SM, padding: '1.5px', background: 'linear-gradient(135deg,rgba(0,160,255,0.75),rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75))', boxShadow: '0 0 16px rgba(0,120,255,0.35)' }}>
            <button
              onClick={onWithdrawOpen}
              className="w-full flex items-center justify-center gap-2 active:opacity-75 transition-opacity"
              style={{ clipPath: CUT_SM, height: 38, background: 'linear-gradient(180deg,rgba(5,16,44,0.99),rgba(3,9,26,0.99))', paddingInline: 16 }}
            >
              <AXNIcon size={20} />
              <span className="text-white font-black text-sm tabular-nums">
                {satBalance.toLocaleString()}
              </span>
              <span className="text-white/40 text-xs font-bold uppercase tracking-wide">AXN</span>
            </button>
          </div>

        </div>
      </div>
    );
  }
);

Header.displayName = "Header";
export default Header;
