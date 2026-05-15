import { useQuery } from "@tanstack/react-query";
import { forwardRef } from "react";
import { FaUserFriends } from "react-icons/fa";
import { AXNIcon } from "@/components/AXNIcon";

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

    const { data: miningState } = useQuery<any>({
      queryKey: ["/api/axn-mining/state"],
      retry: false,
      staleTime: 15000,
    });

    const satBalance = Math.floor(parseFloat((user as any)?.balance || "0"));
    const firstName: string = user?.firstName || user?.username || "You";
    const miningLevel: number = miningState?.state?.miningLevel ?? 1;
    const cpuLevel: number = miningState?.state?.cpuLevel ?? 1;
    const capacityLevel: number = miningState?.state?.capacityLevel ?? 1;
    const machineLevel: number = Math.min(miningLevel, cpuLevel, capacityLevel);

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
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-3">

          {/* Left — profile photo with level badge */}
          <button
            onClick={onMenuOpen}
            className="relative w-10 h-10 rounded-full overflow-visible flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "#1c1c1e" }}
            >
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

            {/* Level badge */}
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                border: "1px solid rgba(147,197,253,0.4)",
                boxShadow: "0 0 6px rgba(59,130,246,0.5)",
                borderRadius: 4,
                minWidth: 22,
                height: 14,
                paddingInline: 3,
                zIndex: 10,
              }}
            >
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 8, letterSpacing: "0.02em" }}>
                LV{machineLevel}
              </span>
            </div>
          </button>

          {/* Center — balance pill */}
          <button
            onClick={onWithdrawOpen}
            className="flex-1 flex items-center justify-center gap-2 h-10 bg-[#1c1c1e] rounded-full px-4 active:scale-95 transition-transform"
          >
            <AXNIcon size={22} />
            <span className="text-white font-black text-sm tabular-nums">
              {satBalance.toLocaleString()}
            </span>
            <span className="text-white/40 text-xs font-bold uppercase tracking-wide">AXN</span>
          </button>

          {/* Right — Invite button */}
          <button
            onClick={onInviteOpen}
            className="flex items-center gap-2 h-10 rounded-full px-3 active:scale-95 transition-transform flex-shrink-0"
            style={{ background: "#1c1c1e" }}
          >
            <FaUserFriends style={{ width: 20, height: 20, color: "#60a5fa" }} />
            <span className="text-blue-400 font-black text-xs uppercase tracking-wide">Invite</span>
          </button>

        </div>
      </div>
    );
  }
);

Header.displayName = "Header";
export default Header;
