// AXIONET Machine Monitor
// Polls every 60 seconds, checks each user's machine state, and sends
// cyberpunk-style Telegram alerts ONLY when the user is offline.

import { storage } from './storage';
import { isUserOnline } from './userPresence';
import { sendMachineAlertNotification } from './telegram';
import { db } from './db';
import { userMachines, users } from '../shared/schema';
import { getMiningLevel } from '../shared/miningLevels';
import { eq } from 'drizzle-orm';

// ─── Alert type definitions ──────────────────────────────────────────────────

type AlertType = 'energy_depleted' | 'health_critical' | 'antivirus_expired' | 'storage_full' | 'cpu_stopped';

interface AlertState {
  energy_depleted: boolean;
  health_critical: boolean;
  antivirus_expired: boolean;
  storage_full: boolean;
  cpu_stopped: boolean;
}

// Per-user alert state: tracks which conditions were already notified.
// Resets each condition when it recovers so a new alert fires next time.
const alertStates = new Map<string, AlertState>();

function getAlertState(userId: string): AlertState {
  if (!alertStates.has(userId)) {
    alertStates.set(userId, {
      energy_depleted: false,
      health_critical: false,
      antivirus_expired: false,
      storage_full: false,
      cpu_stopped: false,
    });
  }
  return alertStates.get(userId)!;
}

// ─── Machine state snapshot (replicates server-side logic without side effects) ─

interface MachineSnapshot {
  userId: string;
  telegramId: string | null;
  username: string | null;
  miningLevel: number;
  capacityLevel: number;
  cpuLevel: number;
  miningRatePerSec: number;
  capacity: number;
  cpuDurationMin: number;
  cpuRunning: boolean;
  cpuRemainingSeconds: number;
  hasEnergy: boolean;
  antivirusActive: boolean;
  avSecondsLeft: number;
  machineHealth: number;
  minedAxn: number;
  storagePct: number;
}

