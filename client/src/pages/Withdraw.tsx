import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, TrendingUp, TrendingDown, ChevronLeft, HelpCircle } from "lucide-react";
import { RiExchangeFill } from "react-icons/ri";
import { AXNIcon } from "@/components/AXNIcon";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis,
} from "recharts";

declare global {
  interface Window {
    show_10401872?: (opts?: any) => Promise<void>;
  }
}

const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';

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

type Step = "main" | "summary" | "turbo";
type ChartTab = "1D" | "7D" | "30D" | "90D";
const TAB_DAYS: Record<ChartTab, number> = { "1D":1,"7D":7,"30D":30,"90D":90 };
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
function calcTON(axn: number, rating: number): number { return axn * rating * AXN_PER_TON_FACTOR; }
function formatTON(n: number): string {
  if (n === 0) return "0";
  if (n < 0.001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}
function formatUSD(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
function formatTimeLabel(ts: number, days: number): string {
  const d = new Date(ts);
  if (days <= 1) return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  return d.toLocaleDateString([], { month:"short", day:"numeric" });
}

const ChartTooltip = ({ active, payload, days }: any) => {
  if (active && payload?.length) {
    const val: number = payload[0].value;
    const ts: number = payload[0].payload?.t;
    return (
      <div style={{ background:'#1c1c1e', border:'1px solid rgba(0,120,255,0.2)', clipPath:CUT_SM, padding:'6px 10px' }}>
        <p style={{ color:'#fff', fontWeight:900, fontSize:10 }}>{formatUSD(val)}</p>
        {ts && <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, marginTop:2 }}>{formatTimeLabel(ts,days)}</p>}
      </div>
    );
  }
  return null;
};

