import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { RiExchangeFill } from "react-icons/ri";
import { AXNIcon } from "@/components/AXNIcon";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis,
} from "recharts";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';
const CUT_LG = 'polygon(16px 0%,calc(100% - 16px) 0%,100% 16px,100% calc(100% - 16px),calc(100% - 16px) 100%,16px 100%,0% calc(100% - 16px),0% 16px)';

const CORNER_ACCENTS = [
  { top:'2px',    left:'14px',  width:'30px', height:'1.5px' },
  { top:'14px',   left:'2px',   width:'1.5px',height:'30px'  },
  { top:'2px',    right:'14px', width:'30px', height:'1.5px' },
  { top:'14px',   right:'2px',  width:'1.5px',height:'30px'  },
  { bottom:'2px', left:'14px',  width:'30px', height:'1.5px' },
  { bottom:'14px',left:'2px',   width:'1.5px',height:'30px'  },
  { bottom:'2px', right:'14px', width:'30px', height:'1.5px' },
  { bottom:'14px',right:'2px',  width:'1.5px',height:'30px'  },
];

interface WithdrawalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tonBalance: number;
}

type ChartTab = "1D" | "7D" | "30D" | "90D";

const TAB_DAYS: Record<ChartTab, number> = {
  "1D": 1, "7D": 7, "30D": 30, "90D": 90,
};

interface PricePoint { t: number; p: number; }

const AXN_TO_TON = 0.00001;

