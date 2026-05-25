import { useState, useRef, useEffect, useCallback } from "react";

declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
  }
}
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis,
} from "recharts";

const CUT_SM = 'polygon(10px 0%,calc(100% - 10px) 0%,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0% calc(100% - 10px),0% 10px)';
const CUT_XS = 'polygon(7px 0%,calc(100% - 7px) 0%,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0% calc(100% - 7px),0% 7px)';
const CORNERS_SM = [
  { top: '2px',    left: '12px',  width: '18px', height: '1.5px' },
  { top: '12px',   left: '2px',   width: '1.5px', height: '18px' },
  { top: '2px',    right: '12px', width: '18px', height: '1.5px' },
  { top: '12px',   right: '2px',  width: '1.5px', height: '18px' },
  { bottom: '2px', left: '12px',  width: '18px', height: '1.5px' },
  { bottom: '12px',left: '2px',   width: '1.5px', height: '18px' },
  { bottom: '2px', right: '12px', width: '18px', height: '1.5px' },
  { bottom: '12px',right: '2px',  width: '1.5px', height: '18px' },
] as const;
const CHROME_SHIMMER = { position: 'absolute' as const, top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)', pointerEvents: 'none' as const, zIndex: 2 };

type ChartTab = "1D" | "7D" | "30D" | "90D";
const TAB_DAYS: Record<ChartTab, number> = { "1D": 1, "7D": 7, "30D": 30, "90D": 90 };
interface PricePoint { t: number; p: number; }

const RATING_BASE = 0;
const RATING_MAX = 10.0;
const RATING_STORAGE_KEY = "axn_user_rating";

function getRating(): number {
  try {
    const v = parseFloat(localStorage.getItem(RATING_STORAGE_KEY) || "");
    return isNaN(v) ? RATING_BASE : Math.min(v, RATING_MAX);
  } catch { return RATING_BASE; }
}
function saveRating(v: number) {
  try { localStorage.setItem(RATING_STORAGE_KEY, String(Math.min(v, RATING_MAX))); } catch {}
}

function getRatingTierLabel(rating: number): string {
  if (rating < 2) return "Beginner";
  if (rating < 4) return "Bronze";
  if (rating < 6) return "Silver";
  if (rating < 8) return "Gold";
  if (rating < 10) return "Platinum";
  return "Elite";
}

function getRatingTierColor(rating: number): string {
  if (rating < 2) return "#6b7280";
  if (rating < 4) return "#cd7f32";
  if (rating < 6) return "#9ca3af";
  if (rating < 8) return "#f59e0b";
  if (rating < 10) return "#06b6d4";
  return "#a855f7";
}

function getMaxTradeAmount(rating: number, balance: number): number {
  if (rating === 0) return 0;
  if (rating >= RATING_MAX) return balance;
  return Math.floor((rating / RATING_MAX) * balance);
}

