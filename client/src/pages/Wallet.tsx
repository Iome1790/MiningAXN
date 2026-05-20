import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis } from "recharts";
import Layout from "@/components/Layout";
import Header from "@/components/Header";

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';

type ChartTab = "1D" | "7D" | "30D" | "90D";
const TAB_DAYS: Record<ChartTab, number> = { "1D": 1, "7D": 7, "30D": 30, "90D": 90 };
interface PricePoint { t: number; p: number; }
const AXN_TO_TON = 0.00001;

function formatTON(n: number) { return n < 0.001 ? n.toFixed(6) : n < 1 ? n.toFixed(4) : n.toFixed(3); }
function formatUSD(n: number) { return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`; }
function formatTimeLabel(ts: number, days: number) {
  const d = new Date(ts);
  return days <= 1 ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const ChartTooltip = ({ active, payload, days }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#1c1c1e', border: '1px solid rgba(0,120,255,0.2)', borderRadius: 6, padding: '6px 10px' }}>
        <p style={{ color: '#fff', fontWeight: 900, fontSize: 10 }}>{formatUSD(payload[0].value)}</p>
        {payload[0].payload?.t && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>{formatTimeLabel(payload[0].payload.t, days)}</p>}
      </div>
    );
  }
  return null;
};

function TonPriceChart() {
  const [tab, setTab] = useState<ChartTab>("1D");
  const [data, setData] = useState<PricePoint[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cache = useRef<Partial<Record<ChartTab, any>>>({});

  const loadData = async (t: ChartTab) => {
    if (cache.current[t]) { const c = cache.current[t]; setData(c.data); setPrice(c.price); setChange(c.change); setLoading(false); return; }
    setLoading(true); setError(false);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/the-open-network/market_chart?vs_currency=usd&days=${TAB_DAYS[t]}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const points: PricePoint[] = json.prices.map(([ts, p]: [number, number]) => ({ t: ts, p }));
      const first = points[0]?.p ?? 0, last = points[points.length - 1]?.p ?? 0;
      const pct = first ? ((last - first) / first) * 100 : 0;
      cache.current[t] = { data: points, price: last, change: pct };
      setData(points); setPrice(last); setChange(pct);
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(tab); }, [tab]);
  const isUp = change >= 0;
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {loading ? <div style={{ height: 22, width: 90, background: 'rgba(255,255,255,0.06)', borderRadius: 6, animationName: 'pulse', animationDuration: '2s', animationIterationCount: 'infinite' }} />
            : error ? <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Unavailable</span>
            : <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{price ? formatUSD(price) : "—"}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: isUp ? '#4ade80' : '#f87171' }}>
                  {isUp ? <TrendingUp style={{ width: 12, height: 12 }} /> : <TrendingDown style={{ width: 12, height: 12 }} />}
                  {Math.abs(change).toFixed(2)}%
                </div>
              </div>}
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2, fontWeight: 600, letterSpacing: '0.06em' }}>TON / USD</p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 3 }}>
          {(["1D","7D","30D","90D"] as ChartTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: tab === t ? 'rgba(59,130,246,0.25)' : 'transparent',
                color: tab === t ? '#60a5fa' : 'rgba(255,255,255,0.35)' }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ height: 100 }}>
        {loading ? <div style={{ height: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.2)' }} className="animate-spin" /></div>
          : error ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Chart unavailable</p></div>
          : <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["auto","auto"]} hide /><XAxis dataKey="t" hide />
                <Tooltip content={<ChartTooltip days={TAB_DAYS[tab]} />} />
                <Area type="monotone" dataKey="p" stroke={lineColor} strokeWidth={2} fill="url(#tg2)" dot={false} activeDot={{ r: 3, fill: lineColor }} />
              </AreaChart>
            </ResponsiveContainer>}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [cwalletId, setCwalletId] = useState("");
  const [axnAmount, setAxnAmount] = useState("");

  const { data: appSettings } = useQuery<any>({ queryKey: ['/api/app-settings'], staleTime: 30000 });
  const { data: user } = useQuery<any>({ queryKey: ['/api/auth/user'], staleTime: 0 });

  const MIN_TRADE = appSettings?.minTradeAmount ?? 1000;
  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const axnNum = parseFloat(axnAmount) || 0;
  const tonReceive = axnNum * AXN_TO_TON;
  const hasInput = axnNum > 0 && cwalletId.trim();

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", { address: cwalletId.trim(), amount: axnAmount, method: "TON" });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Trade request submitted!", "success");
      setCwalletId(""); setAxnAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
    },
    onError: (error: any) => {
      let msg = "Trade failed";
      try { const t = error.message?.trim(); if (t?.startsWith("{")) { const p = JSON.parse(t); if (p.message) msg = p.message; } else if (t) msg = t; } catch {}
      showNotification(msg, "error");
    },
  });

  const handleTrade = () => {
    const amount = parseFloat(axnAmount);
    if (isNaN(amount) || amount <= 0) return showNotification("Enter a valid AXN amount", "error");
    if (amount < MIN_TRADE) return showNotification(`Minimum trade is ${MIN_TRADE.toLocaleString()} AXN`, "error");
    if (amount > satBalance) return showNotification(`Insufficient balance. Available: ${satBalance.toLocaleString()} AXN`, "error");
    if (!cwalletId.trim()) return showNotification("Enter your Cwallet ID", "error");
    tradeMutation.mutate();
  };

  return (
    <Layout>
      <Header />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', paddingTop: 64, paddingBottom: 76 }}>

        {/* Page title */}
        <div style={{ padding: '14px 16px 12px', flexShrink: 0 }}>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: 0, letterSpacing: 0.5 }}>Wallet</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>Trade AXN for TON · 100,000 AXN = 1 TON</p>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* TON Price chart card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, padding: '14px 16px' }}>
            <TonPriceChart />
          </div>

          {/* Balance card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>Available Balance</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <AXNIcon size={16} />
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{satBalance.toLocaleString()}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700 }}>AXN</span>
            </div>
          </div>

          {/* AXN Amount */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AXN Amount</label>
            <div style={{ position: 'relative' }}>
              <input type="number" placeholder="0" value={axnAmount} onChange={e => setAxnAmount(e.target.value)}
                style={{ width: '100%', height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.18)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '0 72px 0 16px', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={() => setAxnAmount(satBalance.toString())}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', height: 32, padding: '0 12px', borderRadius: 8, background: 'linear-gradient(135deg,#0847c8,#0a52d4)', color: '#fff', fontWeight: 900, fontSize: 11, cursor: 'pointer', border: 'none' }}>MAX</button>
            </div>
          </div>

          {/* Cwallet ID */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cwallet ID</label>
            <input type="text" placeholder="Enter your Cwallet ID" value={cwalletId} onChange={e => setCwalletId(e.target.value)}
              style={{ width: '100%', height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.18)', color: '#fff', fontWeight: 500, fontSize: 14, padding: '0 16px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Conversion preview */}
          {axnNum > 0 && (
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>You receive</span>
              <span style={{ color: '#60a5fa', fontWeight: 900, fontSize: 15 }}>{formatTON(tonReceive)} TON</span>
            </div>
          )}

          {/* Trade button */}
          <button onClick={handleTrade} disabled={tradeMutation.isPending}
            style={{ width: '100%', height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#0847c8 0%,#1560e0 50%,#0a52d4 100%)', border: '1px solid rgba(80,150,255,0.4)', color: '#fff', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 4px 24px rgba(20,80,220,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: tradeMutation.isPending ? 'not-allowed' : 'pointer', opacity: tradeMutation.isPending ? 0.6 : 1 }}>
            {tradeMutation.isPending ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
              : hasInput ? `Trade ${axnNum.toLocaleString()} AXN → ${formatTON(tonReceive)} TON`
              : "Trade AXN for TON"}
          </button>

        </div>
      </div>
    </Layout>
  );
}
