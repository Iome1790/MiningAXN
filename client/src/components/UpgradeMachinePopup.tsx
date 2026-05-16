import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronRight } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { showNotification } from "@/components/AppNotification";
import { apiRequest } from "@/lib/queryClient";

interface MachineState {
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRate: number;
  capacity: number;
  cpuDurationSec: number;
  upgMining: number;
  upgCapacity: number;
  upgCpu: number;
  balance: number;
}

interface UpgradeMachinePopupProps {
  onClose: () => void;
  initialSubView?: "mining" | "capacity" | "cpu";
}

type SubView = null | "mining" | "capacity" | "cpu";

/* Reusable cut-corner clip path sizes */
const CUT_SM = 'polygon(8px 0%,calc(100% - 8px) 0%,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0% calc(100% - 8px),0% 8px)';
const CUT_LG = 'polygon(14px 0%,calc(100% - 14px) 0%,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0% calc(100% - 14px),0% 14px)';

export default function UpgradeMachinePopup({ onClose, initialSubView }: UpgradeMachinePopupProps) {
  const [subView, setSubView] = useState<SubView>(initialSubView ?? null);
  const queryClient = useQueryClient();

  const { data: state } = useQuery<MachineState>({
    queryKey: ["/api/axn-mining/state"],
    retry: false,
    staleTime: 10000,
  });

  const invalidate = () => {
    queryClient.refetchQueries({ queryKey: ["/api/axn-mining/state"] });
    queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
  };

  const upgradeMutation = useMutation({
    mutationFn: (type: string) =>
      apiRequest("POST", "/api/axn-mining/upgrade", { type }).then((r) => r.json()),
    onSuccess: (d) => {
      showNotification(d.message, "success");
      invalidate();
      if (initialSubView) { onClose(); } else { setSubView(null); }
    },
    onError: (e: any) => showNotification(e.message || "Upgrade failed", "error"),
  });

  if (!state) return null;

  const canAffordMining   = state.balance >= state.upgMining;
  const canAffordCapacity = state.balance >= state.upgCapacity;
  const canAffordCpu      = state.balance >= state.upgCpu;

  const nextMiningRate = parseFloat((state.miningRate + 0.01).toFixed(2));
  const nextCapacity   = state.capacity + 24;
  const cpuMin         = Math.round(state.cpuDurationSec / 60);
  const nextCpuMin     = cpuMin + 30;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-center justify-center px-3"
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
          {/* Outer border — cut corners */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(0,160,255,0.75) 0%,rgba(0,80,200,0.45) 50%,rgba(0,160,255,0.75) 100%)',
            clipPath: CUT_LG,
            padding: '1.5px',
            boxShadow: '0 0 32px rgba(0,120,255,0.45), 0 0 64px rgba(0,80,200,0.2)',
          }}>
            {/* Inner bg — cut corners */}
            <div style={{
              background: 'linear-gradient(180deg,rgba(5,16,44,0.99) 0%,rgba(3,9,26,0.99) 100%)',
              clipPath: CUT_LG,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Corner accent lines */}
              {[
                { top:'2px',    left:'14px',  width:'30px', height:'1.5px' },
                { top:'14px',   left:'2px',   width:'1.5px',height:'30px'  },
                { top:'2px',    right:'14px', width:'30px', height:'1.5px' },
                { top:'14px',   right:'2px',  width:'1.5px',height:'30px'  },
                { bottom:'2px', left:'14px',  width:'30px', height:'1.5px' },
                { bottom:'14px',left:'2px',   width:'1.5px',height:'30px'  },
                { bottom:'2px', right:'14px', width:'30px', height:'1.5px' },
                { bottom:'14px',right:'2px',  width:'1.5px',height:'30px'  },
              ].map((s,i) => (
                <div key={i} className="absolute pointer-events-none" style={{ ...s, background:'rgba(0,200,255,0.75)', zIndex:10 }} />
              ))}

              <AnimatePresence mode="wait">
                {/* ── MAIN MENU ── */}
                {!subView && (
                  <motion.div key="main"
                    initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}
                    transition={{ duration:0.15 }}
                  >
                    <div className="flex items-center gap-4 px-5 pt-5 pb-4">
                      <motion.div initial={{ scale:0.5,opacity:0 }} animate={{ scale:1,opacity:1 }}
                        transition={{ type:"spring", damping:14, stiffness:260, delay:0.06 }}>
                        <img src="/upgrade-icon.png" alt="Upgrade" className="w-16 h-16 object-contain" style={{ imageRendering:"pixelated" }} />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-white font-black text-[22px] uppercase leading-none tracking-wide">UPGRADE</p>
                        <p className="text-purple-400 font-black text-base leading-none mt-0.5">MACHINE</p>
                        <div className="flex items-center gap-1 mt-2">
                          <AXNIcon size={12} />
                          <span className="text-white/40 text-xs">Balance: {state.balance.toFixed(2)} AXN</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px mx-5" style={{ background:'rgba(0,120,255,0.22)' }} />

                    <div className="px-5 py-4 space-y-2">
                      <UpgradeRow iconSrc="/axn-icon-speed.png" iconBg="rgba(139,92,246,0.15)" iconBorder="rgba(139,92,246,0.35)"
                        label="Mining Speed" sublabel="Earn more AXN per second" level={state.miningLevel} levelColor="#c084fc"
                        isMax={state.miningLevel >= 25} onClick={() => setSubView("mining")} />
                      <UpgradeRow iconSrc="/axn-icon-capacity.png" iconBg="rgba(245,158,11,0.15)" iconBorder="rgba(245,158,11,0.35)"
                        label="Capacity" sublabel="Store more AXN before collecting" level={state.capacityLevel} levelColor="#fbbf24"
                        isMax={state.capacityLevel >= 25} onClick={() => setSubView("capacity")} />
                      <UpgradeRow iconSrc="/axn-icon-cpu.png" iconBg="rgba(59,130,246,0.15)" iconBorder="rgba(59,130,246,0.35)"
                        label="CPU Duration" sublabel="Mine longer each session" level={state.cpuLevel} levelColor="#60a5fa"
                        isMax={state.cpuLevel >= 25} onClick={() => setSubView("cpu")} />

                      {/* Close — cut corners */}
                      <button onClick={onClose}
                        className="w-full h-10 font-bold text-sm text-white/35 active:scale-[0.97] transition-transform uppercase tracking-wider"
                        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', clipPath:CUT_SM }}>
                        Close
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── DETAIL VIEWS ── */}
                {subView === "mining" && (
                  <UpgradeDetail key="mining"
                    iconSrc="/axn-icon-speed.png" iconBg="rgba(139,92,246,0.18)" iconBorder="rgba(139,92,246,0.55)"
                    accentColor="#c084fc" title="MINING" subtitle="SPEED"
                    currentValue={`${state.miningRate}/s`} nextValue={`${nextMiningRate}/s`}
                    boostLabel={`+${(nextMiningRate - state.miningRate).toFixed(2)}/s BOOST`}
                    currentLevel={state.miningLevel} nextLevel={state.miningLevel + 1}
                    cost={state.upgMining} canAfford={canAffordMining}
                    isMax={state.miningLevel >= 25} isPending={upgradeMutation.isPending}
                    warriorSrc="/axn-warrior-mining-nobg.png"
                    onUpgrade={() => upgradeMutation.mutate("mining")}
                    onBack={() => initialSubView ? onClose() : setSubView(null)} />
                )}
                {subView === "capacity" && (
                  <UpgradeDetail key="capacity"
                    iconSrc="/axn-icon-capacity.png" iconBg="rgba(245,158,11,0.18)" iconBorder="rgba(245,158,11,0.55)"
                    accentColor="#fbbf24" title="CAPACITY" subtitle="STORAGE"
                    currentValue={`${state.capacity} AXN`} nextValue={`${nextCapacity} AXN`}
                    boostLabel="+24 AXN BOOST"
                    currentLevel={state.capacityLevel} nextLevel={state.capacityLevel + 1}
                    cost={state.upgCapacity} canAfford={canAffordCapacity}
                    isMax={state.capacityLevel >= 25} isPending={upgradeMutation.isPending}
                    warriorSrc="/axn-warrior-capacity-nobg.png"
                    onUpgrade={() => upgradeMutation.mutate("capacity")}
                    onBack={() => initialSubView ? onClose() : setSubView(null)} />
                )}
                {subView === "cpu" && (
                  <UpgradeDetail key="cpu"
                    iconSrc="/axn-icon-cpu.png" iconBg="rgba(59,130,246,0.18)" iconBorder="rgba(59,130,246,0.55)"
                    accentColor="#60a5fa" title="CPU" subtitle="DURATION"
                    currentValue={`${cpuMin}m`} nextValue={`${nextCpuMin}m`}
                    boostLabel="+30m BOOST"
                    currentLevel={state.cpuLevel} nextLevel={state.cpuLevel + 1}
                    cost={state.upgCpu} canAfford={canAffordCpu}
                    isMax={state.cpuLevel >= 25} isPending={upgradeMutation.isPending}
                    warriorSrc="/axn-warrior-nobg.png"
                    onUpgrade={() => upgradeMutation.mutate("cpu")}
                    onBack={() => initialSubView ? onClose() : setSubView(null)} />
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────── UpgradeRow ─────────────────────────── */
interface UpgradeRowProps {
  iconSrc: string; iconBg: string; iconBorder: string;
  label: string; sublabel: string; level: number; levelColor: string;
  isMax: boolean; onClick: () => void;
}
function UpgradeRow({ iconSrc, iconBg, iconBorder, label, sublabel, level, levelColor, isMax, onClick }: UpgradeRowProps) {
  return (
    <button onClick={onClick} disabled={isMax}
      className="w-full text-left active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-3 px-3 py-3"
      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', clipPath:CUT_SM }}>
      <div className="w-11 h-11 flex items-center justify-center flex-shrink-0"
        style={{ background:iconBg, border:`1.5px solid ${iconBorder}` }}>
        <img src={iconSrc} alt={label} className="w-10 h-10 object-contain" style={{ imageRendering:"pixelated" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white text-sm font-bold">{label}</span>
          <span className="text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wide"
            style={{ color:levelColor, background:`${levelColor}18` }}>
            {isMax ? "MAX" : `Lv.${level}`}
          </span>
        </div>
        <p className="text-white/35 text-xs">{sublabel}</p>
      </div>
      {!isMax && <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
    </button>
  );
}

/* ─────────────────────────────── SegmentBar ─────────────────────────────── */
function SegmentBar({ fill, color, segments = 7 }: { fill: number; color: string; segments?: number }) {
  const filled = Math.round(fill * segments);
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: segments }).map((_, i) => (
        <div key={i} className="h-[5px] flex-1" style={{
          background: i < filled ? color : 'rgba(255,255,255,0.1)',
          boxShadow: i < filled ? `0 0 4px ${color}99` : 'none',
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────── UpgradeDetail ──────────────────────────── */
interface UpgradeDetailProps {
  iconSrc: string; iconBg: string; iconBorder: string;
  accentColor: string; title: string; subtitle: string;
  currentValue: string; nextValue: string; boostLabel: string;
  currentLevel: number; nextLevel: number;
  cost: number; canAfford: boolean; isMax: boolean; isPending: boolean;
  warriorSrc: string;
  onUpgrade: () => void; onBack: () => void;
}

function UpgradeDetail({
  iconSrc, iconBg, iconBorder, accentColor,
  title, subtitle, currentValue, nextValue, boostLabel,
  currentLevel, nextLevel, cost, canAfford, isMax, isPending,
  warriorSrc, onUpgrade, onBack,
}: UpgradeDetailProps) {
  const currentFill = currentLevel / 25;
  const nextFill    = nextLevel   / 25;

  return (
    <motion.div
      initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:16 }}
      transition={{ duration:0.15 }}
      style={{ position:'relative', overflow:'hidden' }}
    >
      {/* ── Warrior image — large, top-right, shifted up to show face ── */}
      <div style={{
        position:'absolute', top:0, right:0,
        width:'55%', height:'220px',
        zIndex:0, pointerEvents:'none', overflow:'hidden',
      }}>
        <img src={warriorSrc} alt="warrior"
          style={{
            position:'absolute',
            top:'-18%',   /* shift up so character face/torso is prominent */
            right:'-4%',
            width:'115%',
            height:'115%',
            objectFit:'contain',
            objectPosition:'top center',
            filter:[
              'drop-shadow(0 0 8px rgba(0,220,255,0.95))',
              'drop-shadow(0 0 20px rgba(0,160,255,0.85))',
              'drop-shadow(0 0 40px rgba(0,100,220,0.7))',
              'drop-shadow(0 0 60px rgba(0,60,200,0.5))',
            ].join(' '),
          }}
        />
        {/* Gradient fades — left & bottom */}
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to right, rgba(5,16,44,1) 0%, rgba(5,16,44,0.55) 28%, transparent 62%)' }} />
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to top, rgba(5,16,44,1) 0%, transparent 50%)' }} />
      </div>

      {/* ── Header: icon LEFT + title text RIGHT-OF-ICON (same row) ── */}
      <div style={{ position:'relative', zIndex:1, padding:'20px 20px 12px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'14px' }}>

          {/* Icon — NO box, full-size image, no glow */}
          <motion.img
            src={iconSrc} alt={title}
            initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }}
            transition={{ type:'spring', damping:14, stiffness:260, delay:0.05 }}
            style={{
              width:'90px', height:'90px', flexShrink:0,
              objectFit:'contain', imageRendering:'pixelated',
            }}
          />

          {/* Title block to the RIGHT of icon */}
          <div style={{ flex:1, paddingTop:'4px' }}>
            <p style={{ color:'#fff', fontWeight:900, fontSize:'26px', lineHeight:1, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              {title}
            </p>
            <p style={{ color:accentColor, fontWeight:900, fontSize:'13px', lineHeight:1, marginTop:'3px', letterSpacing:'0.12em' }}>
              {subtitle}
            </p>
            {/* Level */}
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'10px' }}>
              <span style={{ color:'rgba(255,255,255,0.6)', fontWeight:900, fontSize:'16px' }}>Lv.{currentLevel}</span>
              <span style={{ color:accentColor, fontWeight:900, fontSize:'14px' }}>→</span>
              <span style={{ color:accentColor, fontWeight:900, fontSize:'16px' }}>Lv.{nextLevel}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height:'1px', margin:'0 20px', background:'rgba(0,120,255,0.2)' }} />

      {/* ── Stats + Buttons ── */}
      <div style={{ position:'relative', zIndex:1, padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px' }}>

        {/* Progress card — cut corners */}
        <div style={{
          background:'rgba(0,0,0,0.55)',
          border:'1px solid rgba(0,120,255,0.2)',
          clipPath: CUT_SM,
          padding:'14px 16px',
        }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'start', gap:'8px' }}>
            {/* Current */}
            <div>
              <p style={{ color:'#fff', fontWeight:900, fontSize:'18px', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                {currentValue}
              </p>
              <div style={{ marginTop:'8px' }}>
                <SegmentBar fill={currentFill} color="rgba(80,160,255,0.9)" />
              </div>
            </div>

            {/* Arrow + boost */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:'2px' }}>
              <span style={{ color:accentColor, fontWeight:900, fontSize:'20px' }}>→</span>
              <span style={{ color:'#22c55e', fontWeight:900, fontSize:'10px', marginTop:'10px', whiteSpace:'nowrap' }}>
                ↑ {boostLabel} ↑
              </span>
            </div>

            {/* Next */}
            <div style={{ textAlign:'right' }}>
              <p style={{ color:accentColor, fontWeight:900, fontSize:'18px', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                {nextValue}
              </p>
              <div style={{ marginTop:'8px' }}>
                <SegmentBar fill={nextFill} color={accentColor} />
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade button — cut corners, electric blue */}
        {isMax ? (
          <div style={{
            height:'52px', display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
            clipPath: CUT_SM,
          }}>
            <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'13px', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Maximum Level Reached
            </span>
          </div>
        ) : (
          <button onClick={onUpgrade} disabled={isPending || !canAfford}
            style={{
              width:'100%', height:'52px',
              clipPath: CUT_SM,
              background: canAfford
                ? 'linear-gradient(135deg,#0847c8 0%,#1560e0 40%,#0a52d4 100%)'
                : 'rgba(255,255,255,0.05)',
              border: canAfford ? '1px solid rgba(80,150,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: canAfford ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: canAfford ? '0 0 28px rgba(20,80,220,0.7), inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
              fontWeight:900, fontSize:'14px', textTransform:'uppercase', letterSpacing:'0.08em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
              cursor: (isPending || !canAfford) ? 'not-allowed' : 'pointer',
              opacity: (isPending || !canAfford) ? 0.5 : 1,
              transition:'all 0.15s', position:'relative', overflow:'hidden',
            }}
          >
            {canAfford && (
              <div style={{
                position:'absolute', inset:0, pointerEvents:'none',
                background:'radial-gradient(ellipse at 50% -10%,rgba(100,180,255,0.18) 0%,transparent 70%)',
              }} />
            )}
            {isPending ? <Loader2 style={{ width:20, height:20 }} className="animate-spin" />
              : <><AXNIcon size={22} /> UPGRADE · {cost} AXN</>}
          </button>
        )}

        {/* Back button — cut corners */}
        <button onClick={onBack}
          style={{
            width:'100%', height:'40px',
            clipPath: CUT_SM,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.08)',
            color:'rgba(255,255,255,0.4)',
            fontWeight:700, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.1em',
            cursor:'pointer', transition:'transform 0.12s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform='scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform='scale(1)')}
        >
          ← BACK
        </button>
      </div>
    </motion.div>
  );
}
