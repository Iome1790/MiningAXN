import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, TrendingUp, TrendingDown, ChevronLeft, HelpCircle } from "lucide-react";
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

const RATING_BASE = 2.02;
const RATING_MAX = 10.0;
const RATING_STORAGE_KEY = "axn_user_rating";
const AXN_PER_TON_FACTOR = 0.000000946;

function getRating(): number {
  try {
    const v = parseFloat(localStorage.getItem(RATING_STORAGE_KEY) || "");
    return isNaN(v) ? RATING_BASE : Math.min(v, RATING_MAX);
  } catch { return RATING_BASE; }
}
function setRating(v: number) {
  try { localStorage.setItem(RATING_STORAGE_KEY, String(Math.min(v, RATING_MAX))); } catch {}
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
      {/* Price header */}
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
      {/* Chart */}
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
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.07)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: 'linear-gradient(90deg,#ef4444 0%,#f97316 35%,#eab308 65%,#22c55e 100%)',
          borderRadius: 4, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }}>0</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700 }}>10</span>
      </div>
    </div>
  );
}

export default function WithdrawPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState("");
  const [rating, setRatingState] = useState<number>(getRating);
  const [adLoading, setAdLoading] = useState(false);
  const [ratingGain, setRatingGain] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const { data: appSettings } = useQuery<any>({ queryKey: ['/api/app-settings'], staleTime: 30000 });
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });

  const MIN_TRADE = appSettings?.minTradeAmount ?? 1000;
  const satBalance = Math.floor(parseFloat(user?.balance || "0"));

  const updateRating = (v: number) => { setRatingState(v); setRating(v); };

  const handleWatchAd = useCallback(async () => {
    if (adLoading) return;
    setAdLoading(true);
    try {
      if (typeof window.show_10401872 === "function") {
        try { await window.show_10401872({ type: "interstitial" }); } catch {}
      } else {
        await new Promise(r => setTimeout(r, 1200));
      }
      const gain = parseFloat((0.5 + Math.random() * 1.0).toFixed(2));
      setRatingState(prev => {
        const newRating = parseFloat(Math.min(prev + gain, RATING_MAX).toFixed(2));
        setRating(newRating);
        return newRating;
      });
      setRatingGain(gain);
      setTimeout(() => setRatingGain(null), 2500);
    } finally {
      setAdLoading(false);
    }
  }, [adLoading]);

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        address: walletAddress.trim(),
        amount: String(satBalance),
        method: "TON",
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Trade request submitted successfully!", "success");
      setWalletAddress("");
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

  const handleTrade = () => {
    if (satBalance <= 0) { showNotification("No AXN balance to trade", "error"); return; }
    if (satBalance < MIN_TRADE) { showNotification(`Minimum trade is ${MIN_TRADE.toLocaleString()} AXN`, "error"); return; }
    if (!walletAddress.trim()) { showNotification("Please enter your TON wallet address", "error"); return; }
    tradeMutation.mutate();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Top blue glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.9),rgba(96,165,250,1),rgba(59,130,246,0.9),transparent)',
        boxShadow: '0 0 22px rgba(59,130,246,0.7)',
        zIndex: 10,
      }} />
      {/* Top glow orb */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 160,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.14) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'relative', zIndex: 5,
      }}>
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
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>{rating.toFixed(2)}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>/ 10</span>
              {/* Watch Ad button inline */}
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
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
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

          {/* Help info */}
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginTop: 10 }}
              >
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, padding: '10px 12px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    Your rating determines the TON conversion rate. A higher rating means more TON per AXN traded. Watch ads to boost your rating up to 10.0 for the best rate.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimum balance warning */}
        {satBalance < MIN_TRADE && (
          <div style={{ position: 'relative', background: 'linear-gradient(135deg,#1a0a0a,#221212 50%,#1a0a0a)', clipPath: CUT_XS, padding: '12px 16px', textAlign: 'center', boxShadow: '0 2px 16px rgba(239,68,68,0.12)' }}>
            {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: '#ef4444', opacity: 0.5, borderRadius: 1, ...c }} />)}
            <p style={{ color: '#f87171', fontSize: 12, fontWeight: 700, margin: 0 }}>
              ⚠ Minimum {MIN_TRADE.toLocaleString()} AXN required — you need {(MIN_TRADE - satBalance).toLocaleString()} more
            </p>
          </div>
        )}
      </div>

      {/* Bottom blue glow line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.9),rgba(96,165,250,1),rgba(59,130,246,0.9),transparent)',
        boxShadow: '0 0 22px rgba(59,130,246,0.7)',
        zIndex: 10,
      }} />
      {/* Bottom glow orb */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(59,130,246,0.12) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Trade button + Back button - fixed at bottom */}
      <div style={{ padding: '12px 16px 20px', flexShrink: 0, position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={handleTrade}
          disabled={tradeMutation.isPending || satBalance < MIN_TRADE}
          style={{
            position: 'relative', width: '100%', height: 54, border: 'none',
            clipPath: CUT_SM,
            background: satBalance < MIN_TRADE
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            color: satBalance < MIN_TRADE ? 'rgba(255,255,255,0.2)' : '#fff',
            fontWeight: 900, fontSize: 16, letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (tradeMutation.isPending || satBalance < MIN_TRADE) ? 'not-allowed' : 'pointer',
            boxShadow: satBalance < MIN_TRADE ? 'none' : '0 0 32px rgba(59,130,246,0.55)',
            transition: 'all 0.2s',
          }}
        >
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: satBalance < MIN_TRADE ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)', borderRadius: 1, ...c }} />)}
          {tradeMutation.isPending ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
              Processing...
            </div>
          ) : (
            'Trade'
          )}
        </button>
        <button
          onClick={() => setLocation("/")}
          style={{
            position: 'relative', width: '100%', height: 48, border: 'none',
            clipPath: CUT_SM,
            background: 'linear-gradient(135deg,#1a1a1a,#222228 50%,#1a1a1a)',
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: 'pointer',
            boxShadow: '0 2px 16px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
            transition: 'all 0.2s',
          }}
        >
          {CORNERS_SM.map((c, i) => <div key={i} style={{ position: 'absolute', background: 'rgba(255,255,255,0.2)', borderRadius: 1, ...c }} />)}
          <ChevronLeft style={{ width: 18, height: 18 }} />
          Back
        </button>
      </div>
    </div>
  );
}
