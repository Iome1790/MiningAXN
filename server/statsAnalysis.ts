// User Statistics Analysis — mining activity analytics & fraud detection
// Used when generating admin withdrawal request notifications.

import { db } from './db';
import { miningSessions, earnings, users, userMachines } from '../shared/schema';
import { eq, desc, and, isNotNull } from 'drizzle-orm';
import { getMiningLevel } from '../shared/miningLevels';

export interface StatsAnalysis {
  // Activity metrics
  sessionCount: number;
  totalSessionTimeSec: number;
  totalAxnMined: number;
  totalClaims: number;
  totalEarned: number;
  avgMiningSpeedPerHour: number;
  theoreticalMaxSpeedPerHour: number;
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

  // Fetch all mining sessions for this user
  const sessions = await db
    .select()
    .from(miningSessions)
    .where(eq(miningSessions.userId, userId))
    .orderBy(desc(miningSessions.createdAt));

  // Fetch all AXN mining earnings
  const axnEarnings = await db
    .select()
    .from(earnings)
    .where(eq(earnings.userId, userId));

  // Current machine state
  const [machine] = await db
    .select()
    .from(userMachines)
    .where(eq(userMachines.userId, userId))
    .limit(1);

  // User row for last login
  const [user] = await db
    .select({ lastLoginAt: users.lastLoginAt, registeredAt: users.registeredAt, balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // ── Aggregate session metrics ──────────────────────────────────────────────

  const sessionCount = sessions.length;
  let totalSessionTimeSec = 0;
  let totalAxnMinedFromSessions = 0;

  for (const s of sessions) {
    totalSessionTimeSec += s.expectedDurationSec;
    totalAxnMinedFromSessions += parseFloat(s.axnMined || '0');
  }

  const totalClaims = sessions.filter(s => s.claimedAt !== null).length;

  // Total earned from all sources
  const totalEarned = axnEarnings.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  // Current mining level theoretical max speed
  const currentMiningLevel = machine?.miningLevel ?? 1;
  const mLvl = getMiningLevel(currentMiningLevel);
  const theoreticalMaxSpeedPerHour = mLvl.rate * 3600;

  // Average mining speed across all completed sessions
  const claimedSessions = sessions.filter(s => s.claimedAt && parseFloat(s.axnMined || '0') > 0);
  let avgMiningSpeedPerHour = 0;
  if (claimedSessions.length > 0) {
    const speeds = claimedSessions.map(s => {
      const rate = parseFloat(s.axnMined || '0') / (s.expectedDurationSec || 1);
      return rate * 3600;
    });
    avgMiningSpeedPerHour = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  }

  // Storage info from current machine state
  const cLvl = getMiningLevel(machine?.capacityLevel ?? 1);
  const storageCapacity = cLvl.capacity;
  const accumulatedAxn = parseFloat(machine?.accumulatedAxn || '0');
  let storedAxn = accumulatedAxn;
  // Try to estimate current mined (live run)
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

  // 1. Speed check — compare claimed axn vs theoretical max for that level
  for (const s of claimedSessions) {
    const sessionMaxAxn = parseFloat(s.theoreticalMaxAxn || '0');
    const sessionMined = parseFloat(s.axnMined || '0');
    if (sessionMaxAxn > 0 && sessionMined > sessionMaxAxn * 1.05) {
      flags.push(`Mining output exceeded hardware limit (${sessionMined.toFixed(2)} > ${sessionMaxAxn.toFixed(2)} AXN)`);
      riskScore += 40;
      break;
    }
  }

  // 2. Avg speed vs theoretical max
  if (avgMiningSpeedPerHour > theoreticalMaxSpeedPerHour * 1.05) {
    flags.push(`Average speed ${avgMiningSpeedPerHour.toFixed(2)} AXN/h exceeds max ${theoreticalMaxSpeedPerHour.toFixed(2)} AXN/h`);
    riskScore += 35;
  }

  // 3. Claim frequency — detect abnormally fast consecutive claims
  const claimTimes = sessions
    .filter(s => s.claimedAt)
    .map(s => s.claimedAt!.getTime())
    .sort((a, b) => a - b);

  for (let i = 1; i < claimTimes.length; i++) {
    if (claimTimes[i] - claimTimes[i - 1] < 60 * 1000) { // < 60 seconds between claims
      flags.push('Claim frequency abnormally fast (< 60s between claims)');
      riskScore += 30;
      break;
    }
  }

  // 4. Balance integrity — current balance vs total legitimate mining earnings
  const currentBalance = parseFloat(user?.balance || '0');
  const maxLegitimateBalance = totalEarned + 10000; // allow some margin for referrals/bonuses
  if (sessionCount >= 3 && currentBalance > maxLegitimateBalance * 2) {
    flags.push(`Balance (${currentBalance.toFixed(2)} AXN) far exceeds recorded earnings (${totalEarned.toFixed(2)} AXN)`);
    riskScore += 45;
  }

  // 5. Zero sessions but high balance
  if (sessionCount === 0 && currentBalance > 100) {
    flags.push('High balance with no recorded mining sessions');
    riskScore += 25;
  }

  // 6. Session duration anomaly — sessions far shorter than expected
  const suspiciouslyShortSessions = claimedSessions.filter(s => {
    if (!s.claimedAt) return false;
    const actualMs = s.claimedAt.getTime() - s.cpuStartTime.getTime();
    const expectedMs = s.expectedDurationSec * 1000;
    return actualMs < expectedMs * 0.1; // claimed in < 10% of expected time
  });
  if (suspiciouslyShortSessions.length >= 2) {
    flags.push(`${suspiciouslyShortSessions.length} sessions claimed far faster than CPU timer allows`);
    riskScore += 35;
  }

  riskScore = Math.min(100, riskScore);
  const isSuspicious = flags.length > 0;

  return {
    sessionCount,
    totalSessionTimeSec,
    totalAxnMined: totalAxnMinedFromSessions,
    totalClaims,
    totalEarned,
    avgMiningSpeedPerHour,
    theoreticalMaxSpeedPerHour,
    energyUsed: sessionCount,
    lastActive,
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
  const speedStr = `${stats.avgMiningSpeedPerHour.toFixed(4)} AXN/h`;
  const maxSpeedStr = `${stats.theoreticalMaxSpeedPerHour.toFixed(4)} AXN/h`;
  const speedLine = stats.avgMiningSpeedPerHour > stats.theoreticalMaxSpeedPerHour * 1.05
    ? `<b>⚠️ ${speedStr}</b> (limit: ${maxSpeedStr})`
    : `${speedStr} (limit: ${maxSpeedStr})`;

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
├ ⏰ Session Time: <b>${sessionTime}</b> (${stats.sessionCount} sessions)
├ 📅 Last Active: <b>${lastActiveStr}</b>
├ ⛏ Total Mine: <b>${stats.totalAxnMined.toFixed(4)} AXN</b>
├ 🎁 Total Claim: <b>${stats.totalClaims}x</b>
├ 💰 Total Earn: <b>${stats.totalEarned.toFixed(4)} AXN</b>
├ ⚡ Mining Speed: ${speedLine}
├ 🔋 Energy Used: <b>${stats.energyUsed}x</b>
├ 🛡 Antivirus: ${avStatus}
├ ❤️ Health: ${healthStr}
├ 📦 Storage: ${storageStr}
├ 🎯 Risk Score: ${riskLabel} (${stats.riskScore}/100)
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