function formatUSD(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
function formatTimeLabel(ts: number, days: number): string {
  const d = new Date(ts);
  if (days <= 1) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const ChartTooltip = ({ active, payload, days }: any) => {
  if (active && payload?.length) {
    const val: number = payload[0].value;
    const ts: number = payload[0].payload?.t;
    return (
      <div style={{ background: '#111', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '6px 10px' }}>
        <p style={{ color: '#fff', fontWeight: 900, fontSize: 10 }}>{formatUSD(val)}</p>
        {ts && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{formatTimeLabel(ts, days)}</p>}
      </div>
    );
  }
  return null;
};

function TonPriceChart() {
  const [tab, setTab] = useState<ChartTab>("1D");
  const [data, setData] = useState<PricePoint[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cacheRef = useRef<Partial<Record<ChartTab, { data: PricePoint[]; price: number; change: number }>>>({});

  const loadData = async (t: ChartTab) => {
    if (cacheRef.current[t]) {
      const c = cacheRef.current[t]!;
      setData(c.data); setPrice(c.price); setChange(c.change); setLoading(false); return;
    }
    setLoading(true); setError(false);
    try {
      const days = TAB_DAYS[t];
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/the-open-network/market_chart?vs_currency=usd&days=${days}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const prices: [number, number][] = json.prices;
      if (!Array.isArray(prices)) throw new Error();
      const pts: PricePoint[] = prices.map(([ts, p]) => ({ t: ts, p }));
      const first = pts[0]?.p ?? 0; const last = pts[pts.length - 1]?.p ?? 0;
      const pct = first ? ((last - first) / first) * 100 : 0;
      cacheRef.current[t] = { data: pts, price: last, change: pct };
      setData(pts); setPrice(last); setChange(pct); setLoading(false);
    } catch { setError(true); setLoading(false); }
  };

  useEffect(() => { loadData(tab); }, [tab]);
  const isUp = change >= 0;
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0098EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 900 }}>T</span>
          </div>
          <div>
            {loading ? (
              <div style={{ height: 18, width: 70, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
            ) : error ? (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>—</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{price ? formatUSD(price) : "—"}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 800, color: isUp ? '#4ade80' : '#f87171' }}>
                  {isUp ? <TrendingUp style={{ width: 11, height: 11 }} /> : <TrendingDown style={{ width: 11, height: 11 }} />}
                  {Math.abs(change).toFixed(2)}%
                </div>
              </div>
            )}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toncoin (TON)</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '3px' }}>
          {(["1D", "7D", "30D", "90D"] as ChartTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: tab === t ? 'rgba(59,130,246,0.25)' : 'transparent',
                color: tab === t ? '#60a5fa' : 'rgba(255,255,255,0.3)',
              }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ height: 100 }}>
        {loading ? (
          <div style={{ height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.2)' }} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Chart unavailable</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tonGradPage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["auto", "auto"]} hide />
              <XAxis dataKey="t" hide />
              <Tooltip content={<ChartTooltip days={TAB_DAYS[tab]} />} />
              <Area type="monotone" dataKey="p" stroke={lineColor} strokeWidth={1.5} fill="url(#tonGradPage)" dot={false} activeDot={{ r: 3, fill: lineColor }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, textAlign: 'center', fontWeight: 600, marginTop: 4 }}>Powered by CoinGecko API</p>
    </div>
  );
}

function RatingBar({ rating }: { rating: number }) {
  const pct = (rating / RATING_MAX) * 100;
  const tierColor = getRatingTierColor(rating);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: 'linear-gradient(90deg,#ef4444 0%,#f97316 35%,#eab308 65%,#22c55e 100%)',
          borderRadius: 4, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ color: tierColor, fontSize: 10, fontWeight: 800 }}>{getRatingTierLabel(rating)}</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }}>Max: 10</span>
      </div>
    </div>
  );
}

