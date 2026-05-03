import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, ArrowRightLeft, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis,
} from "recharts";

interface WithdrawalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tonBalance: number;
}

type ChartTab = "1D" | "7D" | "30D" | "90D";

const TAB_DAYS: Record<ChartTab, number> = {
  "1D": 1,
  "7D": 7,
  "30D": 30,
  "90D": 90,
};

interface PricePoint { t: number; p: number; }

const AXN_TO_TON = 0.00001; // 100000 AXN = 1 TON

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
      <div className="rounded-xl px-2.5 py-1.5 text-[10px] shadow-2xl" style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white font-black">{formatUSD(val)}</p>
        {ts && <p className="text-white/40 mt-0.5">{formatTimeLabel(ts, days)}</p>}
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
      setData(c.data);
      setPrice(c.price);
      setChange(c.change);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
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
      setData(points);
      setPrice(last);
      setChange(pct);
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(tab); }, [tab]);

  const isUp = change >= 0;
  const gradId = "tonGrad";
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div className="space-y-2">
      {/* Price Header */}
      <div className="flex items-center justify-between">
        <div>
          {loading ? (
            <div className="h-5 w-20 bg-white/5 rounded animate-pulse" />
          ) : error ? (
            <span className="text-white/30 text-sm">—</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-white font-black text-lg tabular-nums">{price ? formatUSD(price) : "—"}</span>
              <div className={`flex items-center gap-0.5 text-xs font-black ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(change).toFixed(2)}%
              </div>
            </div>
          )}
          <p className="text-white/30 text-[10px] mt-0.5 font-bold uppercase tracking-wide">TON / USD</p>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: '#141414' }}>
          {(["1D","7D","30D","90D"] as ChartTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
              style={tab === t
                ? { background: '#1c1c1e', color: '#F5C542' }
                : { color: 'rgba(255,255,255,0.3)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 100 }}>
        {loading ? (
          <div className="h-full rounded-xl bg-white/[0.02] animate-pulse flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
          </div>
        ) : error ? (
          <div className="h-full rounded-xl flex items-center justify-center">
            <p className="text-white/20 text-xs">Chart unavailable</p>
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
              <Area
                type="monotone"
                dataKey="p"
                stroke={lineColor}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                activeDot={{ r: 3, fill: lineColor }}
              />
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
  const buttonLabel = axnNum > 0 && cwalletId.trim()
    ? `Trade ${axnNum.toLocaleString()} AXN for ${formatTON(tonReceive)} TON`
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
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: '#0a0a0a', border: '1px solid #1c1c1e' }}
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
              <ArrowRightLeft className="w-5 h-5 text-[#F5C542] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm uppercase tracking-wider">Trade AXN for TON</p>
                <p className="text-white/35 text-[11px] mt-0.5">100,000 AXN = 1 TON</p>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* TON Price Chart */}
              <div className="rounded-2xl px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}>
                <TonPriceChart />
              </div>

              {/* Balance */}
              <div className="rounded-2xl px-4 py-3 flex justify-between items-center" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-white/40 text-xs font-semibold">Available Balance</span>
                <div className="flex items-center gap-1.5">
                  <img src="/axn-logo.svg" alt="AXN" className="w-4 h-4" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-[#F5C542] text-sm font-black tabular-nums">
                    {satBalance.toLocaleString()} AXN
                  </span>
                </div>
              </div>

              {/* AXN Amount Input */}
              <div className="space-y-1.5">
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest">AXN Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    value={axnAmount}
                    onChange={(e) => setAxnAmount(e.target.value)}
                    className="w-full h-11 rounded-xl px-4 pr-24 text-white font-bold text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      onClick={() => setAxnAmount(satBalance.toString())}
                      className="px-2 py-0.5 text-[10px] font-black uppercase transition-all active:scale-95 text-white/40"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>

              {/* TON Receive Preview */}
              {axnNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
                >
                  <span className="text-white/40 text-xs font-semibold">You Receive</span>
                  <span className="text-green-400 font-black text-sm tabular-nums">{formatTON(tonReceive)} TON</span>
                </motion.div>
              )}

              {/* Cwallet ID Input */}
              <div className="space-y-1.5">
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest block">Cwallet ID</label>
                <input
                  type="text"
                  placeholder="Enter your Cwallet ID"
                  value={cwalletId}
                  onChange={(e) => setCwalletId(e.target.value)}
                  className="w-full h-11 rounded-xl px-4 text-white font-medium text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              </div>

              {/* Trade Button */}
              <button
                onClick={handleTrade}
                disabled={tradeMutation.isPending}
                className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #F5C542, #d4920a)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(245,197,66,0.2)',
                }}
              >
                {tradeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  buttonLabel
                )}
              </button>

              <button
                onClick={() => onOpenChange(false)}
                className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 active:scale-[0.97] transition-transform"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
