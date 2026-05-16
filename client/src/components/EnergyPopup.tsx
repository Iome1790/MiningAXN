import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { BsLightningChargeFill } from "react-icons/bs";
import { RiTv2Fill } from "react-icons/ri";
import { FaHourglassHalf } from "react-icons/fa";
import { AXNIcon } from "@/components/AXNIcon";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

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

const ENERGY_FREE_COOLDOWN_KEY = "energy_free_used_at";
const COOLDOWN_MS = 35 * 60 * 1000;

function getRemainingCooldown(): number {
  const stored = localStorage.getItem(ENERGY_FREE_COOLDOWN_KEY);
  if (!stored) return 0;
  const diff = COOLDOWN_MS - (Date.now() - parseInt(stored, 10));
  return Math.max(0, Math.floor(diff / 1000));
}

function formatCooldown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface EnergyPopupProps {
  energyCost: number;
  balance: number;
  onClose: () => void;
}

export default function EnergyPopup({ energyCost, balance, onClose }: EnergyPopupProps) {
  const queryClient = useQueryClient();
  const [cooldown, setCooldown] = useState(getRemainingCooldown);
  const [adWatching, setAdWatching] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      const remaining = getRemainingCooldown();
      setCooldown(remaining);
      if (remaining <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const applyEnergyRefill = (deductCost = 0) => {
    queryClient.setQueryData<any>(["/api/axn-mining/state"], (old: any) =>
      old ? { ...old, hasEnergy: true } : old
    );
    if (deductCost > 0) {
      queryClient.setQueryData<any>(["/api/auth/user"], (old: any) => {
        if (!old) return old;
        const newBal = Math.max(0, parseFloat(old.balance || "0") - deductCost);
        return { ...old, balance: String(Math.round(newBal)) };
      });
    }
  };

  const paidMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy").then((r) => r.json()),
    onSuccess: (d) => { showNotification(d.message || "Energy refilled!", "success"); applyEnergyRefill(energyCost); invalidate(); onClose(); },
    onError: (e: any) => showNotification(e.message || "Failed", "error"),
  });

  const freeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/axn-mining/refill-energy-free").then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message || "Energy refilled for free!", "success");
      localStorage.setItem(ENERGY_FREE_COOLDOWN_KEY, String(Date.now()));
      setCooldown(COOLDOWN_MS / 1000);
      applyEnergyRefill(0); invalidate(); onClose();
    },
    onError: (e: any) => {
      if (e.message?.includes("endpoint") || e.message?.includes("not found")) paidMutation.mutate();
      else showNotification(e.message || "Failed", "error");
    },
  });

  const handleFreeRefill = async () => {
    if (adWatching) return;
    setAdWatching(true);
    try {
      if (typeof (window as any).show_10963365 === "function") {
        try { await (window as any).show_10963365(); } catch {}
      }
      freeMutation.mutate();
    } catch { showNotification("Ad failed. Try again.", "error"); }
    finally { setAdWatching(false); }
  };

  const canAfford = balance >= energyCost;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[500] flex items-center justify-center px-3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative w-full max-w-sm"
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
            }}>
              {CORNER_ACCENTS.map((s, i) => (
                <div key={i} className="absolute pointer-events-none"
                  style={{ ...s, background: 'rgba(0,200,255,0.75)', zIndex: 10 }} />
              ))}

              {/* Warrior — top-right */}
              <div style={{ position:'absolute', top:0, right:0, width:'55%', height:'210px', zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
                <img src="/axn-warrior-attack-nobg.png" alt="warrior"
                  style={{
                    position:'absolute', top:'-10%', right:'-4%',
                    width:'115%', height:'115%',
                    objectFit:'contain', objectPosition:'top center',
                    filter:[
                      'drop-shadow(0 0 8px rgba(0,220,255,0.95))',
                      'drop-shadow(0 0 20px rgba(0,160,255,0.85))',
                      'drop-shadow(0 0 40px rgba(0,100,220,0.7))',
                      'drop-shadow(0 0 60px rgba(0,60,200,0.5))',
                    ].join(' '),
                  }}
                />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(5,16,44,1) 0%,rgba(5,16,44,0.55) 28%,transparent 62%)' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(5,16,44,1) 0%,transparent 50%)' }} />
              </div>

              {/* Header */}
              <div style={{ position:'relative', zIndex:1, padding:'20px 20px 14px', display:'flex', alignItems:'flex-start', gap:'6px' }}>
                <motion.img src="/icon-energy.png" alt="Energy"
                  initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }}
                  transition={{ type:'spring', damping:14, stiffness:260, delay:0.06 }}
                  style={{ width:88, height:88, objectFit:'contain', flexShrink:0 }}
                />
                <div style={{ flex:1, paddingTop:'4px' }}>
                  <p style={{ color:'#fff', fontWeight:900, fontSize:'26px', lineHeight:1, textTransform:'uppercase', letterSpacing:'0.05em' }}>ENERGY</p>
                  <p style={{ color:'#facc15', fontWeight:900, fontSize:'13px', lineHeight:1, marginTop:'3px', letterSpacing:'0.12em' }}>RECHARGE</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'10px' }}>
                    <BsLightningChargeFill style={{ color:'#f87171', width:14, height:14 }} />
                    <span style={{ color:'#f87171', fontWeight:900, fontSize:'14px' }}>Empty</span>
                    <span style={{ color:'#facc15', fontWeight:900, fontSize:'14px' }}>→ Full ⚡</span>
                  </div>
                </div>
              </div>

              <div style={{ height:'1px', margin:'0 20px', background:'rgba(0,120,255,0.2)', position:'relative', zIndex:1 }} />

              <div style={{ position:'relative', zIndex:1, padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>

                <div style={{ background:'rgba(0,0,0,0.55)', border:'1px solid rgba(0,120,255,0.2)', clipPath:CUT_SM, padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:'rgba(255,255,255,0.4)', fontWeight:900, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Energy</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <span style={{ color:'#f87171', fontWeight:900, fontSize:'13px' }}>Empty</span>
                      <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'12px' }}>→</span>
                      <span style={{ color:'#facc15', fontWeight:900, fontSize:'13px' }}>Full ⚡</span>
                    </div>
                  </div>
                  <div style={{ height:'1px', background:'rgba(0,120,255,0.15)' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <FaHourglassHalf style={{ color:'#60a5fa', width:12, height:12 }} />
                      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'12px', fontWeight:700 }}>Free Cooldown</span>
                    </div>
                    {cooldown>0
                      ? <span style={{ color:'rgba(255,255,255,0.5)', fontWeight:900, fontSize:'13px', fontVariantNumeric:'tabular-nums' }}>{formatCooldown(cooldown)}</span>
                      : <span style={{ color:'#22c55e', fontWeight:900, fontSize:'13px' }}>Ready</span>}
                  </div>
                  <div style={{ height:'1px', background:'rgba(0,120,255,0.15)' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:'rgba(255,255,255,0.4)', fontWeight:900, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Cost</span>
                    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                      <AXNIcon size={13} />
                      <span style={{ fontWeight:900, fontSize:'13px', color:canAfford?'#F5C542':'#f87171', fontVariantNumeric:'tabular-nums' }}>{energyCost} AXN</span>
                    </div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                  <button onClick={handleFreeRefill}
                    disabled={cooldown>0||adWatching||freeMutation.isPending}
                    style={{ height:'52px', clipPath:CUT_SM, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', color:'white', fontWeight:900, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', cursor:(cooldown>0||adWatching||freeMutation.isPending)?'not-allowed':'pointer', opacity:(cooldown>0||adWatching||freeMutation.isPending)?0.5:1, transition:'all 0.15s' }}
                  >
                    {freeMutation.isPending||adWatching ? <Loader2 style={{width:16,height:16}} className="animate-spin" />
                      : cooldown>0 ? <><FaHourglassHalf style={{width:14,height:14,color:'rgba(255,255,255,0.3)'}} /> {formatCooldown(cooldown)}</>
                      : <><RiTv2Fill style={{width:16,height:16,color:'#60a5fa'}} /> AD FREE</>}
                  </button>
                  <button onClick={()=>paidMutation.mutate()}
                    disabled={paidMutation.isPending||!canAfford}
                    style={{ height:'52px', clipPath:CUT_SM, background:canAfford?'linear-gradient(135deg,#0847c8 0%,#1560e0 40%,#0a52d4 100%)':'rgba(255,255,255,0.05)', border:canAfford?'1px solid rgba(80,150,255,0.5)':'1px solid rgba(255,255,255,0.08)', color:canAfford?'#fff':'rgba(255,255,255,0.3)', boxShadow:canAfford?'0 0 28px rgba(20,80,220,0.7),inset 0 1px 0 rgba(255,255,255,0.18)':'none', fontWeight:900, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', cursor:(paidMutation.isPending||!canAfford)?'not-allowed':'pointer', opacity:(paidMutation.isPending||!canAfford)?0.5:1, transition:'all 0.15s' }}
                  >
                    {paidMutation.isPending ? <Loader2 style={{width:16,height:16}} className="animate-spin" /> : <><AXNIcon size={18}/> {energyCost} AXN</>}
                  </button>
                </div>

                <button onClick={onClose}
                  style={{ width:'100%', height:'40px', clipPath:CUT_SM, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', fontWeight:700, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.1em', cursor:'pointer', transition:'transform 0.12s' }}
                  onMouseDown={e=>(e.currentTarget.style.transform='scale(0.97)')}
                  onMouseUp={e=>(e.currentTarget.style.transform='scale(1)')}
                >← CLOSE</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
