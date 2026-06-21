// ── Supply Chain, Crowding, Glut & Talent War ────────────────────────────────

import {
  SCARCITY_TRIPLE_TESTED_TIER1_UNITS,
  SCARCITY_TRIPLE_TESTED_TIER1_COST,
  SCARCITY_TRIPLE_TESTED_TIER2_UNITS,
  SCARCITY_TRIPLE_TESTED_TIER2_COST,
  SCARCITY_MASS_PRODUCED_TIER1_UNITS,
  SCARCITY_MASS_PRODUCED_TIER1_COST,
  CROWDING_3_TEAMS_MKT_PENALTY,
  CROWDING_4PLUS_TEAMS_MKT_PENALTY,
  CROWDING_4PLUS_PRICE_REDUCTION,
  GLUT_DISCOUNT_COEFFICIENT,
  TALENT_WAR_THRESHOLD,
  TALENT_WAR_PENALTY_RATE,
  TALENT_WAR_PENALTY_CAP,
} from "./constants";
import type { Region, VehicleType } from "./constants";
import type { TeamInput } from "./types";

// ── Supply chain penalty per unit ─────────────────────────────────────────────

export interface SupplyChainResult {
  // Extra cost per unit for triple_tested parts
  tripleTestedPenaltyPerUnit: number;
  // Extra cost per unit for mass_produced parts
  massProducedPenaltyPerUnit: number;
  scarcityEvents: string[];
}

export function computeSupplyChainScarcity(
  teams: TeamInput[]
): SupplyChainResult {
  let totalTripleTested = 0;
  let totalMassProduced = 0;

  for (const team of teams) {
    const mfg = team.manufacturingSection;
    const vs = team.vehicleSection;

    for (const run of mfg.productionRuns) {
      const model = vs.models.find((m) => m.id === run.modelId);
      if (!model) continue;

      if (model.internals === "triple_tested") {
        totalTripleTested += run.units;
      } else if (model.internals === "mass_produced") {
        totalMassProduced += run.units;
      }
    }
  }

  let tripleTestedPenaltyPerUnit = 0;
  const scarcityEvents: string[] = [];

  if (totalTripleTested > SCARCITY_TRIPLE_TESTED_TIER2_UNITS) {
    tripleTestedPenaltyPerUnit = SCARCITY_TRIPLE_TESTED_TIER2_COST;
    scarcityEvents.push(
      `CRITICAL SHORTAGE: Triple-tested parts scarce industry-wide (${totalTripleTested.toLocaleString()} units). +$${SCARCITY_TRIPLE_TESTED_TIER2_COST.toLocaleString()}/unit`
    );
  } else if (totalTripleTested > SCARCITY_TRIPLE_TESTED_TIER1_UNITS) {
    tripleTestedPenaltyPerUnit = SCARCITY_TRIPLE_TESTED_TIER1_COST;
    scarcityEvents.push(
      `SHORTAGE: Triple-tested parts under pressure (${totalTripleTested.toLocaleString()} units). +$${SCARCITY_TRIPLE_TESTED_TIER1_COST.toLocaleString()}/unit`
    );
  }

  let massProducedPenaltyPerUnit = 0;
  if (totalMassProduced > SCARCITY_MASS_PRODUCED_TIER1_UNITS) {
    massProducedPenaltyPerUnit = SCARCITY_MASS_PRODUCED_TIER1_COST;
    scarcityEvents.push(
      `SHORTAGE: Mass-produced parts demand high (${totalMassProduced.toLocaleString()} units). +$${SCARCITY_MASS_PRODUCED_TIER1_COST.toLocaleString()}/unit`
    );
  }

  return { tripleTestedPenaltyPerUnit, massProducedPenaltyPerUnit, scarcityEvents };
}

// ── Segment crowding ──────────────────────────────────────────────────────────

export interface CrowdingResult {
  // marketingFactor: 1.0 = no penalty, 0.85 = 3 teams, 0.70 = 4+ teams
  marketingFactor: Record<VehicleType, number>;
  // priceForcedDown: 0 = no change, 0.08 = forced 8% down
  priceForcedDown: Record<VehicleType, number>;
  teamCountByType: Record<VehicleType, number>;
}