export default function WithdrawPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState("");
  const [tradeAmount, setTradeAmount] = useState("");
  const [rating, setRatingState] = useState<number>(getRating);
  const [adLoading, setAdLoading] = useState(false);
  const [ratingGain, setRatingGain] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const { data: appSettings } = useQuery<any>({ queryKey: ['/api/app-settings'], staleTime: 30000 });
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });

  const MIN_TRADE = appSettings?.minTradeAmount ?? 1000;
  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const maxAllowed = getMaxTradeAmount(rating, satBalance);
  const parsedAmount = parseInt(tradeAmount, 10) || 0;

  const updateRating = (v: number) => { setRatingState(v); saveRating(v); };

  const handleWatchAd = useCallback(async () => {
    if (adLoading || rating >= RATING_MAX) return;
    setAdLoading(true);
    try {
      if (typeof window.show_10401872 === "function") {
        try { await window.show_10401872({ type: "interstitial" }); } catch {}
      } else {
        await new Promise(r => setTimeout(r, 1200));
      }
      const gain = 1;
      setRatingState(prev => {
        const newRating = parseFloat(Math.min(prev + gain, RATING_MAX).toFixed(2));
        saveRating(newRating);
        return newRating;
      });
      setRatingGain(gain);
      setTimeout(() => setRatingGain(null), 2500);
    } finally {
      setAdLoading(false);
    }
  }, [adLoading, rating]);

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        address: walletAddress.trim(),
        amount: String(parsedAmount),
        method: "TON",
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Trade request submitted successfully!", "success");
      setWalletAddress("");
      setTradeAmount("");
      updateRating(0);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      setLocation("/game");
    },
    onError: (error: any) => {
      let message = "Trade failed";
      try {
        if (typeof error.message === "string") {
          const t = error.message.trim();
          if (t.startsWith("{") || t.startsWith("[")) {
            const p = JSON.parse(t); if (p.message) message = p.message;
          } else { message = error.message; }
        }
      } catch {}
      showNotification(message, "error");
    },
  });

  const amountError = (() => {
    if (!tradeAmount) return null;
    if (isNaN(parsedAmount) || parsedAmount <= 0) return "Enter a valid amount";
    if (rating === 0) return "Watch an ad first to unlock trading";
    if (parsedAmount > satBalance) return `Insufficient balance (max ${satBalance.toLocaleString()} AXN)`;
    if (parsedAmount > maxAllowed) return `Your rating allows up to ${maxAllowed.toLocaleString()} AXN. Watch more ads to unlock higher amounts.`;
    if (parsedAmount < MIN_TRADE) return `Minimum trade is ${MIN_TRADE.toLocaleString()} AXN`;
    return null;
  })();

  const canTrade = !tradeMutation.isPending && parsedAmount >= MIN_TRADE && parsedAmount <= maxAllowed && parsedAmount <= satBalance && !!walletAddress.trim() && rating > 0 && !amountError;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.9),rgba(96,165,250,1),rgba(59,130,246,0.9),transparent)', boxShadow: '0 0 22px rgba(59,130,246,0.7)', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.14) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, position: 'relative', zIndex: 5 }}>
        <button
          onClick={() => setLocation("/")}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 17 }}>Trade AXN</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Exchange AXN for TON</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AXNIcon size={14} />
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{satBalance.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>AXN</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>

        {/* TON Price Card */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg,#1a1a1a 0%,#222228 50%,#1a1a1a 100%)', clipPath: CUT_SM, padding: '14px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset' }}>
          <div style={CHROME_SHIMMER} />
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: '#3b82f6', opacity: 0.6, borderRadius: 1, ...c }} />)}
          <TonPriceChart />
        </div>

        {/* Rating + Watch Ad */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg,#1a1a1a 0%,#222228 50%,#1a1a1a 100%)', clipPath: CUT_SM, padding: '14px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset' }}>
          <div style={CHROME_SHIMMER} />
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: '#3b82f6', opacity: 0.6, borderRadius: 1, ...c }} />)}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rating</span>
              <button
                onClick={() => setShowHelp(h => !h)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 2, display: 'flex', alignItems: 'center' }}
              >
                <HelpCircle style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AnimatePresence>
                {ratingGain !== null && (
                  <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    style={{ color: '#4ade80', fontSize: 12, fontWeight: 900 }}>+{ratingGain}</motion.span>
                )}
              </AnimatePresence>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{rating.toFixed(0)}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>/ 10</span>
              <button
                onClick={handleWatchAd}
                disabled={adLoading || rating >= RATING_MAX}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: rating >= RATING_MAX ? 'rgba(34,197,94,0.12)' : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                  border: 'none', borderRadius: 8, padding: '6px 12px',
                  color: rating >= RATING_MAX ? '#4ade80' : '#fff',
                  fontSize: 11, fontWeight: 800, cursor: (adLoading || rating >= RATING_MAX) ? 'not-allowed' : 'pointer',
                  opacity: adLoading ? 0.7 : 1,
                  boxShadow: (!adLoading && rating < RATING_MAX) ? '0 0 12px rgba(59,130,246,0.4)' : 'none',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {adLoading ? (
                  <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                ) : rating >= RATING_MAX ? (
                  '⚡ Max'
                ) : (
                  '▶ Watch Ad'
                )}
              </button>
            </div>
          </div>
          <RatingBar rating={rating} />

          {/* Trade limit indicator */}
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Trade Limit</span>
              <span style={{ color: rating === 0 ? '#ef4444' : '#60a5fa', fontSize: 12, fontWeight: 800 }}>
                {rating === 0 ? 'Locked — watch an ad' : `${maxAllowed.toLocaleString()} AXN`}
              </span>
            </div>
            {rating > 0 && rating < RATING_MAX && (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: '4px 0 0' }}>
                Watch more ads to increase your limit
              </p>
            )}
          </div>

          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 10 }}
              >
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    Your rating determines how much AXN you can trade. Each ad you watch adds <strong style={{ color: '#60a5fa' }}>+1 rating</strong>. Higher rating = higher trade limit. At rating 10, you can trade your full balance.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Trade Amount Input */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg,#1a1a1a 0%,#222228 50%,#1a1a1a 100%)', clipPath: CUT_SM, padding: '14px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset' }}>
          <div style={CHROME_SHIMMER} />
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: '#f59e0b', opacity: 0.5, borderRadius: 1, ...c }} />)}
          <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, background: 'linear-gradient(180deg,transparent,#f59e0b,transparent)', opacity: 0.6 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trade Amount</span>
            <button
              onClick={() => setTradeAmount(String(maxAllowed))}
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '3px 8px', color: '#f59e0b', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
            >
              MAX
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              placeholder={`Min ${MIN_TRADE.toLocaleString()} AXN`}
              value={tradeAmount}
              onChange={e => setTradeAmount(e.target.value)}
              min={0}
              style={{
                width: '100%', height: 48,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${amountError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
                clipPath: CUT_XS,
                color: '#fff', fontSize: 18, fontWeight: 800, padding: '0 52px 0 14px', outline: 'none',
                boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums',
              }}
            />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>AXN</span>
          </div>
          {amountError && (
            <p style={{ color: '#f87171', fontSize: 11, margin: '6px 0 0', fontWeight: 600 }}>⚠ {amountError}</p>
          )}
          {!amountError && parsedAmount > 0 && (
            <p style={{ color: '#4ade80', fontSize: 11, margin: '6px 0 0', fontWeight: 600 }}>✓ Amount valid</p>
          )}
        </div>

        {/* TON Wallet Address */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg,#1a1a1a 0%,#222228 50%,#1a1a1a 100%)', clipPath: CUT_SM, padding: '14px 16px', boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset' }}>
          <div style={CHROME_SHIMMER} />
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: '#0098EA', opacity: 0.7, borderRadius: 1, ...c }} />)}
          <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, background: 'linear-gradient(180deg,transparent,#0098EA,transparent)', opacity: 0.6 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0098EA', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(0,152,234,0.5)' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 900 }}>T</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TON Wallet Address</span>
          </div>
          <input
            type="text"
            placeholder="Enter your TON wallet address"
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
            style={{
              width: '100%', height: 44,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              clipPath: CUT_XS,
              color: '#fff', fontSize: 12, padding: '0 12px', outline: 'none',
              boxSizing: 'border-box', fontFamily: 'monospace',
            }}
          />
        </div>
      </div>

      {/* Bottom glow */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.9),rgba(96,165,250,1),rgba(59,130,246,0.9),transparent)', boxShadow: '0 0 22px rgba(59,130,246,0.7)', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Trade button */}
      <div style={{ padding: '12px 16px 20px', flexShrink: 0, position: 'relative', zIndex: 5 }}>
        <button
          onClick={() => tradeMutation.mutate()}
          disabled={!canTrade}
          style={{
            position: 'relative', width: '100%', height: 54, border: 'none',
            clipPath: CUT_SM,
            background: canTrade
              ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
              : 'rgba(255,255,255,0.05)',
            color: canTrade ? '#fff' : 'rgba(255,255,255,0.2)',
            fontWeight: 900, fontSize: 16, letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canTrade ? 'pointer' : 'not-allowed',
            boxShadow: canTrade ? '0 0 32px rgba(59,130,246,0.55)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: canTrade ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', borderRadius: 1, ...c }} />)}
          {tradeMutation.isPending ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
              Processing...
            </div>
          ) : (
            parsedAmount > 0 ? `Trade ${parsedAmount.toLocaleString()} AXN` : 'Trade'
          )}
        </button>
      </div>
    </div>
  );
}
