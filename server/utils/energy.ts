export const MAX_FREE_ENERGY = 5;
export const ENERGY_REFILL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export interface UserEnergyInput {
  tier?: string | null;
  energy?: number | null;
  lastEnergyRefillAt?: Date | number | string | null;
}

export interface EnergyStatus {
  energy: number | null;
  maxEnergy: number | null;
  isUnlimited: boolean;
  lastEnergyRefillAt: Date | null;
  nextRefillAt: Date | null;
  needsDbUpdate: boolean;
}

export interface ConsumeEnergyResult {
  success: boolean;
  energy: number | null;
  maxEnergy: number | null;
  isUnlimited: boolean;
  lastEnergyRefillAt: Date | null;
  nextRefillAt: Date | null;
  needsDbUpdate: boolean;
  error?: string;
}

/**
 * Checks if the given tier provides unlimited energy.
 */
export function isUnlimitedTier(tier?: string | null): boolean {
  if (!tier) return false;
  const normalized = tier.toLowerCase().trim();
  return normalized === 'lifetime' || normalized === 'pro';
}

/**
 * Parses various timestamp formats into a valid Date or null.
 */
function parseDate(value?: Date | number | string | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(typeof value === 'number' && value < 1e12 ? value * 1000 : value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Dynamically computes energy status for a user, applying any replenishment
 * that has accrued since the last refill window (+1 energy per 1 hour).
 */
export function calculateEnergyStatus(
  user: UserEnergyInput,
  now: Date = new Date()
): EnergyStatus {
  if (isUnlimitedTier(user.tier)) {
    return {
      energy: null,
      maxEnergy: null,
      isUnlimited: true,
      lastEnergyRefillAt: null,
      nextRefillAt: null,
      needsDbUpdate: false,
    };
  }

  const lastRefill = parseDate(user.lastEnergyRefillAt);
  const nowTime = now.getTime();

  // If user has no active refill timer (e.g. was at max or newly created/migrated)
  if (!lastRefill) {
    const hadStaleEnergy = user.energy != null && user.energy !== MAX_FREE_ENERGY;
    return {
      energy: MAX_FREE_ENERGY,
      maxEnergy: MAX_FREE_ENERGY,
      isUnlimited: false,
      lastEnergyRefillAt: null,
      nextRefillAt: null,
      needsDbUpdate: hadStaleEnergy || user.lastEnergyRefillAt != null,
    };
  }

  const rawEnergy = user.energy != null ? user.energy : 0;
  const currentEnergy = Math.max(0, Math.min(MAX_FREE_ENERGY, rawEnergy));

  // If already at or above max free energy
  if (currentEnergy >= MAX_FREE_ENERGY) {
    return {
      energy: MAX_FREE_ENERGY,
      maxEnergy: MAX_FREE_ENERGY,
      isUnlimited: false,
      lastEnergyRefillAt: null,
      nextRefillAt: null,
      needsDbUpdate: true,
    };
  }

  const elapsedMs = Math.max(0, nowTime - lastRefill.getTime());
  const pointsToRefill = Math.floor(elapsedMs / ENERGY_REFILL_INTERVAL_MS);
  const updatedEnergy = Math.min(MAX_FREE_ENERGY, currentEnergy + pointsToRefill);

  // Fully replenished to max
  if (updatedEnergy >= MAX_FREE_ENERGY) {
    return {
      energy: MAX_FREE_ENERGY,
      maxEnergy: MAX_FREE_ENERGY,
      isUnlimited: false,
      lastEnergyRefillAt: null,
      nextRefillAt: null,
      needsDbUpdate: true,
    };
  }

  // Partially replenished or still waiting for next +1 refill
  const advancedRefillTime = new Date(
    lastRefill.getTime() + pointsToRefill * ENERGY_REFILL_INTERVAL_MS
  );
  const nextRefillAt = new Date(advancedRefillTime.getTime() + ENERGY_REFILL_INTERVAL_MS);

  return {
    energy: updatedEnergy,
    maxEnergy: MAX_FREE_ENERGY,
    isUnlimited: false,
    lastEnergyRefillAt: advancedRefillTime,
    nextRefillAt,
    needsDbUpdate: pointsToRefill > 0 || user.energy !== updatedEnergy,
  };
}

/**
 * Deducts energy (default 1) for a user action like game review or analysis.
 * Bypasses deduction for pro/lifetime tiers.
 */
export function consumeEnergy(
  user: UserEnergyInput,
  amount: number = 1,
  now: Date = new Date()
): ConsumeEnergyResult {
  const currentStatus = calculateEnergyStatus(user, now);

  if (currentStatus.isUnlimited) {
    return {
      success: true,
      energy: null,
      maxEnergy: null,
      isUnlimited: true,
      lastEnergyRefillAt: null,
      nextRefillAt: null,
      needsDbUpdate: false,
    };
  }

  const availableEnergy = currentStatus.energy ?? 0;

  if (availableEnergy < amount) {
    return {
      success: false,
      energy: availableEnergy,
      maxEnergy: currentStatus.maxEnergy,
      isUnlimited: false,
      lastEnergyRefillAt: currentStatus.lastEnergyRefillAt,
      nextRefillAt: currentStatus.nextRefillAt,
      needsDbUpdate: currentStatus.needsDbUpdate,
      error: 'Insufficient energy',
    };
  }

  const newEnergy = Math.max(0, availableEnergy - amount);
  let newLastRefillAt: Date | null = null;
  let newNextRefillAt: Date | null = null;

  if (newEnergy < MAX_FREE_ENERGY) {
    // Keep ongoing refill timer if already running, otherwise start new 1-hour window
    newLastRefillAt = currentStatus.lastEnergyRefillAt ?? now;
    newNextRefillAt =
      currentStatus.nextRefillAt ??
      new Date(now.getTime() + ENERGY_REFILL_INTERVAL_MS);
  }

  return {
    success: true,
    energy: newEnergy,
    maxEnergy: MAX_FREE_ENERGY,
    isUnlimited: false,
    lastEnergyRefillAt: newLastRefillAt,
    nextRefillAt: newNextRefillAt,
    needsDbUpdate: true,
  };
}