async function getMachineSnapshot(userId: string): Promise<MachineSnapshot | null> {
  try {
    const [machineRow] = await db
      .select()
      .from(userMachines)
      .where(eq(userMachines.userId, userId))
      .limit(1);

    if (!machineRow) return null;

    const [userRow] = await db
      .select({ telegram_id: users.telegram_id, username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const now = new Date();
    const mLvl = getMiningLevel(machineRow.miningLevel);
    const cLvl = getMiningLevel(machineRow.capacityLevel);
    const cpuLvl = getMiningLevel(machineRow.cpuLevel);

    const miningRate = mLvl.rate;
    const capacity = cLvl.capacity;
    const cpuDurationSec = cpuLvl.cpuMin * 60;

    // CPU running?
    const cpuRunning = !!(machineRow.cpuEndTime && machineRow.cpuEndTime > now);
    const cpuRemainingSeconds = cpuRunning
      ? Math.max(0, Math.floor((machineRow.cpuEndTime!.getTime() - now.getTime()) / 1000))
      : 0;

    // Mined AXN
    const accumulatedAxn = parseFloat(machineRow.accumulatedAxn || '0');
    let minedAxn = accumulatedAxn;
    if (machineRow.machineHealth > 0 && machineRow.cpuStartTime && machineRow.lastClaimTime) {
      const mineFrom = machineRow.lastClaimTime > machineRow.cpuStartTime
        ? machineRow.lastClaimTime
        : machineRow.cpuStartTime;
      const mineUntil = machineRow.cpuEndTime && machineRow.cpuEndTime < now ? machineRow.cpuEndTime : now;
      if (mineUntil > mineFrom) {
        const seconds = Math.floor((mineUntil.getTime() - mineFrom.getTime()) / 1000);
        minedAxn = Math.min(capacity, accumulatedAxn + seconds * miningRate);
      }
    }

    // Antivirus check
    const avDurationMs = (machineRow.miningLevel * 10 + 10) * 60 * 1000;
    let antivirusActive = machineRow.antivirusActive;
    let avSecondsLeft = 0;
    if (antivirusActive && machineRow.antivirusActivatedAt) {
      const remainingMs = avDurationMs - (now.getTime() - machineRow.antivirusActivatedAt.getTime());
      if (remainingMs <= 0) {
        antivirusActive = false;
      } else {
        avSecondsLeft = Math.ceil(remainingMs / 1000);
      }
    }

    const storagePct = capacity > 0 ? (minedAxn / capacity) * 100 : 0;

    return {
      userId,
      telegramId: userRow?.telegram_id ?? null,
      username: userRow?.username ?? null,
      miningLevel: machineRow.miningLevel,
      capacityLevel: machineRow.capacityLevel,
      cpuLevel: machineRow.cpuLevel,
      miningRatePerSec: miningRate,
      capacity,
      cpuDurationMin: cpuLvl.cpuMin,
      cpuRunning,
      cpuRemainingSeconds,
      hasEnergy: machineRow.hasEnergy,
      antivirusActive,
      avSecondsLeft,
      machineHealth: machineRow.machineHealth,
      minedAxn: parseFloat(minedAxn.toFixed(4)),
      storagePct,
    };
  } catch (err) {
    console.error(`❌ [MachineMonitor] snapshot error for user ${userId}:`, err);
    return null;
  }
}

// ─── Condition checks ────────────────────────────────────────────────────────

function shouldAlert(
  snap: MachineSnapshot,
  state: AlertState,
): AlertType[] {
  const alerts: AlertType[] = [];

  // Energy depleted
  if (!snap.hasEnergy) {
    if (!state.energy_depleted) alerts.push('energy_depleted');
  } else {
    state.energy_depleted = false; // reset when recovered
  }

  // Health critical (reached 0)
  if (snap.machineHealth <= 0) {
    if (!state.health_critical) alerts.push('health_critical');
  } else {
    state.health_critical = false;
  }

  // Antivirus expired / off
  if (!snap.antivirusActive) {
    if (!state.antivirus_expired) alerts.push('antivirus_expired');
  } else {
    state.antivirus_expired = false;
  }

  // Storage full (≥ 99.5%)
  if (snap.storagePct >= 99.5) {
    if (!state.storage_full) alerts.push('storage_full');
  } else {
    state.storage_full = false;
  }

  // CPU stopped (was running but timed out)
  if (!snap.cpuRunning && snap.machineHealth > 0 && !snap.hasEnergy) {
    if (!state.cpu_stopped) alerts.push('cpu_stopped');
  } else {
    state.cpu_stopped = false;
  }

  return alerts;
}

// ─── Monitor loop ─────────────────────────────────────────────────────────────

async function runMonitorCycle(): Promise<void> {
  try {
    // Get all users that have a machine
    const machines = await db.select({ userId: userMachines.userId }).from(userMachines);

    for (const { userId } of machines) {
      // Skip online users — app is open, no need to ping
      if (isUserOnline(userId)) continue;

      const snap = await getMachineSnapshot(userId);
      if (!snap || !snap.telegramId) continue;

      const state = getAlertState(userId);
      const triggered = shouldAlert(snap, state);
      if (triggered.length === 0) continue;

      // Mark alerts as sent before firing to prevent race conditions
      for (const alertType of triggered) {
        (state as any)[alertType] = true;
      }

      // Send one combined notification per user covering all triggered alerts
      await sendMachineAlertNotification(snap.telegramId, snap, triggered);

      console.log(`📡 [MachineMonitor] Sent alert(s) [${triggered.join(', ')}] to user ${snap.telegramId}`);
    }
  } catch (err) {
    console.error('❌ [MachineMonitor] Cycle error:', err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const MONITOR_INTERVAL_MS = 60 * 1000; // 60 seconds
let monitorTimer: ReturnType<typeof setInterval> | null = null;

export function startMachineMonitor(): void {
  if (monitorTimer) return; // already running

  console.log('🤖 [MachineMonitor] Starting — interval: 60s (first cycle in 2 min)');

  // Delay first run by 2 minutes to let WebSocket connections re-establish after restart
  setTimeout(() => {
    runMonitorCycle();
    monitorTimer = setInterval(runMonitorCycle, MONITOR_INTERVAL_MS);
  }, 2 * 60 * 1000);
}

export function stopMachineMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
    console.log('🛑 [MachineMonitor] Stopped');
  }
}
