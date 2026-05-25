import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppNotification from "@/components/AppNotification";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useEffect, lazy, Suspense, useState, memo, useCallback, useRef, createContext } from "react";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import { setupDeviceTracking } from "@/lib/deviceId";
import BanScreen from "@/components/BanScreen";
import CountryBlockedScreen from "@/components/CountryBlockedScreen";
import SeasonEndOverlay from "@/components/SeasonEndOverlay";
import { SeasonEndContext } from "@/lib/SeasonEndContext";
import { useAdmin } from "@/hooks/useAdmin";
import ChannelJoinPopup from "@/components/ChannelJoinPopup";

export const AppReadyContext = createContext<() => void>(() => {});

declare global {
  interface Window {
    show_10963365: (type?: any) => Promise<void>;
  }
}

const Landing = lazy(() => import("@/pages/Landing"));
const Admin = lazy(() => import("@/pages/Admin"));
const CountryControls = lazy(() => import("@/pages/CountryControls"));
const GamesPage = lazy(() => import("@/pages/Games"));
const EarnPage = lazy(() => import("@/pages/Earn"));
const WatchPage = lazy(() => import("@/pages/Earn"));
const FriendPage = lazy(() => import("@/pages/Friend"));
const WalletPage = lazy(() => import("@/pages/Wallet"));
const NotFound = lazy(() => import("@/pages/not-found"));

const PageLoader = memo(function PageLoader() {
  return null;
});

