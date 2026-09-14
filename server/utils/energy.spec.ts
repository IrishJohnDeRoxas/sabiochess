import { describe, it, expect } from 'vitest';
import {
  calculateEnergyStatus,
  consumeEnergy,
  isUnlimitedTier,
  MAX_FREE_ENERGY,
  ENERGY_REFILL_INTERVAL_MS,
} from './energy';

describe('Energy Utility', () => {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const BASE_DATE = new Date('2026-09-10T12:00:00.000Z');

  describe('isUnlimitedTier', () => {
    it('returns true for lifetime and pro tiers', () => {
      expect(isUnlimitedTier('lifetime')).toBe(true);
      expect(isUnlimitedTier('Lifetime')).toBe(true);
      expect(isUnlimitedTier('PRO')).toBe(true);
      expect(isUnlimitedTier('pro')).toBe(true);
    });

    it('returns false for free, null, or undefined tiers', () => {
      expect(isUnlimitedTier('free')).toBe(false);
      expect(isUnlimitedTier(null)).toBe(false);
      expect(isUnlimitedTier(undefined)).toBe(false);
      expect(isUnlimitedTier('')).toBe(false);
    });
  });

  describe('calculateEnergyStatus', () => {
    describe('Unlimited / Pro / Lifetime Tiers', () => {
      it('returns unlimited status with no energy caps or refill timers', () => {
        const result = calculateEnergyStatus({ tier: 'lifetime' }, BASE_DATE);
        expect(result).toEqual({
          energy: null,
          maxEnergy: null,
          isUnlimited: true,
          lastEnergyRefillAt: null,
          nextRefillAt: null,
          needsDbUpdate: false,
        });
      });

      it('returns unlimited status for pro tier even if energy values exist in DB', () => {
        const result = calculateEnergyStatus(
          { tier: 'pro', energy: 0, lastEnergyRefillAt: BASE_DATE },
          BASE_DATE
        );
        expect(result.isUnlimited).toBe(true);
        expect(result.energy).toBeNull();
        expect(result.maxEnergy).toBeNull();
      });
    });

    describe('Free Tier - Full Energy & Migration', () => {
      it('defaults to MAX_FREE_ENERGY (5) when energy is undefined/null', () => {
        const result = calculateEnergyStatus({ tier: 'free' }, BASE_DATE);
        expect(result).toEqual({
          energy: 5,
          maxEnergy: 5,
          isUnlimited: false,
          lastEnergyRefillAt: null,
          nextRefillAt: null,
          needsDbUpdate: false,
        });
      });

      it('auto-grants 5 energy to users who had old 2/2 energy without active timer', () => {
        const result = calculateEnergyStatus(
          { tier: 'free', energy: 2, lastEnergyRefillAt: null },
          BASE_DATE
        );
        expect(result.energy).toBe(5);
        expect(result.maxEnergy).toBe(5);
        expect(result.lastEnergyRefillAt).toBeNull();
        expect(result.nextRefillAt).toBeNull();
        expect(result.needsDbUpdate).toBe(true);
      });

      it('clears stale refill timestamps if user has full 5 energy', () => {
        const result = calculateEnergyStatus(
          { tier: 'free', energy: 5, lastEnergyRefillAt: BASE_DATE },
          BASE_DATE
        );
        expect(result.energy).toBe(5);
        expect(result.lastEnergyRefillAt).toBeNull();
        expect(result.nextRefillAt).toBeNull();
        expect(result.needsDbUpdate).toBe(true);
      });
    });

    describe('Free Tier - Incremental Hourly Replenishment', () => {
      it('keeps energy and timer when less than 1 hour has elapsed', () => {
        const lastRefill = new Date(BASE_DATE.getTime() - 30 * 60 * 1000); // 30 mins ago
        const result = calculateEnergyStatus(
          { tier: 'free', energy: 2, lastEnergyRefillAt: lastRefill },
          BASE_DATE
        );

        expect(result.energy).toBe(2);
        expect(result.lastEnergyRefillAt).toEqual(lastRefill);
        expect(result.nextRefillAt).toEqual(
          new Date(lastRefill.getTime() + ONE_HOUR_MS)
        );
        expect(result.needsDbUpdate).toBe(false);
      });

      it('replenishes +1 energy when exactly 1 hour has elapsed', () => {
        const lastRefill = new Date(BASE_DATE.getTime() - ONE_HOUR_MS); // 1 hour ago
        const result = calculateEnergyStatus(
          { tier: 'free', energy: 2, lastEnergyRefillAt: lastRefill },
          BASE_DATE
        );

        expect(result.energy).toBe(3);
        expect(result.maxEnergy).toBe(5);
        expect(result.lastEnergyRefillAt).toEqual(BASE_DATE);
        expect(result.nextRefillAt).toEqual(
          new Date(BASE_DATE.getTime() + ONE_HOUR_MS)
        );
        expect(result.needsDbUpdate).toBe(true);
      });

      it('replenishes +2 energy when 2 hours have elapsed and preserves remaining partial progress', () => {
        // 2 hours 15 mins ago
        const lastRefill = new Date(BASE_DATE.getTime() - (2 * ONE_HOUR_MS + 15 * 60 * 1000));
        const result = calculateEnergyStatus(
          { tier: 'free', energy: 1, lastEnergyRefillAt: lastRefill },
          BASE_DATE
        );

        expect(result.energy).toBe(3); // 1 + 2 = 3
        expect(result.maxEnergy).toBe(5);
        // Anchor moved forward by 2 hours
        const expectedAnchor = new Date(lastRefill.getTime() + 2 * ONE_HOUR_MS);
        expect(result.lastEnergyRefillAt).toEqual(expectedAnchor);
        expect(result.nextRefillAt).toEqual(
          new Date(expectedAnchor.getTime() + ONE_HOUR_MS)
        );
        expect(result.needsDbUpdate).toBe(true);
      });

      it('caps energy at MAX_FREE_ENERGY (5) when enough hours elapsed to exceed cap', () => {
        const lastRefill = new Date(BASE_DATE.getTime() - 10 * ONE_HOUR_MS); // 10 hours ago
        const result = calculateEnergyStatus(
          { tier: 'free', energy: 1, lastEnergyRefillAt: lastRefill },
          BASE_DATE
        );

        expect(result.energy).toBe(5);
        expect(result.maxEnergy).toBe(5);
        expect(result.lastEnergyRefillAt).toBeNull();
        expect(result.nextRefillAt).toBeNull();
        expect(result.needsDbUpdate).toBe(true);
      });

      it('handles various timestamp formats (number, string, Date)', () => {
        const timestampMs = BASE_DATE.getTime() - 30 * 60 * 1000;
        const resultMs = calculateEnergyStatus(
          { tier: 'free', energy: 2, lastEnergyRefillAt: timestampMs },
          BASE_DATE
        );
        expect(resultMs.energy).toBe(2);
        expect(resultMs.lastEnergyRefillAt?.getTime()).toBe(timestampMs);

        const isoString = new Date(timestampMs).toISOString();
        const resultIso = calculateEnergyStatus(
          { tier: 'free', energy: 2, lastEnergyRefillAt: isoString },
          BASE_DATE
        );
        expect(resultIso.energy).toBe(2);
        expect(resultIso.lastEnergyRefillAt?.getTime()).toBe(timestampMs);
      });
    });
  });

  describe('consumeEnergy', () => {
    describe('Unlimited / Pro / Lifetime Tiers', () => {
      it('bypasses energy deductions and returns success', () => {
        const result = consumeEnergy({ tier: 'lifetime' }, 1, BASE_DATE);
        expect(result).toEqual({
          success: true,
          energy: null,
          maxEnergy: null,
          isUnlimited: true,
          lastEnergyRefillAt: null,
          nextRefillAt: null,
          needsDbUpdate: false,
        });
      });
    });

    describe('Free Tier', () => {
      it('deducts 1 energy from full (5 -> 4) and initiates 1-hour refill timer', () => {
        const result = consumeEnergy({ tier: 'free', energy: 5 }, 1, BASE_DATE);
        expect(result.success).toBe(true);
        expect(result.energy).toBe(4);
        expect(result.maxEnergy).toBe(5);
        expect(result.isUnlimited).toBe(false);
        expect(result.lastEnergyRefillAt).toEqual(BASE_DATE);
        expect(result.nextRefillAt).toEqual(
          new Date(BASE_DATE.getTime() + ONE_HOUR_MS)
        );
        expect(result.needsDbUpdate).toBe(true);
      });

      it('deducts 1 energy from 4 (4 -> 3) and preserves existing refill timer', () => {
        const existingRefill = new Date(BASE_DATE.getTime() - 20 * 60 * 1000); // 20m ago
        const result = consumeEnergy(
          { tier: 'free', energy: 4, lastEnergyRefillAt: existingRefill },
          1,
          BASE_DATE
        );

        expect(result.success).toBe(true);
        expect(result.energy).toBe(3);
        expect(result.lastEnergyRefillAt).toEqual(existingRefill);
        expect(result.nextRefillAt).toEqual(
          new Date(existingRefill.getTime() + ONE_HOUR_MS)
        );
        expect(result.needsDbUpdate).toBe(true);
      });

      it('rejects deduction when user has 0 energy and 1 hour has not elapsed', () => {
        const existingRefill = new Date(BASE_DATE.getTime() - 20 * 60 * 1000);
        const result = consumeEnergy(
          { tier: 'free', energy: 0, lastEnergyRefillAt: existingRefill },
          1,
          BASE_DATE
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Insufficient energy');
        expect(result.energy).toBe(0);
        expect(result.lastEnergyRefillAt).toEqual(existingRefill);
        expect(result.nextRefillAt).toEqual(
          new Date(existingRefill.getTime() + ONE_HOUR_MS)
        );
      });

      it('automatically replenishes accrued energy before consuming if hours have elapsed', () => {
        const expiredRefill = new Date(BASE_DATE.getTime() - 2 * ONE_HOUR_MS); // 2h ago
        const result = consumeEnergy(
          { tier: 'free', energy: 0, lastEnergyRefillAt: expiredRefill },
          1,
          BASE_DATE
        );

        expect(result.success).toBe(true);
        expect(result.energy).toBe(1);
        expect(result.maxEnergy).toBe(5);
        expect(result.lastEnergyRefillAt).toEqual(BASE_DATE);
        expect(result.nextRefillAt).toEqual(
          new Date(BASE_DATE.getTime() + ONE_HOUR_MS)
        );
        expect(result.needsDbUpdate).toBe(true);
      });
    });
  });
});
