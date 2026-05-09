import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { showNotification } from "@/components/AppNotification";
import { Loader2, HelpCircle } from "lucide-react";
import { AXNIcon } from "@/components/AXNIcon";
import { RiExchangeFill, RiWalletFill, RiSendPlaneFill, RiCheckboxCircleFill } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";

interface WithdrawalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tonBalance: number;
}

const AXN_RATE = 0.000001;

function calcTON(axn: number): number {
  return axn * AXN_RATE;
}

function formatTON(n: number): string {
  if (n === 0) return "0.00000000";
  if (n < 0.001) return n.toFixed(8);
  if (n < 1) return n.toFixed(6);
  return n.toFixed(4);
}

export default function WithdrawalPopup({ open, onOpenChange }: WithdrawalPopupProps) {
  const queryClient = useQueryClient();
  const [cwalletId, setCwalletId] = useState("");
  const [axnAmount, setAxnAmount] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { data: appSettings } = useQuery<any>({ queryKey: ["/api/app-settings"], staleTime: 30000 });
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], staleTime: 0 });

  const MIN_TRADE = appSettings?.minTradeAmount ?? 500;
  const satBalance = Math.floor(parseFloat(user?.balance || "0"));
  const axnNum = parseFloat(axnAmount) || 0;
  const estimatedTON = calcTON(axnNum);

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
        const t = error.message?.trim();
        if (t?.startsWith("{")) {
          const p = JSON.parse(t);
          if (p.message) message = p.message;
        } else message = error.message || message;
      } catch {}
      showNotification(message, "error");
    },
  });

  const handleTrade = () => {
    const amount = parseFloat(axnAmount);
    if (isNaN(amount) || amount <= 0) { showNotification("Enter a valid AXN amount", "error"); return; }
    if (amount < MIN_TRADE) { showNotification(`Minimum trade is ${MIN_TRADE.toLocaleString()} AXN`, "error"); return; }
    if (amount > satBalance) { showNotification("Insufficient balance", "error"); return; }
    if (!cwalletId.trim()) { showNotification("Enter your Cwallet ID", "error"); return; }
    tradeMutation.mutate();
  };

  const howItWorksSteps = [
    {
      icon: <AXNIcon size={16} />,
      title: "Enter AXN Amount",
      desc: "Choose how much AXN you want to trade. Minimum is 500 AXN.",
    },
    {
      icon: <RiWalletFill className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />,
      title: "Enter Cwallet ID",
      desc: "Provide your Cwallet wallet address to receive TON.",
    },
    {
      icon: <RiSendPlaneFill className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-400" />,
      title: "Submit Trade Request",
      desc: "Your request is sent to admin for review. 100,000 AXN = 1 TON.",
    },
    {
      icon: <RiCheckboxCircleFill className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-400" />,
      title: "Receive TON",
      desc: "Once approved, TON is sent directly to your Cwallet address.",
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => onOpenChange(false)} />

          <motion.div
            className="relative w-full max-w-sm rounded-t-[28px] flex flex-col overflow-hidden"
            style={{
              background: "linear-gradient(180deg,#0c0f1e 0%,#060912 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderBottom: "none",
            }}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-9 h-[3px] rounded-full bg-white/15" />
            </div>

            <div className="px-5 pt-4 space-y-4"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>

              {/* Header */}
              <div className="flex items-center gap-3">
                <motion.img
                  src="/money-icon-nobg.png"
                  alt="Withdraw"
                  className="w-16 h-16 object-contain flex-shrink-0"
                  style={{ imageRendering: "pixelated" }}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.05 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-xl uppercase tracking-wide leading-none">WITHDRAW</p>
                  <p className="text-blue-400 font-black text-sm leading-none mt-0.5">TRADE AXN</p>
                  <p className="text-white/35 text-[11px] mt-1">100,000 AXN = 1 TON</p>
                </div>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Balance */}
              <div className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-white/40 text-xs font-semibold">Available Balance</span>
                <div className="flex items-center gap-2">
                  <AXNIcon size={16} />
                  <span className="text-white font-black text-base tabular-nums">{satBalance.toLocaleString()}</span>
                  <span className="text-white/35 text-xs font-bold">AXN</span>
                </div>
              </div>

              {/* AXN Amount */}
              <div className="space-y-1.5">
                <label className="text-white/35 text-[10px] font-black uppercase tracking-widest pl-1">AXN Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={axnAmount}
                    onChange={e => setAxnAmount(e.target.value)}
                    className="w-full h-12 rounded-xl px-4 pr-20 text-white font-bold text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <button
                    onClick={() => setAxnAmount(satBalance.toString())}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                    style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: "#fff" }}
                  >MAX</button>
                </div>
                {axnNum > 0 && (
                  <p className="text-white/35 text-[11px] pl-1">
                    ≈ <span className="text-blue-400 font-bold">{formatTON(estimatedTON)} TON</span>
                  </p>
                )}
              </div>

              {/* Cwallet ID */}
              <div className="space-y-1.5">
                <label className="text-white/35 text-[10px] font-black uppercase tracking-widest pl-1 block">Cwallet ID</label>
                <input
                  type="text"
                  placeholder="Enter your Cwallet ID"
                  value={cwalletId}
                  onChange={e => setCwalletId(e.target.value)}
                  className="w-full h-12 rounded-xl px-4 text-white font-medium text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              {/* Trade button */}
              <button
                onClick={handleTrade}
                disabled={tradeMutation.isPending}
                className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg,#1d4ed8,#1e40af)",
                  color: "#fff",
                  boxShadow: "0 0 22px rgba(29,78,216,0.3)",
                }}
              >
                {tradeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : axnNum > 0 && cwalletId.trim() ? (
                  `Trade ${axnNum.toLocaleString()} AXN → ${formatTON(estimatedTON)} TON`
                ) : (
                  <>
                    <RiExchangeFill className="w-4 h-4" />
                    Trade AXN for TON
                  </>
                )}
              </button>

              {/* How it works link */}
              <button
                onClick={() => setShowHowItWorks(true)}
                className="w-full flex items-center justify-center gap-1.5 text-white/25 text-xs py-1 active:text-white/40 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                How does it work?
              </button>

              {/* Close */}
              <button
                onClick={() => onOpenChange(false)}
                className="w-full h-11 rounded-2xl font-bold text-xs text-white/30 active:scale-[0.97] transition-transform"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* How It Works Modal — same style as InvitePopup */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowHowItWorks(false)}
            />
            <motion.div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden"
              style={{
                background: "rgba(8,14,32,0.72)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <div className="px-5 pt-5 pb-4 border-b border-[#1c1c1e]">
                <p className="text-white font-black text-sm uppercase tracking-wider">How Withdraw Works</p>
              </div>

              <div className="px-5 py-4 space-y-2.5">
                {howItWorksSteps.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.06] border border-white/5 rounded-2xl p-3.5 flex items-start gap-3"
                  >
                    {item.icon}
                    <div>
                      <p className="text-white text-xs font-bold">{item.title}</p>
                      <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white/40 transition-transform active:scale-[0.97]"
                  style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