function LoadingFallback({ isReady = false, onDone }: { isReady?: boolean; onDone?: () => void }) {
  const [opacity, setOpacity] = useState(1);
  const readyRef = useRef(false);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  const startFadeOut = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    let fadeStart = 0;
    function fadeTick(ts: number) {
      if (!fadeStart) fadeStart = ts;
      const ft = Math.min((ts - fadeStart) / 380, 1);
      setOpacity(1 - ft);
      if (ft < 1) {
        rafRef.current = requestAnimationFrame(fadeTick);
      } else {
        onDone?.();
      }
    }
    rafRef.current = requestAnimationFrame(fadeTick);
  }, [onDone]);

  useEffect(() => {
    if (isReady) {
      readyRef.current = true;
      // Small delay so user sees screen briefly, then fade
      const t = setTimeout(startFadeOut, 200);
      return () => clearTimeout(t);
    }
  }, [isReady, startFadeOut]);

  // Safety: force dismiss after 5s max
  useEffect(() => {
    const t = setTimeout(startFadeOut, 5000);
    return () => clearTimeout(t);
  }, [startFadeOut]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: '#000000', zIndex: 9999, opacity, pointerEvents: opacity < 0.05 ? 'none' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <style>{`
        @keyframes axn-coin-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes axn-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes axn-glow-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.08); }
        }
        @keyframes axn-ripple-1 {
          0% { transform: scale(0.9); opacity: 0.55; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes axn-ripple-2 {
          0% { transform: scale(0.9); opacity: 0.35; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>
      {/* Soft glow orb */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
        animation: 'axn-glow-pulse 2.4s ease-in-out infinite',
      }} />
      {/* Ripple ring 1 */}
      <div style={{
        position: 'absolute', width: 150, height: 150, borderRadius: '50%',
        border: '1.5px solid rgba(59,130,246,0.55)',
        animation: 'axn-ripple-1 2.2s ease-out infinite',
      }} />
      {/* Ripple ring 2 */}
      <div style={{
        position: 'absolute', width: 150, height: 150, borderRadius: '50%',
        border: '1px solid rgba(59,130,246,0.3)',
        animation: 'axn-ripple-2 2.2s ease-out 0.8s infinite',
      }} />
      {/* AXN Image */}
      <div style={{ animation: 'axn-coin-float 3s ease-in-out infinite', position: 'relative', zIndex: 2 }}>
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          overflow: 'hidden', position: 'relative',
          border: '2px solid rgba(59,130,246,0.35)',
          boxShadow: '0 0 36px rgba(59,130,246,0.4), 0 0 80px rgba(59,130,246,0.15)',
        }}>
          <img
            src="/axn-coin-new.png"
            alt="AXN"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.18)', width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      </div>
      {/* Bouncing dots */}
      <div style={{ display: 'flex', gap: 8, marginTop: 32, position: 'relative', zIndex: 2 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'rgba(230,126,0,0.8)',
            animation: `axn-dot-bounce 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.18}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

const NAV_ROUTES = new Set(["/", "/earn", "/game", "/friend", "/wallet"]);

function Router() {
  const [location] = useLocation();
  const showNav = NAV_ROUTES.has(location);

  return (
    <>
      <Suspense fallback={null}>
        <Switch>
          <Route path="/" component={() => { const [, setLocation] = useLocation(); setLocation("/game"); return null; }} />
          <Route path="/earn" component={EarnPage} />
          <Route path="/watch" component={WatchPage} />
          <Route path="/friend" component={FriendPage} />
          <Route path="/wallet" component={() => <ErrorBoundary><WalletPage /></ErrorBoundary>} />
          <Route path="/landing" component={Landing} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/country-controls" component={CountryControls} />
          <Route path="/game" component={GamesPage} />
          <Route path="/withdraw" component={() => { const [, setLocation] = useLocation(); setLocation("/wallet"); return null; }} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {showNav && <BottomNav />}
    </>
  );
}

function AppContent() {
  const [showSeasonEnd, setShowSeasonEnd] = useState(false);
  const [seasonLockActive, setSeasonLockActive] = useState(false);
  const { isAdmin } = useAdmin();
  const inAppAdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inAppAdInitialized = useRef(false);
  const [popupAdsEnabled, setPopupAdsEnabled] = useState(true);
  const [popupAdInterval, setPopupAdInterval] = useState(60);
  
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

  useEffect(() => {
    if (isDevMode) return;
    // Fetch popup ad settings
    fetch("/api/app-settings")
      .then(res => res.json())
      .then(settings => {
        setPopupAdsEnabled(settings.popupAdsEnabled !== false);
        setPopupAdInterval(settings.popupAdInterval || 60);
      })
      .catch(() => {});
  }, [isDevMode]);

  useEffect(() => {
    if (isDevMode) return;
    if (inAppAdInitialized.current) return;
    if (!popupAdsEnabled) return;
    inAppAdInitialized.current = true;

    const showInAppAd = () => {
      if (window.location.pathname.startsWith('/game/')) return;
      if (typeof window.show_10963365 === 'function') {
        window.show_10963365({
          type: 'inApp',
          inAppSettings: {
            frequency: 2,
            capping: 0.1,
            interval: 30,
            timeout: 5,
            everyPage: false,
          }
        }).catch(() => {});
      }
    };

    const intervalMs = popupAdInterval * 1000;
    const initialDelay = setTimeout(() => {
      showInAppAd();
      
      inAppAdIntervalRef.current = setInterval(() => {
        showInAppAd();
      }, intervalMs);
    }, 5000);

    return () => {
      clearTimeout(initialDelay);
      if (inAppAdIntervalRef.current) {
        clearInterval(inAppAdIntervalRef.current);
      }
    };
  }, [popupAdsEnabled, popupAdInterval]);

  // ── Global long-press / context-menu protection ──
  useEffect(() => {
    const PROTECTED_TAGS = new Set(['INPUT', 'TEXTAREA']);

    // Block contextmenu everywhere except inside inputs
    const blockCtx = (e: MouseEvent | Event) => {
      let t = e.target as HTMLElement | null;
      while (t) {
        if (PROTECTED_TAGS.has(t.tagName) || (t as HTMLElement).isContentEditable) return;
        t = t.parentElement;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    // Block dragstart on images and links
    const blockDrag = (e: DragEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'IMG' || tag === 'A') e.preventDefault();
    };

    // Prevent long-press save/open on images via touchend
    // BUT only if the image is NOT inside a button/link (so nav taps still work)
    const blockImgTouch = (e: TouchEvent) => {
      if ((e.target as HTMLElement).tagName !== 'IMG') return;
      let p = (e.target as HTMLElement).parentElement;
      while (p) {
        const tag = p.tagName;
        if (tag === 'BUTTON' || tag === 'A' || p.getAttribute('role') === 'button') return;
        p = p.parentElement;
      }
      e.preventDefault();
    };

    // Apply draggable=false + contextmenu block to every img in DOM
    const lockImage = (img: HTMLElement) => {
      img.setAttribute('draggable', 'false');
      (img as any).oncontextmenu = (e: Event) => { e.preventDefault(); return false; };
      (img as any).onselectstart = (e: Event) => { e.preventDefault(); return false; };
    };

    // Process all current images
    document.querySelectorAll<HTMLElement>('img').forEach(lockImage);

    // Watch for new images added to DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if ((node as HTMLElement).tagName === 'IMG') lockImage(node as HTMLElement);
          (node as HTMLElement).querySelectorAll?.('img').forEach(lockImage);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('contextmenu', blockCtx, true);
    document.addEventListener('dragstart', blockDrag, true);
    document.addEventListener('touchend', blockImgTouch, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', blockCtx, true);
      document.removeEventListener('dragstart', blockDrag, true);
      document.removeEventListener('touchend', blockImgTouch);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const checkSeasonStatus = () => {
      fetch("/api/app-settings")
        .then(res => res.json())
        .then(settings => {
          if (settings.seasonBroadcastActive) {
            setSeasonLockActive(true);
            setShowSeasonEnd(true);
          } else {
            setSeasonLockActive(false);
            localStorage.removeItem("season_end_seen");
          }
        })
        .catch(() => {});
    };

    checkSeasonStatus();
    const interval = setInterval(checkSeasonStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseSeasonEnd = () => {
    if (!seasonLockActive) {
      localStorage.setItem("season_end_seen", "true");
      setShowSeasonEnd(false);
    }
  };

  const shouldShowSeasonEnd = showSeasonEnd && !isAdmin;

  return (
    <SeasonEndContext.Provider value={{ showSeasonEnd: shouldShowSeasonEnd }}>
      <AppNotification />
      {shouldShowSeasonEnd && <SeasonEndOverlay onClose={handleCloseSeasonEnd} isLocked={seasonLockActive} />}
      <Router />
    </SeasonEndContext.Provider>
  );
}

import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeProvider } from "@/hooks/useTheme";
import { showNotification } from "@/components/AppNotification";

function App() {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string>();
  const [banType, setBanType] = useState<string>();
  const [adminBanReason, setAdminBanReason] = useState<string>();
  const [isCountryBlocked, setIsCountryBlocked] = useState(false);
  const [userCountryCode, setUserCountryCode] = useState<string | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isCheckingCountry, setIsCheckingCountry] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isChannelVerified, setIsChannelVerified] = useState<boolean>(true);
  const [isCheckingMembership, setIsCheckingMembership] = useState(true);
  
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';

  const checkMembership = useCallback(async (isSilent = false) => {
    try {
      const headers: Record<string, string> = {};
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        headers['x-telegram-data'] = tg.initData;
      }
      
      const response = await fetch(`/api/check-membership?t=${Date.now()}`, { headers });
      const data = await response.json();
      
      if (data.success) {
        if (data.banned) {
          setIsBanned(true);
          setBanType(data.banType);
          setAdminBanReason(data.adminBanReason);
          setBanReason(data.reason);
          return;
        }
        setIsChannelVerified(data.isVerified);
      }
    } catch (err) {
      console.error("Membership check error:", err);
    } finally {
      if (!isSilent) setIsCheckingMembership(false);
    }
  }, []);

  useEffect(() => {
    checkMembership();
  }, [checkMembership]);

  // Periodic re-check every 30s to detect channel leave in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      checkMembership(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [checkMembership]);

  const checkCountry = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      
      const tg = window.Telegram?.WebApp;
      if (tg?.initData) {
        headers['x-telegram-data'] = tg.initData;
      }
      
      const cachedUser = localStorage.getItem("tg_user");
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          headers['x-user-id'] = user.id.toString();
        } catch {}
      }
      
      const response = await fetch('/api/check-country', { 
        cache: 'no-store',
        headers
      });
      const data = await response.json();
      
      if (data.country) {
        setUserCountryCode(data.country.toUpperCase());
      }
      
      if (data.blocked) {
        setIsCountryBlocked(true);
      } else {
        setIsCountryBlocked(false);
      }
    } catch (err) {
      console.error("Country check error:", err);
    } finally {
      setIsCheckingCountry(false);
    }
  }, []);

  useEffect(() => {
    checkCountry();
  }, [checkCountry]);

  useEffect(() => {
    const handleCountryBlockChange = (event: CustomEvent) => {
      const { action, countryCode } = event.detail;
      
      console.log(`Country block change: ${countryCode} - ${action}`);
      
      if (userCountryCode && countryCode === userCountryCode) {
        if (action === 'blocked') {
          setIsCountryBlocked(true);
        } else if (action === 'unblocked') {
          setIsCountryBlocked(false);
        }
      }
    };
    
    window.addEventListener('countryBlockChanged', handleCountryBlockChange as EventListener);
    
    return () => {
      window.removeEventListener('countryBlockChanged', handleCountryBlockChange as EventListener);
    };
  }, [userCountryCode]);

  useEffect(() => {
    if (isCheckingCountry || isCountryBlocked) {
      return;
    }

    if (isDevMode) {
      console.log('Development mode: Skipping Telegram authentication');
      setTelegramId('dev-user-123');
      setIsAuthenticating(false);
      return;
    }
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      
      if (tg.initDataUnsafe?.user) {
        localStorage.setItem("tg_user", JSON.stringify(tg.initDataUnsafe.user));
        setTelegramId(tg.initDataUnsafe.user.id.toString());
      }
      
      if (tg.initDataUnsafe?.start_param) {
        localStorage.setItem("tg_start_param", tg.initDataUnsafe.start_param);
      }
      
      const { deviceId, fingerprint } = setupDeviceTracking();
      
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        "x-device-fingerprint": JSON.stringify(fingerprint)
      };
      let body: any = {};
      let userTelegramId: string | null = null;
      
      const startParam = tg.initDataUnsafe?.start_param || localStorage.getItem("tg_start_param");
      
      if (tg.initData) {
        body = { initData: tg.initData };
        if (startParam) {
          body.startParam = startParam;
        }
        if (tg.initDataUnsafe?.user?.id) {
          userTelegramId = tg.initDataUnsafe.user.id.toString();
        }
      } else {
        const cachedUser = localStorage.getItem("tg_user");
        if (cachedUser) {
          try {
            const user = JSON.parse(cachedUser);
            headers["x-user-id"] = user.id.toString();
            userTelegramId = user.id.toString();
            if (startParam) {
              body.startParam = startParam;
            }
          } catch {}
        }
      }
      
      fetch("/api/auth/telegram", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      })
        .then(res => res.json())
        .then(data => {
          if (data.referralProcessed) {
            localStorage.removeItem("tg_start_param");
          }
          if (data.banned) {
            setIsBanned(true);
            setBanReason(data.reason);
            setBanType(data.banType);
            setAdminBanReason(data.adminBanReason);
          } else if (userTelegramId) {
            setTelegramId(userTelegramId);
          }
          setIsAuthenticating(false);
        })
        .catch(() => {
          setIsAuthenticating(false);
        });
    } else {
      setIsAuthenticating(false);
    }
  }, [isDevMode, isCheckingCountry, isCountryBlocked]);

  const [isAppReady, setIsAppReady] = useState(false);
  const [showLoader, setShowLoader] = useState(!import.meta.env.DEV);
  const signalReady = useCallback(() => setIsAppReady(true), []);

  // Safety fallback — dismiss loader after 3s max
  useEffect(() => {
    const t = setTimeout(() => setIsAppReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Public route — bypass all Telegram auth checks
  if (typeof window !== "undefined" && window.location.pathname === "/landing") {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<LoadingFallback />}>
          <Landing />
        </Suspense>
      </QueryClientProvider>
    );
  }

  if (isBanned) {
    return <BanScreen reason={banReason} banType={banType} adminBanReason={adminBanReason} />;
  }

  if (isCountryBlocked) {
    return <CountryBlockedScreen />;
  }

  const isChecking = isCheckingCountry || isAuthenticating || isCheckingMembership;

  // Show plain "Open in Telegram" only after all checks done
  if (!isChecking && !telegramId && !isDevMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full border-2 border-white/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-4 tracking-tight">Open in Telegram</h1>
          <p className="text-white/60 text-base leading-relaxed">
            Please open this app from Telegram to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <AppReadyContext.Provider value={signalReady}>
            {/* Loading overlay — stays on top until home data is ready */}
            {showLoader && (
              <LoadingFallback
                isReady={isAppReady && !isChecking}
                onDone={() => setShowLoader(false)}
              />
            )}
            {/* Real app — renders underneath so data fetching starts immediately */}
            {!isChecking && (
              <>
                {!isChannelVerified && (
                  <Suspense fallback={null}>
                    <ChannelJoinPopup
                      telegramId={telegramId || ""}
                      onVerified={() => {
                        setIsChannelVerified(true);
                        showNotification("Verification successful! Welcome.", "success");
                      }}
                    />
                  </Suspense>
                )}
                <AppContent />
              </>
            )}
          </AppReadyContext.Provider>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