export function computeSegmentCrowding(teams: TeamInput[]): CrowdingResult {
  const countByType: Record<VehicleType, number> = {
    COMPACT: 0,
    SEDAN: 0,
    SUV: 0,
    TRUCK: 0,
    SPORTS_CAR: 0,
  };

  for (const team of teams) {
    const typesThisTeam = new Set<VehicleType>();
    for (const model of team.vehicleSection.models) {
      typesThisTeam.add(model.vehicleType);
    }
    for (const vt of typesThisTeam) {
      countByType[vt]++;
    }
  }

  const types: VehicleType[] = [
    "COMPACT",
    "SEDAN",
    "SUV",
    "TRUCK",
    "SPORTS_CAR",
  ];
  const marketingFactor: Record<VehicleType, number> = {} as Record<
    VehicleType,
    number
  >;
  const priceForcedDown: Record<VehicleType, number> = {} as Record<
    VehicleType,
    number
  >;

  for (const vt of types) {
    const n = countByType[vt];
    if (n >= 4) {
      marketingFactor[vt] = CROWDING_4PLUS_TEAMS_MKT_PENALTY;
      priceForcedDown[vt] = CROWDING_4PLUS_PRICE_REDUCTION;
    } else if (n === 3) {
      marketingFactor[vt] = CROWDING_3_TEAMS_MKT_PENALTY;
      priceForcedDown[vt] = 0;
    } else {
      marketingFactor[vt] = 1.0;
      priceForcedDown[vt] = 0;
    }
  }

  return {
    marketingFactor,
    priceForcedDown,
    teamCountByType: countByType,
  };
}

// ── Regional glut ─────────────────────────────────────────────────────────────

/**
 * Returns glut discount (0..N) per region+type.
 * A glut_discount of 0.12 means effective price = salePrice × (1 - 0.12)
 */
export function computeRegionalGlutDiscounts(
  teams: TeamInput[],
  demandByTypeByRegion: Record<VehicleType, Record<Region, number>>
): Record<VehicleType, Record<Region, number>> {
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

  // Compute total production per type × region
  const supplyByTypeByRegion: Record<VehicleType, Record<Region, number>> =
    {} as Record<VehicleType, Record<Region, number>>;

  for (const vt of types) {
    supplyByTypeByRegion[vt] = {} as Record<Region, number>;
    for (const region of regions) {
      supplyByTypeByRegion[vt][region] = 0;
    }
  }

  for (const team of teams) {
    for (const model of team.vehicleSection.models) {
      const vt = model.vehicleType;
      const run = team.manufacturingSection.productionRuns.find(
        (r) => r.modelId === model.id
      );
      const prodModel = team.productionSection.models.find(
        (m) => m.modelId === model.id
      );
      if (!run || !prodModel) continue;

      const totalUnits = run.units;
      const alloc = prodModel.regionalAllocation;

      for (const region of regions) {
        const regionKey = region as keyof typeof alloc;
        const pct = alloc[regionKey] ?? 0;
        supplyByTypeByRegion[vt][region] += Math.round(
          totalUnits * (pct / 100)
        );
      }
    }
  }

  // Compute glut discount per type × region
  const glutDiscounts: Record<VehicleType, Record<Region, number>> =
    {} as Record<VehicleType, Record<Region, number>>;

  for (const vt of types) {
    glutDiscounts[vt] = {} as Record<Region, number>;
    for (const region of regions) {
      const supply = supplyByTypeByRegion[vt][region];
      const demand = demandByTypeByRegion[vt]?.[region] ?? 0;

      if (demand > 0 && supply > demand) {
        const glutRatio = supply / demand;
        const discount = (glutRatio - 1.0) * GLUT_DISCOUNT_COEFFICIENT;
        glutDiscounts[vt][region] = Math.min(discount, 0.9); // cap at 90% discount
      } else {
        glutDiscounts[vt][region] = 0;
      }
    }
  }

  return glutDiscounts;
}

// ── Talent war ────────────────────────────────────────────────────────────────

export function computeTalentWarPenalty(totalIndustryRdSpend: number): number {
  if (totalIndustryRdSpend <= TALENT_WAR_THRESHOLD) return 0;
  const excess = totalIndustryRdSpend - TALENT_WAR_THRESHOLD;
  const penalty =
    (excess / TALENT_WAR_THRESHOLD) * TALENT_WAR_PENALTY_RATE;
  return Math.min(penalty, TALENT_WAR_PENALTY_CAP);
}
