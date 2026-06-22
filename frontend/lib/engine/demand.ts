// ── Demand Calculations ───────────────────────────────────────────────────────

import {
  POLICY_DEMAND_BREAKPOINTS,
  YEAR1_DEMAND_BY_TYPE_BY_REGION,
  ORGANIC_GROWTH_RATE,
  CONVERSION_BASE_RATE,
  DEMAND_GROWTH_CAP_EXPONENT,
  RD_CONVERSION_BONUSES,
  getTypeGrowthModifiers,
  VEHICLE_MARKET_GROWTH_RATE,
} from "./constants";
import type { Region, VehicleType } from "./constants";

// ── Policy factor interpolation ───────────────────────────────────────────────

export function getPolicyDemandFactor(policyScore: number): number {
  const bp = POLICY_DEMAND_BREAKPOINTS;

  // Below minimum
  if (policyScore <= bp[0].score) return bp[0].factor;
  // Above maximum
  if (policyScore >= bp[bp.length - 1].score) return bp[bp.length - 1].factor;

  // Find bracket
  for (let i = 0; i < bp.length - 1; i++) {
    if (policyScore >= bp[i].score && policyScore <= bp[i + 1].score) {
      const t = (policyScore - bp[i].score) / (bp[i + 1].score - bp[i].score);
      return bp[i].factor + t * (bp[i + 1].factor - bp[i].factor);
    }
  }

  return 1.0;
}

// ── This round's demand by type × region ──────────────────────────────────────
// priorDemandByTypeByRegion is already the base for this round.
// We apply policyFactor and world event modifiers.

export function computeThisRoundDemand(
  priorDemandByTypeByRegion: Record<VehicleType, Record<Region, number>>,
  policyFactor: number,
  worldEventDemandModifier: number,
  worldEventRegionalModifiers: Partial<Record<Region, number>>,
  worldEventTypeModifiers: Partial<Record<VehicleType, number>>,
  roundNumber: number
): Record<VehicleType, Record<Region, number>> {
  const typeModifiers = getTypeGrowthModifiers(roundNumber);

  const result: Partial<Record<VehicleType, Record<Region, number>>> = {};

  const types: VehicleType[] = [
    "COMPACT",
    "SEDAN",
    "SUV",
    "TRUCK",
    "SPORTS_CAR",
  ];
  const regions: Region[] = [
    "WEST_COAST",
    "NORTHEAST",
    "SOUTHEAST",
    "MIDWEST",
    "SOUTHWEST",
  ];

  for (const vt of types) {
    const typeEventMod = worldEventTypeModifiers[vt] ?? 0;
    const typeMod = typeModifiers[vt];
    result[vt] = {} as Record<Region, number>;

    for (const region of regions) {
      const base =
        priorDemandByTypeByRegion[vt]?.[region] ??
        YEAR1_DEMAND_BY_TYPE_BY_REGION[vt][region];
      const regionalEventMod = worldEventRegionalModifiers[region] ?? 0;

      const demand =
        base *
        policyFactor *
        (1 + worldEventDemandModifier) *
        (1 + typeEventMod) *
        (1 + regionalEventMod) *
        typeMod;

      result[vt]![region] = Math.max(0, Math.round(demand));
    }
  }

  return result as Record<VehicleType, Record<Region, number>>;
}

// ── Next year demand computation ──────────────────────────────────────────────

export interface NextDemandInput {
  currentFlyingDemand: number;
  currentTraditionalDemand: number;
  policyScore: number;
  categoryMarketingSpend: number; // total across all teams
  allTeamRdUnlocks: string[][]; // each team's unlock list
  roundNumber: number;
}

export interface NextDemandOutput {
  nextFlyingDemand: number;
  nextTraditionalDemand: number;
  nextDemandByType: Record<VehicleType, number>;
  nextDemandByTypeByRegion: Record<VehicleType, Record<Region, number>>;
}