function formatTON(n: number): string {
  if (n < 0.001) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  return n.toFixed(3);
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
      <div style={{ background: '#1c1c1e', border: '1px solid rgba(0,120,255,0.2)', clipPath: CUT_SM, padding: '6px 10px' }}>
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

  const loadData = async (selectedTab: ChartTab) => {
    if (cacheRef.current[selectedTab]) {
      const c = cacheRef.current[selectedTab]!;
      setData(c.data); setPrice(c.price); setChange(c.change);
      setLoading(false); return;
    }
    setLoading(true); setError(false);
    try {
      const days = TAB_DAYS[selectedTab];
      const url = `https://api.coingecko.com/api/v3/coins/the-open-network/market_chart?vs_currency=usd&days=${days}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      const prices: [number, number][] = json.prices;
      if (!Array.isArray(prices)) throw new Error("invalid response");
      const points: PricePoint[] = prices.map(([t, p]) => ({ t, p }));
      const first = points[0]?.p ?? 0;
      const last = points[points.length - 1]?.p ?? 0;
      const pct = first ? ((last - first) / first) * 100 : 0;
      const entry = { data: points, price: last, change: pct };
      cacheRef.current[selectedTab] = entry;
      setData(points); setPrice(last); setChange(pct);
      setLoading(false);
    } catch {
      setError(true); setLoading(false);
    }
  };

  useEffect(() => { loadData(tab); }, [tab]);

  const isUp = change >= 0;
  const gradId = "tonGrad";
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {loading ? (
            <div style={{ height: 20, width: 80, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
          ) : error ? (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>—</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>{price ? formatUSD(price) : "—"}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 900, color: isUp ? '#4ade80' : '#f87171' }}>
                {isUp ? <TrendingUp style={{ width: 11, height: 11 }} /> : <TrendingDown style={{ width: 11, height: 11 }} />}
                {Math.abs(change).toFixed(2)}%
              </div>
            </div>
          )}
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TON / USD</p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: '3px' }}>
          {(["1D","7D","30D","90D"] as ChartTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '4px 8px', borderRadius: 7, fontSize: 10, fontWeight: 900, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: tab === t ? 'rgba(0,120,255,0.25)' : 'transparent',
                color: tab === t ? '#60a5fa' : 'rgba(255,255,255,0.3)',
              }}
            >{t}</button>
          ))}
        </div>
      </div>
      <div style={{ height: 90 }}>
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
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["auto", "auto"]} hide />
              <XAxis dataKey="t" hide />
              <Tooltip content={<ChartTooltip days={TAB_DAYS[tab]} />} />
              <Area type="monotone" dataKey="p" stroke={lineColor} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 3, fill: lineColor }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function WithdrawalPopup({ open, onOpenChange, tonBalance }: WithdrawalPopupProps) {
  const queryClient = useQueryClient();
  const [cwalletId, setCwalletId] = useState("");
  const [axnAmount, setAxnAmount] = useState("");

  const { data: appSettings } = useQuery<any>({
    queryKey: ['/api/app-settings'],
    staleTime: 30000,
  });

  const MIN_TRADE = appSettings?.minTradeAmount ?? 1000;

  const { data: user } = useQuery<any>({
    queryKey: ['/api/auth/user'],
    staleTime: 0,
  });

  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const axnNum = parseFloat(axnAmount) || 0;
  const tonReceive = axnNum * AXN_TO_TON;
  const hasInput = axnNum > 0 && cwalletId.trim();
  const buttonLabel = hasInput
    ? `Trade ${axnNum.toLocaleString()} AXN → ${formatTON(tonReceive)} TON`
    : "Trade AXN for TON";

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        address: cwalletId.trim(),
        amount: axnAmount,
        method: "TON",
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Trade request submitted successfully!", "success");
      onOpenChange(false);
      setCwalletId("");
      setAxnAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
    },
    onError: (error: any) => {
      let message = "Trade failed";
      try {
        if (typeof error.message === "string") {
          const t = error.message.trim();
          if (t.startsWith("{") || t.startsWith("[")) {
            const p = JSON.parse(t);
            if (p.message) message = p.message;
          } else {
            message = error.message;
          }
        }
      } catch {}
      showNotification(message, "error");
    },
  });

  const handleTrade = () => {
    const amount = parseFloat(axnAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification("Please enter a valid AXN amount", "error");
      return;
    }
    if (amount < MIN_TRADE) {
      showNotification(`Minimum trade is ${MIN_TRADE.toLocaleString()} AXN`, "error");
      return;
    }
    if (amount > satBalance) {
      showNotification(`Insufficient balance. Available: ${satBalance.toLocaleString()} AXN`, "error");
      return;
    }
    if (!cwalletId.trim()) {
      showNotification("Please enter your Cwallet ID", "error");
      return;
    }
    tradeMutation.mutate();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

          <motion.div
            className="relative w-full max-w-sm"
            style={{ maxHeight: '88vh' }}
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Outer border — cut corners, electric blue glow */}
            <div style={{
              background: 'linear-gradient(135deg,rgba(0,160,255,0.75) 0%,rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75) 100%)',
              clipPath: CUT_LG, padding: '1.5px',
              boxShadow: '0 0 32px rgba(0,120,255,0.45), 0 0 64px rgba(0,80,200,0.2)',
            }}>
              <div style={{
                background: 'linear-gradient(180deg,rgba(5,16,44,0.99) 0%,rgba(3,9,26,0.99) 100%)',
                clipPath: CUT_LG, position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', maxHeight: 'calc(88vh - 3px)',
              }}>
                {/* Corner accent lines */}
                {CORNER_ACCENTS.map((s, i) => (
                  <div key={i} className="absolute pointer-events-none"
                    style={{ ...s, background: 'rgba(0,200,255,0.75)', zIndex: 10 }} />
                ))}

                {/* Header */}
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(0,120,255,0.18)', flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RiExchangeFill style={{ width: 22, height: 22, color: '#facc15', flexShrink: 0 }} />
                  <div>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>Trade AXN for TON</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '3px' }}>100,000 AXN = 1 TON</p>
                  </div>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>

                  {/* TON Price Chart */}
                  <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.18)', clipPath: CUT_SM, padding: '12px 14px' }}>
                    <TonPriceChart />
                  </div>

                  {/* Available balance */}
                  <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(0,120,255,0.15)', clipPath: CUT_SM, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600 }}>Available Balance</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AXNIcon size={14} />
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{satBalance.toLocaleString()}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>AXN</span>
                    </div>
                  </div>

                  {/* AXN Amount input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>AXN Amount</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={axnAmount}
                        onChange={(e) => setAxnAmount(e.target.value)}
                        style={{
                          width: '100%', height: '44px', clipPath: CUT_SM,
                          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,120,255,0.2)',
                          color: '#fff', fontWeight: 700, fontSize: '14px',
                          padding: '0 70px 0 14px', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => setAxnAmount(satBalance.toString())}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', height: '28px', padding: '0 10px', clipPath: CUT_SM, background: 'linear-gradient(135deg,#0847c8,#0a52d4)', color: '#fff', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', border: 'none' }}
                      >MAX</button>
                    </div>
                  </div>

                  {/* Cwallet ID input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Cwallet ID</label>
                    <input
                      type="text"
                      placeholder="Enter your Cwallet ID"
                      value={cwalletId}
                      onChange={(e) => setCwalletId(e.target.value)}
                      style={{
                        width: '100%', height: '44px', clipPath: CUT_SM,
                        background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,120,255,0.2)',
                        color: '#fff', fontWeight: 500, fontSize: '13px',
                        padding: '0 14px', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Trade button */}
                  <button
                    onClick={handleTrade}
                    disabled={tradeMutation.isPending}
                    style={{
                      width: '100%', height: '46px', clipPath: CUT_SM,
                      background: 'linear-gradient(135deg,#0847c8 0%,#1560e0 40%,#0a52d4 100%)',
                      border: '1px solid rgba(80,150,255,0.5)',
                      color: '#fff', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em',
                      boxShadow: '0 0 28px rgba(20,80,220,0.7),inset 0 1px 0 rgba(255,255,255,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      cursor: tradeMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: tradeMutation.isPending ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {tradeMutation.isPending ? (
                      <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                    ) : buttonLabel}
                  </button>

                  {/* Close button */}
                  <button
                    onClick={() => onOpenChange(false)}
                    style={{ width: '100%', height: '40px', clipPath: CUT_SM, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', transition: 'transform 0.12s', marginBottom: '2px' }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >← CLOSE</button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