function TonPriceChart() {
  const [tab, setTab] = useState<ChartTab>("1D");
  const [data, setData] = useState<PricePoint[]>([]);
  const [price, setPrice] = useState<number|null>(null);
  const [change, setChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cacheRef = useRef<Partial<Record<ChartTab,{data:PricePoint[];price:number;change:number}>>>({});

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
      const prices: [number,number][] = json.prices;
      if (!Array.isArray(prices)) throw new Error();
      const pts: PricePoint[] = prices.map(([ts,p]) => ({t:ts,p}));
      const first = pts[0]?.p ?? 0; const last = pts[pts.length-1]?.p ?? 0;
      const pct = first ? ((last-first)/first)*100 : 0;
      cacheRef.current[t] = {data:pts,price:last,change:pct};
      setData(pts); setPrice(last); setChange(pct); setLoading(false);
    } catch { setError(true); setLoading(false); }
  };

  useEffect(() => { loadData(tab); }, [tab]);
  const isUp = change >= 0;
  const lineColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          {loading ? (
            <div style={{ height:20, width:80, background:'rgba(255,255,255,0.05)', borderRadius:4 }} />
          ) : error ? (
            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>—</span>
          ) : (
            <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
              <span style={{ color:'#fff', fontWeight:900, fontSize:18, fontVariantNumeric:'tabular-nums' }}>{price ? formatUSD(price) : "—"}</span>
              <div style={{ display:'flex', alignItems:'center', gap:2, fontSize:11, fontWeight:900, color:isUp?'#4ade80':'#f87171' }}>
                {isUp ? <TrendingUp style={{width:11,height:11}} /> : <TrendingDown style={{width:11,height:11}} />}
                {Math.abs(change).toFixed(2)}%
              </div>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            <div style={{ width:16, height:16, borderRadius:'50%', background:'#0098EA', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:9, fontWeight:900 }}>T</span>
            </div>
            <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Toncoin (TON)</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.5)', borderRadius:10, padding:'3px' }}>
          {(["1D","7D","30D","90D"] as ChartTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'5px 9px', borderRadius:7, fontSize:10, fontWeight:900, cursor:'pointer', border:'none', transition:'all 0.15s',
                background: tab===t ? 'rgba(0,120,255,0.25)' : 'transparent',
                color: tab===t ? '#60a5fa' : 'rgba(255,255,255,0.3)',
              }}>{t}</button>
          ))}
        </div>
      </div>
      <div style={{ height:110 }}>
        {loading ? (
          <div style={{ height:'100%', background:'rgba(255,255,255,0.02)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Loader2 style={{width:16,height:16,color:'rgba(255,255,255,0.2)'}} className="animate-spin" />
          </div>
        ) : error ? (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <p style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>Chart unavailable</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{top:4,right:0,left:0,bottom:0}}>
              <defs>
                <linearGradient id="tonGradPage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={["auto","auto"]} hide />
              <XAxis dataKey="t" hide />
              <Tooltip content={<ChartTooltip days={TAB_DAYS[tab]} />} />
              <Area type="monotone" dataKey="p" stroke={lineColor} strokeWidth={1.5} fill="url(#tonGradPage)" dot={false} activeDot={{r:3,fill:lineColor}} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p style={{ color:'rgba(255,255,255,0.18)', fontSize:9, textAlign:'center', fontWeight:600 }}>Powered by CoinGecko API</p>
    </div>
  );
}

function RatingBar({ rating }: { rating: number }) {
  const pct = (rating / RATING_MAX) * 100;
  return (
    <div>
      <div style={{ position:'relative', height:12, borderRadius:6, overflow:'hidden', background:'rgba(255,255,255,0.08)' }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`,
          background:'linear-gradient(90deg,#ef4444 0%,#f97316 35%,#eab308 65%,#22c55e 100%)',
          borderRadius:6, transition:'width 0.5s ease' }} />
        {Array.from({length:4}).map((_,i) => (
          <div key={i} style={{ position:'absolute', top:0, bottom:0, left:`${((i+1)/5)*100}%`, width:1.5, background:'rgba(0,0,0,0.5)' }} />
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontWeight:700 }}>0</span>
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:9, fontWeight:700 }}>10</span>
      </div>
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0 }),
};

export default function WithdrawPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("main");
  const [cwalletId, setCwalletId] = useState("");
  const [axnAmount, setAxnAmount] = useState("");
  const [rating, setRatingState] = useState<number>(getRating);
  const [turboLoading, setTurboLoading] = useState(false);
  const [ratingGain, setRatingGain] = useState<number|null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const { data: appSettings } = useQuery<any>({ queryKey:['/api/app-settings'], staleTime:30000 });
  const { data: user } = useQuery<any>({ queryKey:['/api/auth/user'], staleTime:0 });

  const MIN_TRADE = appSettings?.minTradeAmount ?? 1000;
  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const axnNum = parseFloat(axnAmount) || satBalance;
  const tonReceive = calcTON(axnNum, rating);

  const updateRating = (v: number) => { setRatingState(v); setRating(v); };

  const handleTurboRating = useCallback(async () => {
    if (turboLoading) return;
    setTurboLoading(true);
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
      setTurboLoading(false);
    }
  }, [turboLoading]);

  const tradeMutation = useMutation({
    mutationFn: async () => {
      const amount = axnNum > 0 ? axnNum : satBalance;
      const res = await apiRequest("POST", "/api/withdrawals", {
        address: cwalletId.trim(),
        amount: String(amount),
        method: "TON",
      });
      return res.json();
    },
    onSuccess: () => {
      showNotification("Trade request submitted successfully!", "success");
      setCwalletId(""); setAxnAmount(""); setStep("main");
      updateRating(0);
      queryClient.invalidateQueries({ queryKey:["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey:["/api/withdrawals"] });
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

  const handleConfirmTrade = () => {
    const amount = axnNum > 0 ? axnNum : satBalance;
    if (amount <= 0) { showNotification("Enter a valid AXN amount","error"); return; }
    if (amount < MIN_TRADE) { showNotification(`Minimum trade is ${MIN_TRADE.toLocaleString()} AXN`,"error"); return; }
    if (amount > satBalance) { showNotification(`Insufficient balance. Available: ${satBalance.toLocaleString()} AXN`,"error"); return; }
    if (!cwalletId.trim()) { showNotification("Please enter your Cwallet ID","error"); return; }
    tradeMutation.mutate();
  };

  const goBack = () => {
    if (step === "summary") { setStep("main"); return; }
    if (step === "turbo") { setStep("summary"); return; }
    setLocation("/game");
  };

  const stepDir = step === "main" ? -1 : 1;

  return (
    <div style={{
      position:'fixed', inset:0, background:'linear-gradient(180deg,#050e2c 0%,#03091a 100%)',
      display:'flex', flexDirection:'column', overflow:'hidden',
    }}>
      {/* Top glow border */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2,
        background:'linear-gradient(90deg,transparent,rgba(0,160,255,0.9),rgba(0,100,220,1),rgba(0,160,255,0.9),transparent)',
        boxShadow:'0 0 20px rgba(0,120,255,0.6)',
        zIndex:10,
      }} />

      {/* Corner accents */}
      {CORNER_ACCENTS.map((s,i) => (
        <div key={i} style={{ position:'absolute', ...s, background:'rgba(0,200,255,0.75)', zIndex:10, pointerEvents:'none' }} />
      ))}

      {/* Page header */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'16px 16px 12px',
        borderBottom:'1px solid rgba(0,120,255,0.18)',
        flexShrink:0, position:'relative', zIndex:5,
      }}>
        <button
          onClick={goBack}
          style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', borderRadius:8 }}
        >
          <ChevronLeft style={{width:22,height:22}} />
        </button>
        <AnimatePresence mode="wait">
          {step === "main" && (
            <motion.div key="h-main" initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}} transition={{duration:0.15}}>
              <p style={{ color:'#fff', fontWeight:900, fontSize:17 }}>Trade AXN</p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>Exchange AXN for TON</p>
            </motion.div>
          )}
          {step === "summary" && (
            <motion.div key="h-summary" initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}} transition={{duration:0.15}}>
              <p style={{ color:'#fff', fontWeight:900, fontSize:17 }}>Summary</p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>Transferring to Cwallet</p>
            </motion.div>
          )}
          {step === "turbo" && (
            <motion.div key="h-turbo" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flex:1}} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}} transition={{duration:0.15}}>
              <div>
                <p style={{ color:'#fff', fontWeight:900, fontSize:17 }}>Turbo Rating</p>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>Watch an ad to boost</p>
              </div>
              <button onClick={() => setShowHelp(h => !h)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:4, display:'flex', alignItems:'center' }}>
                <HelpCircle style={{width:18,height:18}} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative' }}>
        <AnimatePresence mode="wait" custom={stepDir}>

          {/* ── MAIN ── */}
          {step === "main" && (
            <motion.div key="main" custom={-1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{type:"tween",duration:0.22}}
              style={{ padding:'14px 16px 32px', display:'flex', flexDirection:'column', gap:12 }}
            >
              {/* TON header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:10, borderBottom:'1px solid rgba(0,120,255,0.18)' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#0098EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:'#fff', fontSize:18, fontWeight:900 }}>T</span>
                </div>
                <div>
                  <p style={{ color:'#fff', fontWeight:900, fontSize:16 }}>TON</p>
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>Toncoin</p>
                </div>
              </div>

              {/* Chart */}
              <div style={{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:'12px 14px' }}>
                <TonPriceChart />
              </div>

              {/* Wallet */}
              <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(0,120,255,0.18)', clipPath:CUT_SM, padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <div style={{ width:18, height:18, border:'1.5px solid rgba(255,255,255,0.35)', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:8, height:6, background:'rgba(255,255,255,0.5)', borderRadius:1 }} />
                  </div>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:700 }}>Wallet</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>Available Balance:</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <AXNIcon size={13} />
                    <span style={{ color:'#fff', fontWeight:900, fontSize:13, fontVariantNumeric:'tabular-nums' }}>{satBalance.toLocaleString()}</span>
                    <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600 }}>AXN</span>
                  </div>
                </div>
                <button
                  onClick={() => { if (satBalance < MIN_TRADE) return; setAxnAmount(satBalance.toString()); setStep("summary"); }}
                  disabled={satBalance < MIN_TRADE}
                  style={{
                    width:'100%', height:46, clipPath:CUT_SM,
                    background: satBalance < MIN_TRADE
                      ? 'rgba(255,255,255,0.05)'
                      : 'linear-gradient(135deg,#0098EA,#0066cc)',
                    border: satBalance < MIN_TRADE ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    color: satBalance < MIN_TRADE ? 'rgba(255,255,255,0.3)' : '#fff',
                    fontWeight:900, fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    cursor: satBalance < MIN_TRADE ? 'not-allowed' : 'pointer',
                    letterSpacing:0.3,
                    boxShadow: satBalance < MIN_TRADE ? 'none' : '0 0 20px rgba(0,152,234,0.5)',
                  }}
                >
                  {satBalance < MIN_TRADE ? (
                    <>⚠ Minimum {MIN_TRADE.toLocaleString()} AXN required</>
                  ) : (
                    <>
                      <div style={{ width:18, height:18, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:10, fontWeight:900 }}>T</span>
                      </div>
                      Trade AXN for TON
                    </>
                  )}
                </button>
                {satBalance < MIN_TRADE && (
                  <p style={{ color:'rgba(255,100,100,0.7)', fontSize:11, textAlign:'center', marginTop:4 }}>
                    Aapke paas {satBalance.toLocaleString()} AXN hai — {(MIN_TRADE - satBalance).toLocaleString()} AXN aur chahiye
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SUMMARY ── */}
          {step === "summary" && (
            <motion.div key="summary" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{type:"tween",duration:0.22}}
              style={{ padding:'14px 16px 32px', display:'flex', flexDirection:'column', gap:12 }}
            >
              {/* Cwallet ID */}
              <div style={{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:'10px 14px' }}>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Cwallet</p>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#0847c8,#0a52d4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <RiExchangeFill style={{width:14,height:14,color:'#fff'}} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:10, marginBottom:2 }}>Cwallet ID</p>
                    <input
                      type="text" placeholder="Enter your Cwallet ID"
                      value={cwalletId} onChange={e => setCwalletId(e.target.value)}
                      style={{ width:'100%', height:32, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(0,120,255,0.2)', borderRadius:6, color:'#fff', fontSize:12, padding:'0 10px', outline:'none', boxSizing:'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* AXN Amount */}
              <div style={{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>AXN Amount</p>
                    <p style={{ color:'#fff', fontWeight:900, fontSize:14, marginTop:2 }}>{axnNum.toLocaleString()} AXN</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <AXNIcon size={26} />
                    <button
                      onClick={() => setAxnAmount(satBalance.toString())}
                      style={{ fontSize:9, fontWeight:900, color:'#60a5fa', background:'rgba(0,120,255,0.1)', border:'1px solid rgba(0,120,255,0.25)', borderRadius:4, padding:'2px 6px', cursor:'pointer', letterSpacing:'0.06em', textTransform:'uppercase' }}
                    >MAX</button>
                  </div>
                </div>
                <div style={{ marginTop:8 }}>
                  <input
                    type="number" placeholder={`Max: ${satBalance.toLocaleString()}`}
                    value={axnAmount} onChange={e => setAxnAmount(e.target.value)}
                    style={{ width:'100%', height:32, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(0,120,255,0.2)', borderRadius:6, color:'#fff', fontSize:12, padding:'0 10px', outline:'none', boxSizing:'border-box' }}
                  />
                </div>
              </div>

              {/* Rating */}
              <div style={{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>AXN Rating</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <AnimatePresence>
                      {ratingGain !== null && (
                        <motion.span initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                          style={{color:'#4ade80',fontSize:11,fontWeight:900}}>+{ratingGain}</motion.span>
                      )}
                    </AnimatePresence>
                    <span style={{ color:'#fff', fontWeight:900, fontSize:18, fontVariantNumeric:'tabular-nums' }}>{rating.toFixed(2)}</span>
                    <button
                      onClick={() => setStep("turbo")}
                      style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
                    >
                      <div style={{ width:14, height:14, borderRadius:'50%', background:'conic-gradient(#ef4444 0deg,#f97316 72deg,#eab308 144deg,#22c55e 216deg,rgba(255,255,255,0.1) 216deg)' }}>
                        <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'rgba(0,0,0,0.5)', transform:'scale(0.5)', transformOrigin:'center' }} />
                      </div>
                    </button>
                  </div>
                </div>
                <RatingBar rating={rating} />
              </div>

              {/* TON Amount */}
              <div style={{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>You Receive</p>
                    <p style={{ color:'#fff', fontWeight:900, fontSize:14, marginTop:2, fontVariantNumeric:'tabular-nums' }}>{formatTON(tonReceive)} TON</p>
                  </div>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'#0098EA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#fff', fontSize:16, fontWeight:900 }}>T</span>
                  </div>
                </div>
              </div>

              {/* Confirm */}
              <button
                onClick={handleConfirmTrade}
                disabled={tradeMutation.isPending}
                style={{
                  width:'100%', height:50, clipPath:CUT_SM,
                  background:'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.1))',
                  border:'1px solid rgba(255,255,255,0.12)',
                  color:'#fff', fontWeight:900, fontSize:13,
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'0 16px', cursor:tradeMutation.isPending?'not-allowed':'pointer',
                  opacity:tradeMutation.isPending?0.6:1,
                }}
              >
                {tradeMutation.isPending ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8, margin:'0 auto' }}>
                    <Loader2 style={{width:16,height:16}} className="animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <>
                    <span style={{fontSize:12}}>Trade {axnNum.toLocaleString()} AXN for {formatTON(tonReceive)} TON</span>
                    <span style={{fontSize:18,color:'rgba(255,255,255,0.6)'}}>→</span>
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* ── TURBO RATING ── */}
          {step === "turbo" && (
            <motion.div key="turbo" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit"
              transition={{type:"tween",duration:0.22}}
              style={{ padding:'14px 16px 32px', display:'flex', flexDirection:'column', gap:14 }}
            >
              {/* Help */}
              <AnimatePresence>
                {showHelp && (
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
                    style={{ background:'rgba(0,120,255,0.08)', border:'1px solid rgba(0,120,255,0.2)', clipPath:CUT_SM, padding:'10px 14px' }}
                  >
                    <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, lineHeight:1.6 }}>
                      Your rating determines the TON rate you receive. A higher rating = more TON per AXN. Watch ads to increase your rating up to 10.0.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hero */}
              <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:16, textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(0,152,234,0.12) 0%,transparent 70%)', pointerEvents:'none' }} />
                <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', marginBottom:12, position:'relative', zIndex:1 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'radial-gradient(circle at 35% 35%,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 12px rgba(245,158,11,0.4)' }}>
                      <AXNIcon size={16} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:12, height:3, borderRadius:1, background:'#22c55e', opacity:0.8-i*0.25 }} />)}
                    </div>
                  </div>
                  {/* Gauge */}
                  <div style={{ width:72, height:72, borderRadius:'50%', border:'4px solid rgba(255,255,255,0.08)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.4)' }}>
                    <div style={{ position:'absolute', inset:4, borderRadius:'50%', background:'conic-gradient(#ef4444 0deg,#f97316 60deg,#eab308 120deg,rgba(255,255,255,0.05) 120deg)', clipPath:'polygon(50% 0%,100% 0%,100% 50%,50% 50%)' }} />
                    <div style={{ position:'relative', zIndex:1, width:10, height:28, background:'linear-gradient(180deg,#fff,rgba(255,255,255,0.3))', borderRadius:4, transformOrigin:'bottom center', transform:`rotate(${(rating/RATING_MAX)*120-60}deg)`, marginTop:-8 }} />
                    <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center' }}>
                      <span style={{ color:'#fff', fontSize:10, fontWeight:900 }}>{rating.toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'#0098EA', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 12px rgba(0,152,234,0.4)' }}>
                      <span style={{ color:'#fff', fontSize:14, fontWeight:900 }}>T</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:12, height:3, borderRadius:1, background:'#0098EA', opacity:0.8-i*0.25 }} />)}
                    </div>
                  </div>
                </div>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, position:'relative', zIndex:1 }}>
                  Current Rating: <span style={{ color:'#fff', fontWeight:900 }}>{rating.toFixed(2)}</span> / 10.0
                </p>
              </div>

              {/* Progress box */}
              <div style={{ background:'rgba(0,0,0,0.35)', border:'1px solid rgba(0,120,255,0.15)', clipPath:CUT_SM, padding:'12px 16px' }}>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Rating Progression</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, height:36, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#fff', fontWeight:900, fontSize:16 }}>{rating.toFixed(2)}</span>
                  </div>
                  <span style={{ color:'rgba(255,255,255,0.3)', fontSize:16 }}>→</span>
                  <div style={{ flex:1, height:36, background:'rgba(0,120,255,0.08)', border:'1px solid rgba(0,120,255,0.2)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ color:'#60a5fa', fontWeight:900, fontSize:16 }}>?</span>
                  </div>
                </div>
                <RatingBar rating={rating} />
              </div>

              {/* Watch Ad button */}
              <motion.button
                type="button"
                onClick={handleTurboRating}
                disabled={turboLoading || rating >= RATING_MAX}
                whileTap={{ scale: 0.97 }}
                style={{
                  width:'100%', height:58, borderRadius:14,
                  background: rating >= RATING_MAX
                    ? 'rgba(34,197,94,0.12)'
                    : turboLoading
                      ? 'rgba(0,120,255,0.2)'
                      : 'linear-gradient(135deg,#0055cc,#0088ee)',
                  border: `1.5px solid ${rating >= RATING_MAX ? 'rgba(34,197,94,0.4)' : turboLoading ? 'rgba(0,120,255,0.3)' : 'rgba(0,150,255,0.6)'}`,
                  color: rating >= RATING_MAX ? '#4ade80' : '#fff',
                  fontWeight:900, fontSize:15, letterSpacing:'0.03em',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  cursor: (turboLoading || rating >= RATING_MAX) ? 'not-allowed' : 'pointer',
                  boxShadow: (!turboLoading && rating < RATING_MAX) ? '0 0 24px rgba(0,136,238,0.45)' : 'none',
                  transition:'background 0.2s, border-color 0.2s, box-shadow 0.2s',
                  touchAction:'manipulation',
                }}
              >
                {turboLoading ? (
                  <><Loader2 style={{width:18,height:18}} className="animate-spin" /> Loading Ad...</>
                ) : rating >= RATING_MAX ? (
                  <>⚡ Max Rating Reached</>
                ) : (
                  <>▶&nbsp; Watch Ad to Boost Rating</>
                )}
              </motion.button>

              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:11, textAlign:'center', lineHeight:1.5 }}>
                Each ad boosts your rating by +0.5 to +1.5 points
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
