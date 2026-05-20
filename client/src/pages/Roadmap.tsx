import { motion } from "framer-motion";
import { RiCalendarFill, RiMapPinFill, RiRocketFill, RiCpuFill, RiGlobalFill, RiStarFill, RiFlashlightFill, RiBarChartFill, RiShieldFill, RiGroupFill } from "react-icons/ri";
import { BsLightningChargeFill } from "react-icons/bs";
import Layout from "@/components/Layout";
import Header from "@/components/Header";

const SEASONS = [
  {
    num: 1, title: "MINING ERA", date: "MAY 2026", status: "active" as const,
    tagline: "The beginning of AXIONET.",
    desc: "Launching the platform, building the first community, and starting the mining ecosystem.",
    Icon: RiCpuFill,
    items: ["AXIONET App Launch","Mining System Activated","Upgrade & Repair Features","Antivirus System","Energy Mechanics","Farming Features","Referral System","Early User Expansion","Community Foundation Built"],
    objective: "Create the foundation of the AXIONET ecosystem and attract the first generation of users.",
  },
  {
    num: 2, title: "SYSTEM EVOLUTION", date: "JUNE — JULY 2026", status: "upcoming" as const,
    tagline: "The ecosystem evolves.",
    desc: "The end of traditional mining mechanics and the beginning of a smarter activity-based system.",
    Icon: RiFlashlightFill,
    items: ["Mining System Removed","Users keep all Season 1 balances","New Task-Based Reward System","Earn AXN through activities & missions","Computer switched to automatic mode","Improved UI / UX Experience","Community Challenges & Events"],
    objective: "Turn AXIONET into a more active, engaging, and scalable ecosystem.",
  },
  {
    num: 3, title: "COMPETITIVE ERA", date: "AUG — SEP 2026", status: "upcoming" as const,
    tagline: "The ecosystem becomes competitive.",
    desc: "User activity, reputation, rankings, staking, and large-scale reward systems.",
    Icon: RiBarChartFill,
    items: ["Reputation System","Rank Progression System","Staking System Added","Missions & Challenges","Community Events","Seasonal Reward Campaigns","Competitive User Ecosystem"],
    objective: "Build a competitive and highly active digital ecosystem.",
    quote: "«In AXIONET, activity becomes value.»",
  },
  {
    num: 4, title: "AXN EXPANSION", date: "OCT — DEC 2026", status: "upcoming" as const,
    tagline: "AXIONET enters expansion mode.",
    desc: "Scaling toward Web3 infrastructure and larger ecosystem growth.",
    Icon: RiGlobalFill,
    items: ["AXN Token Development","Blockchain Integration","Web3 Expansion","Ecosystem Partnerships","Global Community Expansion","Advanced Reward Systems"],
    objective: "Expand AXIONET into a scalable Web3 ecosystem.",
  },
];

const VISION = [
  { Icon: RiStarFill, label: "Activity-Based Rewards" },
  { Icon: RiShieldFill, label: "Reputation Systems" },
  { Icon: RiBarChartFill, label: "Competitive Participation" },
  { Icon: BsLightningChargeFill, label: "Staking Mechanics" },
  { Icon: RiGroupFill, label: "Large Community Events" },
  { Icon: RiGlobalFill, label: "Web3 Infrastructure" },
  { Icon: RiRocketFill, label: "Global Ecosystem Expansion" },
];

function SeasonCard({ s }: { s: typeof SEASONS[0] }) {
  const active = s.status === "active";
  return (
    <div style={{
      background: active ? 'rgba(5,18,50,0.9)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${active ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.1)'}`,
      borderRadius: 14,
      padding: '14px',
      boxShadow: active ? '0 0 20px rgba(59,130,246,0.15)' : 'none',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.07)'}` }}>
            <s.Icon style={{ width: 18, height: 18, color: active ? '#60a5fa' : 'rgba(255,255,255,0.3)' }} />
          </div>
          <div>
            <p style={{ color: active ? '#e2e8f0' : 'rgba(226,232,240,0.7)', fontWeight: 800, fontSize: 13, margin: 0, letterSpacing: 0.5 }}>S{s.num} · {s.title}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <RiCalendarFill style={{ width: 10, height: 10, color: '#3b82f6' }} />
              <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 500 }}>{s.date}</span>
            </div>
          </div>
        </div>
        {active ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 20, padding: '3px 10px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
            <span style={{ color: '#60a5fa', fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>ACTIVE NOW</span>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>UPCOMING</span>
          </div>
        )}
      </div>

      <div style={{ height: 1, background: active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', marginBottom: 10 }} />

      <p style={{ color: active ? '#e2e8f0' : 'rgba(226,232,240,0.6)', fontWeight: 700, fontSize: 12, margin: '0 0 4px' }}>{s.tagline}</p>
      <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: 11, margin: '0 0 10px', lineHeight: 1.6 }}>{s.desc}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
        {s.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <BsLightningChargeFill style={{ width: 9, height: 9, flexShrink: 0, color: active ? '#3b82f6' : 'rgba(59,130,246,0.35)' }} />
            <span style={{ color: 'rgba(203,213,225,0.7)', fontSize: 11, lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ background: active ? 'rgba(3,9,28,0.8)' : 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 10, padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <RiMapPinFill style={{ width: 10, height: 10, color: '#3b82f6' }} />
          <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>MAIN OBJECTIVE</span>
        </div>
        <p style={{ color: '#93c5fd', fontSize: 11, margin: 0, lineHeight: 1.6 }}>{s.objective}</p>
      </div>

      {(s as any).quote && <p style={{ color: 'rgba(148,163,184,0.35)', fontSize: 10, margin: '9px 0 0', lineHeight: 1.6, fontStyle: 'italic' }}>{(s as any).quote}</p>}
    </div>
  );
}

export default function Roadmap() {
  return (
    <Layout>
      <Header />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', paddingTop: 64, paddingBottom: 76 }}>

        {/* Page title */}
        <div style={{ padding: '14px 16px 12px', flexShrink: 0 }}>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 22, margin: 0, letterSpacing: 0.5 }}>Roadmap</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 3 }}>4 Seasons · Evolution Plan 2026</p>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          <p style={{ color: 'rgba(148,163,184,0.5)', fontSize: 12, margin: '0 0 4px', lineHeight: 1.7, textAlign: 'center' }}>
            AXIONET is evolving step by step — from mining to a complete digital ecosystem.
          </p>

          {SEASONS.map((s, idx) => (
            <motion.div key={s.num} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
              <SeasonCard s={s} />
            </motion.div>
          ))}

          {/* Long Term Vision */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 14, padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <RiRocketFill style={{ width: 18, height: 18, color: '#60a5fa' }} />
                </div>
                <p style={{ color: '#93c5fd', fontWeight: 800, fontSize: 13, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>Long Term Vision</p>
              </div>
              <div style={{ height: 1, background: 'rgba(59,130,246,0.1)', marginBottom: 10 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {VISION.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <v.Icon style={{ width: 13, height: 13, color: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(203,213,225,0.7)', fontSize: 11 }}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Final quote */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(148,163,184,0.45)', fontSize: 12, margin: '0 0 10px', lineHeight: 1.9, fontStyle: 'italic' }}>
                «The first users are not just users.<br />They are the first generation of the AXIONET ecosystem.»
              </p>
              <div style={{ height: 1, background: 'rgba(59,130,246,0.12)', margin: '10px 0' }} />
              <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: 12, margin: 0, letterSpacing: 1 }}>THE EVOLUTION HAS ALREADY STARTED.</p>
            </div>
          </motion.div>

        </div>
      </div>
    </Layout>
  );
}
