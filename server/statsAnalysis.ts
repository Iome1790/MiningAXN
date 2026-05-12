// User Statistics Analysis — mining activity analytics & fraud detection
// Used when generating admin withdrawal request notifications.

import { db } from './db';
import { miningSessions, earnings, users, userMachines } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { getMiningLevel } from '../shared/miningLevels';

export interface StatsAnalysis {
  // Activity metrics
  sessionCount: number;
  totalSessionTimeSec: number;
  totalAxnMined: number;
  totalClaims: number;
  totalEarned: number;
  avgMiningSpeedPerSec: number;
  energyUsed: number;
  lastActive: Date | null;

  // Machine state
  currentMiningLevel: number;
  antivirusActive: boolean;
  machineHealth: number;
  storagePct: number;
  storedAxn: number;
  storageCapacity: number;

  // Fraud detection
  isSuspicious: boolean;
  suspicionFlags: string[];
  riskScore: number; // 0–100
}

function formatDuration(secs: number): string {
  if (secs <= 0) return '0s';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s && !h) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export async function getUserStatsAnalysis(userId: string): Promise<StatsAnalysis> {
  const now = new Date();

  // Fetch all mining sessions (new tracking — may be sparse for older users)
  const sessions = await db
    .select()
    .from(miningSessions)
    .where(eq(miningSessions.userId, userId))
    .orderBy(desc(miningSessions.createdAt));

  // Fetch ALL AXN mining earnings — this is the authoritative historical record
  // Each claim creates one row with source='axn_mining'
  const axnMiningEarnings = await db
    .select()
    .from(earnings)
    .where(and(eq(earnings.userId, userId), eq(earnings.source, 'axn_mining')))
    .orderBy(earnings.createdAt);

  // Fetch ALL earnings (including referrals, bonuses, etc.) for total earned
  const allEarnings = await db
    .select()
    .from(earnings)
    .where(eq(earnings.userId, userId));

  // Current machine state
  const [machine] = await db
    .select()
    .from(userMachines)
    .where(eq(userMachines.userId, userId))
    .limit(1);

  // User row
  const [user] = await db
    .select({ lastLoginAt: users.lastLoginAt, registeredAt: users.registeredAt, balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // ── Aggregate from earnings table (historical truth) ──────────────────────
  // Each axn_mining earning = one claim cycle

  const totalClaims = axnMiningEarnings.length;
  const totalAxnMinedFromEarnings = axnMiningEarnings.reduce(
    (sum, e) => sum + parseFloat(e.amount || '0'), 0
  );

  // Use earnings-based session count as proxy (more reliable than new sessions table)
  // If the new sessions table has more data, use the max
  const sessionCountFromSessions = sessions.length;
  const sessionCount = Math.max(totalClaims, sessionCountFromSessions);

  // Total session time: prefer sessions table, otherwise estimate from earnings timespan
  let totalSessionTimeSec = 0;
  if (sessionCountFromSessions > 0) {
    for (const s of sessions) {
      totalSessionTimeSec += s.expectedDurationSec;
    }
  }

  // Total earned from all sources
  const totalEarned = allEarnings.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  // Current mining level
  const currentMiningLevel = machine?.miningLevel ?? 1;
  const mLvl = getMiningLevel(currentMiningLevel);

  // ── Average speed calculation ──────────────────────────────────────────────
  // Primary: use new sessions table if we have claimed sessions
  const claimedSessions = sessions.filter(s => s.claimedAt && parseFloat(s.axnMined || '0') > 0);
  let avgMiningSpeedPerSec = 0;

  if (claimedSessions.length > 0) {
    // Use actual session data
    const speeds = claimedSessions.map(s =>
      parseFloat(s.axnMined || '0') / (s.expectedDurationSec || 1)
    );
    avgMiningSpeedPerSec = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  } else if (axnMiningEarnings.length >= 2) {
    // Fallback: estimate from earnings history timespan
    const firstEarning = axnMiningEarnings[0];
    const lastEarning = axnMiningEarnings[axnMiningEarnings.length - 1];
    const spanSec = (new Date(lastEarning.createdAt!).getTime() - new Date(firstEarning.createdAt!).getTime()) / 1000;
    if (spanSec > 0) {
      // average = total mined / total time from first to last earning
      avgMiningSpeedPerSec = totalAxnMinedFromEarnings / spanSec;
    }
  } else if (axnMiningEarnings.length === 1) {
    // Single earning: use the actual mining level rate as best estimate
    avgMiningSpeedPerSec = mLvl.rate;
  }

  // Total mined = prefer earnings table sum (most accurate historical data)
  const totalAxnMined = totalAxnMinedFromEarnings > 0
    ? totalAxnMinedFromEarnings
    : sessions.reduce((s, r) => s + parseFloat(r.axnMined || '0'), 0);

  // Storage info from current machine state
  const cLvl = getMiningLevel(machine?.capacityLevel ?? 1);
  const storageCapacity = cLvl.capacity;
  const accumulatedAxn = parseFloat(machine?.accumulatedAxn || '0');
  let storedAxn = accumulatedAxn;
  if (machine?.machineHealth && machine.machineHealth > 0 && machine.cpuStartTime && machine.lastClaimTime) {
    const mineFrom = machine.lastClaimTime > machine.cpuStartTime
      ? machine.lastClaimTime : machine.cpuStartTime;
    const mineUntil = machine.cpuEndTime && machine.cpuEndTime < now ? machine.cpuEndTime : now;
    if (mineUntil > mineFrom) {
      const secs = Math.floor((mineUntil.getTime() - mineFrom.getTime()) / 1000);
      storedAxn = Math.min(storageCapacity, accumulatedAxn + secs * mLvl.rate);
    }
  }
  const storagePct = storageCapacity > 0 ? (storedAxn / storageCapacity) * 100 : 0;

  // Antivirus state with expiry check
  let antivirusActive = machine?.antivirusActive ?? false;
  if (antivirusActive && machine?.antivirusActivatedAt) {
    const avDurationMs = (currentMiningLevel * 10 + 10) * 60 * 1000;
    if (now.getTime() - machine.antivirusActivatedAt.getTime() >= avDurationMs) {
      antivirusActive = false;
    }
  }

  // Last active = last_claim_time or last_login_at
  const lastActive: Date | null =
    machine?.lastClaimTime ?? user?.lastLoginAt ?? user?.registeredAt ?? null;

  // ── Fraud detection ───────────────────────────────────────────────────────

  const flags: string[] = [];
  let riskScore = 0;

  // Theoretical max speed per second for this level
  const theoreticalMaxSpeedPerSec = mLvl.rate;

  // 1. Speed check — compare claimed axn vs theoretical max for that session
  for (const s of claimedSessions) {
    const sessionMaxAxn = parseFloat(s.theoreticalMaxAxn || '0');
    const sessionMined = parseFloat(s.axnMined || '0');
    if (sessionMaxAxn > 0 && sessionMined > sessionMaxAxn * 1.05) {
      flags.push(`Mining output exceeded hardware limit (${sessionMined.toFixed(2)} > ${sessionMaxAxn.toFixed(2)} AXN)`);
      riskScore += 40;
      break;
    }
  }

  // 2. Avg speed vs theoretical max per second
  if (avgMiningSpeedPerSec > theoreticalMaxSpeedPerSec * 1.05) {
    flags.push(`Average speed ${avgMiningSpeedPerSec.toFixed(4)} AXN/s exceeds hardware max ${theoreticalMaxSpeedPerSec.toFixed(4)} AXN/s`);
    riskScore += 35;
  }

  // 3. (claim frequency now handled via earnings timestamps below)

  // 4. Balance integrity — current balance vs total legitimate mining earnings
  const currentBalance = parseFloat(user?.balance || '0');
  const maxLegitimateBalance = totalEarned + 10000;
  if (sessionCount >= 3 && currentBalance > maxLegitimateBalance * 2) {
    flags.push(`Balance (${currentBalance.toFixed(2)} AXN) far exceeds recorded earnings (${totalEarned.toFixed(2)} AXN)`);
    riskScore += 45;
  }

  // 5. Zero sessions but very high balance
  if (sessionCount === 0 && currentBalance > 500) {
    flags.push('Very high balance with no recorded mining sessions');
    riskScore += 25;
  }

  // 6. Session duration anomaly — sessions claimed far faster than expected
  const suspiciouslyShortSessions = claimedSessions.filter(s => {
    if (!s.claimedAt) return false;
    const actualMs = s.claimedAt.getTime() - s.cpuStartTime.getTime();
    const expectedMs = s.expectedDurationSec * 1000;
    return actualMs < expectedMs * 0.1;
  });
  if (suspiciouslyShortSessions.length >= 2) {
    flags.push(`${suspiciouslyShortSessions.length} sessions claimed far faster than CPU timer allows`);
    riskScore += 35;
  }

  riskScore = Math.min(100, riskScore);
  const isSuspicious = flags.length > 0;

  // Claim frequency check — use earnings timestamps (more accurate than sessions)
  if (axnMiningEarnings.length >= 2) {
    const earningTimes = axnMiningEarnings
      .map(e => new Date(e.createdAt!).getTime())
      .sort((a, b) => a - b);
    for (let i = 1; i < earningTimes.length; i++) {
      if (earningTimes[i] - earningTimes[i - 1] < 60 * 1000) {
        if (!flags.some(f => f.includes('Claim frequency'))) {
          flags.push('Claim frequency abnormally fast (< 60s between claims)');
          riskScore += 30;
        }
        break;
      }
    }
  }

  // Last active — use most recent earning or machine state
  const lastEarningDate = axnMiningEarnings.length > 0
    ? new Date(axnMiningEarnings[axnMiningEarnings.length - 1].createdAt!)
    : null;
  const lastActiveResolved: Date | null =
    machine?.lastClaimTime ?? lastEarningDate ?? user?.lastLoginAt ?? user?.registeredAt ?? null;

  return {
    sessionCount,
    totalSessionTimeSec,
    totalAxnMined,
    totalClaims,
    totalEarned,
    avgMiningSpeedPerSec,
    energyUsed: totalClaims > 0 ? totalClaims : sessionCount,
    lastActive: lastActiveResolved,
    currentMiningLevel,
    antivirusActive,
    machineHealth: machine?.machineHealth ?? 100,
    storagePct,
    storedAxn,
    storageCapacity,
    isSuspicious,
    suspicionFlags: flags,
    riskScore,
  };
}

// ── Message block builder ────────────────────────────────────────────────────

function miniBar(pct: number, len = 8): string {
  const filled = Math.min(len, Math.round((pct / 100) * len));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

export function formatStatsBlock(stats: StatsAnalysis): string {
  const sessionTime = formatDuration(stats.totalSessionTimeSec);
  const lastActiveStr = stats.lastActive ? timeAgo(stats.lastActive) : 'Never';

  // Speed as AXN/s with 2 decimal places
  const speedVal = stats.avgMiningSpeedPerSec.toFixed(2);
  const speedLine = stats.isSuspicious && stats.suspicionFlags.some(f => f.includes('speed'))
    ? `<b>⚠️ ${speedVal} AXN/s</b>`
    : `${speedVal} AXN/s`;

  const avStatus = stats.antivirusActive ? '🟢 Active' : '🔴 Offline';
  const healthStr = stats.machineHealth >= 75 ? `🟢 ${stats.machineHealth}%`
    : stats.machineHealth >= 40 ? `🟡 ${stats.machineHealth}%`
    : `🔴 ${stats.machineHealth}%`;

  const storageBar = miniBar(stats.storagePct);
  const storageStr = `${stats.storedAxn.toFixed(2)}/${stats.storageCapacity} AXN [${storageBar}] ${stats.storagePct.toFixed(0)}%`;

  const riskLabel = stats.riskScore === 0 ? '🟢 Clean'
    : stats.riskScore < 30 ? '🟡 Low Risk'
    : stats.riskScore < 60 ? '🟠 Medium Risk'
    : '🔴 HIGH RISK';

  let block =
`╭━━ 📊 STATISTICS ANALYSIS ━━╮
│
├ ⏰ Session Time : <b>${sessionTime}</b> (${stats.sessionCount} sessions)
├ 📅 Last Active  : <b>${lastActiveStr}</b>
├ ⛏ Total Mined  : <b>${stats.totalAxnMined.toFixed(2)} AXN</b>
├ 🎁 Claims Made  : <b>${stats.totalClaims}x</b>
├ 💰 Total Earned : <b>${stats.totalEarned.toFixed(2)} AXN</b>
├ ⚡ Mining Speed : ${speedLine}
├ 🔋 Energy Used  : <b>${stats.energyUsed}x</b>
├ 🛡 Antivirus   : ${avStatus}
├ ❤️ Health       : ${healthStr}
├ 📦 Storage      : ${storageStr}
├ 🎯 Risk Score   : ${riskLabel} (${stats.riskScore}/100)
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

  if (stats.isSuspicious) {
    block += `\n\n🚨 <b>Suspicious Activity Detected</b>`;
    for (const flag of stats.suspicionFlags) {
      block += `\n  • ${flag}`;
    }
  }

  return block;
}

export { formatDuration, timeAgo };