export function computeNextRoundDemand(
  input: NextDemandInput,
  currentDemandByTypeByRegion: Record<VehicleType, Record<Region, number>>
): NextDemandOutput {
  const {
    currentFlyingDemand,
    currentTraditionalDemand,
    policyScore,
    categoryMarketingSpend,
    allTeamRdUnlocks,
    roundNumber,
  } = input;

  // Organic growth
  const organicGrowth = currentFlyingDemand * ORGANIC_GROWTH_RATE;

  // Category marketing grows the total market — sqrt curve for diminishing returns.
  // $4M → +6%, $16M → +12%, $36M → +18% of current flying demand added next round.
  // Much stronger than brand spend (which only shifts share, not total size).
  const categoryBonus =
    Math.sqrt(categoryMarketingSpend / 1_000_000) * 0.03 * currentFlyingDemand;

  // Conversion: policy bonus
  const conversionPolicyBonus =
    Math.max(0, policyScore / 5) * 0.0005 * currentTraditionalDemand;

  // Conversion: R&D bonuses – take max per unlock across all teams
  const unlocksSeen = new Set<string>();
  let conversionRdBonus = 0;
  for (const unlocks of allTeamRdUnlocks) {
    for (const key of unlocks) {
      if (!unlocksSeen.has(key) && RD_CONVERSION_BONUSES[key]) {
        conversionRdBonus +=
          RD_CONVERSION_BONUSES[key] * currentTraditionalDemand;
        unlocksSeen.add(key);
      }
    }
  }

  // Base conversion
  const conversionBase = currentTraditionalDemand * CONVERSION_BASE_RATE;

  const totalGrowth =
    organicGrowth + categoryBonus + conversionBase + conversionPolicyBonus + conversionRdBonus;

  // Growth cap
  const growthCap =
    currentFlyingDemand * (Math.exp(DEMAND_GROWTH_CAP_EXPONENT) - 1);
  const actualGrowth = Math.min(totalGrowth, growthCap);

  const nextFlyingDemand = Math.round(currentFlyingDemand + actualGrowth);

  // Next total vehicle market
  const currentTotalVehicleMarket =
    currentFlyingDemand + currentTraditionalDemand;
  const nextTotalVehicleMarket =
    currentTotalVehicleMarket * (1 + VEHICLE_MARKET_GROWTH_RATE);
  const nextTraditionalDemand = Math.round(
    nextTotalVehicleMarket - nextFlyingDemand
  );

  // Distribute next flying demand by type using next round type growth modifiers
  const nextTypeModifiers = getTypeGrowthModifiers(roundNumber + 1);

  // Compute current type totals
  const currentByType: Record<VehicleType, number> = {
    COMPACT: 0,
    SEDAN: 0,
    SUV: 0,
    TRUCK: 0,
    SPORTS_CAR: 0,
  };

  const types: VehicleType[] = [
    "COMPACT",
    "SEDAN",
    "SUV",
    "TRUCK",
    "SPORTS_CAR",
  ];
  const regions: Region[] = [
    "WEST_COAST",
    "NORTHEAST",
    "SOUTHEAST",
    "MIDWEST",
    "SOUTHWEST",
  ];

  for (const vt of types) {
    for (const region of regions) {
      currentByType[vt] +=
        currentDemandByTypeByRegion[vt]?.[region] ??
        YEAR1_DEMAND_BY_TYPE_BY_REGION[vt][region];
    }
  }

  // Apply type growth modifiers then renormalize
  const weighted: Record<VehicleType, number> = {} as Record<
    VehicleType,
    number
  >;
  let weightedSum = 0;
  for (const vt of types) {
    weighted[vt] = currentByType[vt] * nextTypeModifiers[vt];
    weightedSum += weighted[vt];
  }

  const nextDemandByType: Record<VehicleType, number> = {} as Record<
    VehicleType,
    number
  >;
  for (const vt of types) {
    nextDemandByType[vt] =
      weightedSum > 0
        ? Math.round((weighted[vt] / weightedSum) * nextFlyingDemand)
        : 0;
  }

  // Distribute by region proportionally from current distribution
  const nextDemandByTypeByRegion: Record<
    VehicleType,
    Record<Region, number>
  > = {} as Record<VehicleType, Record<Region, number>>;

  for (const vt of types) {
    nextDemandByTypeByRegion[vt] = {} as Record<Region, number>;
    const typeTotal = currentByType[vt];
    for (const region of regions) {
      const regionShare =
        typeTotal > 0
          ? (currentDemandByTypeByRegion[vt]?.[region] ??
              YEAR1_DEMAND_BY_TYPE_BY_REGION[vt][region]) / typeTotal
          : 1 / regions.length;
      nextDemandByTypeByRegion[vt][region] = Math.round(
        nextDemandByType[vt] * regionShare
      );
    }
  }

  return {
    nextFlyingDemand,
    nextTraditionalDemand,
    nextDemandByType,
    nextDemandByTypeByRegion,
  };
}
