import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Wifi, CalendarDays, Receipt, Zap, ChevronRight, Check, ArrowLeft,
  TrendingUp, Activity, RefreshCw, Star, FileText, Lock, Info, Shield,
  Loader2, Clock, CheckCircle, XCircle,
} from "lucide-react";
import { RiBarChartFill } from "react-icons/ri";
import { FaReceipt, FaBalanceScale, FaCrown } from "react-icons/fa";
import { MdAddTask, MdLanguage, MdOutlineSupportAgent } from "react-icons/md";
import { BsQuestionCircleFill } from "react-icons/bs";
import { format } from "date-fns";
import { useAdmin } from "@/hooks/useAdmin";
import { useLocation } from "wouter";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/hooks/useLanguage";
import { showNotification } from "@/components/AppNotification";

interface MenuPopupProps {
  onClose: () => void;
  onOpenInvite?: () => void;
}

type Overlay = "transactions" | "stats" | "legal" | "terms" | "faq" | "language" | null;

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}
function fmtAge(days: number): string {
  if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  return `${days}d`;
}

export default function MenuPopup({ onClose, onOpenInvite }: MenuPopupProps) {
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const { language, setLanguage } = useLanguage();
  const [overlay, setOverlay] = useState<Overlay>(null);

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"], retry: false, staleTime: 60000 });
  const { data: txData, isLoading: txLoading } = useQuery<any>({
    queryKey: ["/api/withdrawals"], enabled: overlay === "transactions", retry: false,
  });
  const { data: projectStats } = useQuery<any>({
    queryKey: ["/api/project/stats"], enabled: overlay === "stats", retry: false, staleTime: 30000,
  });

  const withdrawals = txData?.withdrawals || [];
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const firstName: string = user?.firstName || user?.username || "User";
  const profileImageUrl: string | null =
    user?.profileImageUrl ||
    (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url) ||
    null;
  const initials = firstName.slice(0, 2).toUpperCase();
  const joinedAt = user?.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : null;

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("approved") || s?.includes("success") || s?.includes("paid")) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s?.includes("reject") || s?.includes("failed")) return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s?.includes("approved") || s?.includes("success") || s?.includes("paid")) return "text-green-400";
    if (s?.includes("reject") || s?.includes("failed")) return "text-red-400";
    return "text-yellow-400";
  };

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "#0a0a0a", border: "1px solid #1c1c1e" }}
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
      >
        {/*
          KEY TRICK:
          - Main menu is rendered normally (relative) → it sets the card's natural height
          - Sub-views are absolute inset-0 → they overlay in the exact same space
          - Card never resizes, no scroll on main menu
        */}
        <div className="relative">

          {/* ── MAIN MENU (sets card height) ── */}
          <div style={{ visibility: overlay ? "hidden" : "visible" }}>
            {/* Profile */}
            <div className="px-5 py-4 border-b border-[#1c1c1e]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-[#22252d]">
                  {profileImageUrl
                    ? <img src={profileImageUrl} alt={firstName} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : <span className="text-white font-black text-lg select-none">{initials}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm truncate">{firstName}</p>
                  {user?.username && <p className="text-white/40 text-xs mt-0.5">@{user.username}</p>}
                  {joinedAt && <p className="text-white/25 text-[10px] mt-0.5">Joined {joinedAt}</p>}
                </div>
              </div>
            </div>

            <div className="py-2">
              <MenuItem icon={<RiBarChartFill className="w-5 h-5 text-blue-400" />} label="Project Statistics" onClick={() => setOverlay("stats")} />
              <MenuItem icon={<MdLanguage className="w-5 h-5 text-purple-400" />} label="Language"
                right={<span className="text-white/50 text-sm">{currentLang.flag}</span>} onClick={() => setOverlay("language")} />
              <MenuItem icon={<FaReceipt className="w-5 h-5 text-yellow-400" />} label="Transactions" onClick={() => setOverlay("transactions")} />
              <MenuItem icon={<BsQuestionCircleFill className="w-5 h-5 text-sky-400" />} label="FAQs" onClick={() => setOverlay("faq")} />
              <MenuItem icon={<MdOutlineSupportAgent className="w-5 h-5 text-pink-400" />} label="Support" onClick={() => {
                const tg = (window as any).Telegram?.WebApp;
                if (tg?.openTelegramLink) tg.openTelegramLink("https://t.me/LightningSatoshi");
                else window.open("https://t.me/LightningSatoshi", "_blank");
              }} />
              <MenuItem icon={<FaBalanceScale className="w-5 h-5 text-indigo-400" />} label="Privacy Policy" onClick={() => setOverlay("legal")} />
              <MenuItem icon={<FileText className="w-5 h-5 text-orange-400" />} label="Terms and Conditions" onClick={() => setOverlay("terms")} />
              {isAdmin && (
                <>
                  <div className="mx-4 my-1 border-t border-white/5" />
                  <div className="px-4 py-1">
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-widest">Admin</p>
                  </div>
                  <MenuItem icon={<FaCrown className="w-5 h-5 text-yellow-400" />} label="Admin Panel"
                    onClick={() => { onClose(); setLocation("/admin"); }} />
                  <MenuItem icon={<MdAddTask className="w-5 h-5 text-yellow-300" />} label="Create Task"
                    onClick={() => { onClose(); setLocation("/task/create"); }} />
                </>
              )}
            </div>
          </div>

          {/* ── SUB-VIEWS (absolute overlay, same height as card) ── */}
          <AnimatePresence>
            {overlay !== null && (
              <motion.div
                key={overlay}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute inset-0 flex flex-col"
                style={{ background: "#0a0a0a" }}
              >
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto min-h-0">

                  {overlay === "language" && (
                    <div data-no-translate className="py-2">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <button key={lang.code}
                          onClick={() => { setLanguage(lang.code); showNotification(`Language changed to ${lang.label}`, "success"); setOverlay(null); }}
                          className={`w-full flex items-center justify-between px-5 py-3.5 active:bg-white/5 transition-all ${language === lang.code ? "bg-[#F5C542]/8" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl leading-none">{lang.flag}</span>
                            <span className={`text-sm font-bold ${language === lang.code ? "text-[#F5C542]" : "text-white"}`}>{lang.label}</span>
                          </div>
                          {language === lang.code && <Check className="w-4 h-4 text-[#F5C542]" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {overlay === "stats" && (
                    <div className="px-4 py-4 space-y-4">
                      {!projectStats ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
                      ) : (
                        <>
                          <StatSection label="Core">
                            <div className="grid grid-cols-2 gap-2">
                              <StatCard icon={<Users className="w-3.5 h-3.5 text-blue-400" />} label="Total Users" value={fmtNum(projectStats.totalUsers)} />
                              <StatCard icon={<Wifi className="w-3.5 h-3.5 text-green-400" />} label="Online Now" value={fmtNum(projectStats.onlineNow)} live />
                              <StatCard icon={<CalendarDays className="w-3.5 h-3.5 text-purple-400" />} label="Project Age" value={fmtAge(projectStats.projectAgeDays)} />
                              <StatCard icon={<TrendingUp className="w-3.5 h-3.5 text-yellow-400" />} label="Total Earned" value={`${fmtNum(projectStats.totalEarnings)} AXN`} />
                              <StatCard icon={<Receipt className="w-3.5 h-3.5 text-cyan-400" />} label="Withdrawn" value={`${fmtNum(projectStats.totalWithdrawalsAmount)} AXN`} wide />
                            </div>
                          </StatSection>
                          <StatSection label="Activity">
                            <div className="grid grid-cols-2 gap-2">
                              <StatCard icon={<Zap className="w-3.5 h-3.5 text-orange-400" />} label="Today Earned" value={`${fmtNum(projectStats.todayEarnings)} AXN`} wide />
                              <StatCard icon={<Activity className="w-3.5 h-3.5 text-blue-300" />} label="Daily Active" value={fmtNum(projectStats.dau)} />
                              <StatCard icon={<Activity className="w-3.5 h-3.5 text-indigo-400" />} label="Weekly Active" value={fmtNum(projectStats.wau)} />
                              <StatCard icon={<Users className="w-3.5 h-3.5 text-teal-400" />} label="Referrals" value={fmtNum(projectStats.totalReferrals)} />
                              <StatCard icon={<RefreshCw className="w-3.5 h-3.5 text-green-400" />} label="Uptime" value={`${projectStats.uptimePct}%`} />
                              <StatCard icon={<Star className="w-3.5 h-3.5 text-yellow-400" />} label="Retention" value={`${projectStats.retentionRate}%`} />
                            </div>
                          </StatSection>
                        </>
                      )}
                    </div>
                  )}

                  {overlay === "transactions" && (
                    <div className="px-4 py-4 space-y-2">
                      {txLoading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-white/30 animate-spin" /></div>
                      ) : withdrawals.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-white/20" strokeWidth={1.5} />
                          </div>
                          <p className="text-white/25 text-xs font-bold uppercase tracking-widest">No transactions yet</p>
                        </div>
                      ) : withdrawals.map((w: any) => (
                        <div key={w.id} className="bg-[#1a1c22] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">{getStatusIcon(w.status)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-black uppercase">{w.method || "Withdrawal"}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">{w.createdAt ? format(new Date(w.createdAt), "dd MMM yyyy") : "—"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-white text-sm font-black tabular-nums">{parseFloat(w.amount || "0").toLocaleString()} AXN</p>
                            <p className={`text-[10px] font-bold capitalize mt-0.5 ${getStatusColor(w.status)}`}>{w.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {overlay === "legal" && (
                    <div className="px-4 py-4 space-y-2.5">
                      <LegalBlock icon={<Lock className="w-3.5 h-3.5 text-purple-400" />} title="Data We Collect">
                        <p>Only minimum data: Telegram user ID, username, and first name. Used for account identification and reward delivery. We do not sell your data.</p>
                      </LegalBlock>
                      <LegalBlock icon={<Shield className="w-3.5 h-3.5 text-blue-400" />} title="How We Use It">
                        <p>Data is used exclusively to operate the app: tracking balance, processing rewards, withdrawals, and activity notifications.</p>
                      </LegalBlock>
                      <LegalBlock icon={<Info className="w-3.5 h-3.5 text-red-400" />} title="Your Rights">
                        <p>Request account deletion anytime via support. All data removed within 30 days.</p>
                      </LegalBlock>
                      <LegalBlock icon={<Info className="w-3.5 h-3.5 text-orange-400" />} title="Disclaimer">
                        <p>Not affiliated with Telegram Messenger Inc. Earnings are not guaranteed.</p>
                      </LegalBlock>
                    </div>
                  )}

                  {overlay === "terms" && (
                    <div className="px-4 py-4 space-y-2.5">
                      <LegalBlock icon={<FileText className="w-3.5 h-3.5 text-orange-400" />} title="Acceptance of Terms">
                        <p>By using this app, you agree to these Terms. All rewards are in AXN. Rates and minimums may change without notice.</p>
                      </LegalBlock>
                      <LegalBlock icon={<Shield className="w-3.5 h-3.5 text-blue-400" />} title="User Conduct">
                        <p>One account per person. Multiple accounts, self-referrals, and bug exploitation result in permanent ban. Users must be 18+.</p>
                      </LegalBlock>
                      <LegalBlock icon={<Lock className="w-3.5 h-3.5 text-green-400" />} title="Rewards & Withdrawals">
                        <p>Rewards come from mining, tasks, and referrals. Withdrawals require minimum amount and admin approval. Fraudulent activity forfeits all rewards.</p>
                      </LegalBlock>
                      <LegalBlock icon={<Info className="w-3.5 h-3.5 text-red-400" />} title="Limitation of Liability">
                        <p>Not liable for lost earnings from downtime, rate changes, or bans due to rule violations.</p>
                      </LegalBlock>
                    </div>
                  )}

                  {overlay === "faq" && (
                    <div className="px-4 py-4 space-y-2">
                      {[
                        { q: "How do I earn AXN?", a: "Mine with your machine, watch ads, complete tasks, daily check-ins, and invite friends." },
                        { q: "What is the Mining Machine?", a: "Your personal AXN generator. Start CPU to mine AXN, claim when capacity fills, keep antivirus ON to prevent attacks." },
                        { q: "How long does antivirus last?", a: "Antivirus stays active for 2 minutes then auto-disables. Reactivate manually." },
                        { q: "How does the referral Well work?", a: "When your friend withdraws AXN, 10% goes into your Well automatically. Also earn 50 AXN when a friend upgrades their machine." },
                        { q: "When can I withdraw?", a: "Once you reach the minimum withdrawal amount. Check balance bar for eligibility." },
                        { q: "Why was my account banned?", a: "Bans happen for multiple accounts, self-referrals, or exploiting bugs. Contact support if it was a mistake." },
                      ].map((faq, i) => (
                        <div key={i} className="bg-[#1a1c22] border border-white/5 rounded-2xl p-3.5">
                          <p className="text-white font-bold text-xs mb-1.5">{faq.q}</p>
                          <p className="text-white/45 text-xs leading-relaxed">{faq.a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Back button — pinned at bottom */}
                <div className="flex-shrink-0 px-4 py-3 border-t border-[#1c1c1e]">
                  <button
                    onClick={() => setOverlay(null)}
                    className="w-full h-10 rounded-2xl flex items-center justify-center gap-2 text-white/50 text-sm font-black uppercase tracking-wider active:scale-[0.97] transition-all"
                    style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MenuItem({ icon, label, onClick, right }: { icon: React.ReactNode; label: string; onClick: () => void; right?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 active:bg-white/5 transition-all">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-white text-sm font-semibold">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {right}
        <ChevronRight className="w-4 h-4 text-white/20" />
      </div>
    </button>
  );
}

function StatSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, live, wide }: { icon: React.ReactNode; label: string; value: string; live?: boolean; wide?: boolean }) {
  return (
    <div className={`bg-[#1a1c22] border border-white/5 rounded-2xl p-3 ${wide ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        {live && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
      </div>
      <p className="text-white font-black text-sm tabular-nums">{value}</p>
      <p className="text-white/30 text-[9px] uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

function LegalBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1c22] border border-white/5 rounded-2xl p-4">
      <p className="text-white font-black text-xs mb-2 flex items-center gap-1.5">{icon}{title}</p>
      <div className="text-white/45 text-xs leading-relaxed space-y-1">{children}</div>
    </div>
  );
}
