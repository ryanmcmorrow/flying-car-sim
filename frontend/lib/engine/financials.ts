// ── Revenue, COGS, Space Costs, Repair, Inventory ────────────────────────────

import {
  SPACE_COSTS,
  INVENTORY_CARRYING_COST,
  AVG_REPAIR_VALUE,
  BASE_REPAIR_RATE,
  PARTS_BASE_RELIABILITY,
  ENGINE_RELIABILITY_MOD,
  RD_MFG_EFFICIENCY_MULTIPLIERS,
  MFG_COST_HARD_CAP_REDUCTION,
  RD_RECURRING_COSTS,
  TECH_TREE_COSTS,
  FEATURE_DEMAND_BONUS,
  RD_QUALITY_BONUSES,
} from "./constants";
import type { VehicleType } from "./constants";
import type { TeamInput } from "./types";
import { computeModelUnitCost } from "@/lib/decision-utils";

// ── R&D spend computation ─────────────────────────────────────────────────────

export function computeTeamRdSpend(
  team: TeamInput,
  talentWarPenalty: number
): { totalRdSpend: number; effectiveRdSpend: number; unlocksPurchased: string[] } {
  const rd = team.rdSection;
  let spend = 0;

  // Recurring subscriptions
  for (const [key, enabled] of Object.entries(rd.recurring)) {
    if (enabled) {
      spend += RD_RECURRING_COSTS[key] ?? 0;
    }
  }

  // Tech tree unlocks (only ones not already owned)
  const unlocksPurchased: string[] = [];
  for (const key of rd.techTreeUnlocks) {
    if (!team.existingRdUnlocks.includes(key)) {
      spend += TECH_TREE_COSTS[key] ?? 0;
      unlocksPurchased.push(key);
    }
  }

  // Charge full spend to cash; talent war only reduces benefit, not cost
  const totalRdSpend = spend;
  const effectiveRdSpend = spend * (1 - talentWarPenalty);
  return { totalRdSpend, effectiveRdSpend, unlocksPurchased };
}

// ── Manufacturing efficiency from R&D ────────────────────────────────────────

export function computeMfgCostMultiplier(rdUnlocks: string[]): number {
  const mfgKeys = [
    "mfg_efficiency_1",
    "mfg_efficiency_2",
    "mfg_efficiency_3",
    "mfg_mastery",
  ];

  let multiplier = 1.0;
  for (const key of mfgKeys) {
    if (rdUnlocks.includes(key)) {
      multiplier *= RD_MFG_EFFICIENCY_MULTIPLIERS[key];
    }
  }

  // Hard cap: max 35% reduction (multiplier >= 0.65)
  return Math.max(multiplier, 1.0 - MFG_COST_HARD_CAP_REDUCTION);
}

// ── Unit cost with R&D + scarcity ─────────────────────────────────────────────

export function computeEffectiveUnitCost(
  model: TeamInput["vehicleSection"]["models"][number],
  rdUnlocks: string[],
  tripleTestedPenalty: number,
  massProducedPenalty: number,
  worldEventMfgCostModifier: number
): number {
  const baseCost = computeModelUnitCost(model);
  const mfgMultiplier = computeMfgCostMultiplier(rdUnlocks);

  let cost = baseCost * mfgMultiplier;

  // Scarcity penalty
  if (model.internals === "triple_tested") {
    cost += tripleTestedPenalty;
  } else if (model.internals === "mass_produced") {
    cost += massProducedPenalty;
  }

  // World event manufacturing cost modifier
  cost = cost * (1 + worldEventMfgCostModifier);

  return Math.round(cost);
}

// ── Quality score for demand calculation ─────────────────────────────────────

export function computeQualityScore(
  model: TeamInput["vehicleSection"]["models"][number],
  rdUnlocks: string[]
): number {
  const partsBase = PARTS_BASE_RELIABILITY[model.internals] ?? 1.0;
  const engineMod = ENGINE_RELIABILITY_MOD[model.engine] ?? 1.0;
  const reliabilityScore = partsBase * engineMod;

  // Feature demand bonus
  let featureBonus = 0;
  for (const feature of model.features) {
    featureBonus += FEATURE_DEMAND_BONUS[feature] ?? 0;
  }

  // R&D quality bonuses
  let rdBonus = 0;
  for (const key of rdUnlocks) {
    rdBonus += RD_QUALITY_BONUSES[key] ?? 0;
  }

  let qualityScore = reliabilityScore * (1 + featureBonus + rdBonus);

  // full_autonomy multiplier
  if (rdUnlocks.includes("full_autonomy")) {
    qualityScore *= 1.10;
  }

  return qualityScore;
}

// ── Space cost computation ────────────────────────────────────────────────────

export interface SpaceCostResult {
  spaceCost: number;
  spaceSize: string;
  spaceOwnership: string;
  newSpaceState: { size: "small" | "medium" | "large"; ownership: "buy" } | null;
}

export function computeSpaceCost(
  team: TeamInput
): SpaceCostResult {
  const mfg = team.manufacturingSection;
  const action = mfg.spaceAction;
  const size = mfg.spaceSize;
  const ownership = mfg.spaceOwnership;

  if (action === "keep") {
    const currentSpace = team.currentSpace;
    if (!currentSpace) {
      // No space: nothing to keep — treat as zero cost
      return {
        spaceCost: 0,
        spaceSize: "none",
        spaceOwnership: "none",
        newSpaceState: null,
      };
    }
    const spaceData = SPACE_COSTS[currentSpace.size];
    if (currentSpace.ownership === "buy") {
      return {
        spaceCost: spaceData.maintenance,
        spaceSize: currentSpace.size,
        spaceOwnership: "buy",
        newSpaceState: currentSpace,
      };
    } else {
      // Renting — pay rent
      return {
        spaceCost: spaceData.rent,
        spaceSize: currentSpace.size,
        spaceOwnership: "rent",
        newSpaceState: null,
      };
    }
  }

  if (action === "new" || action === "upgrade") {
    if (!size) {
      return {
        spaceCost: 0,
        spaceSize: "none",
        spaceOwnership: "none",
        newSpaceState: null,
      };
    }
    const spaceData = SPACE_COSTS[size];
    if (ownership === "buy") {
      return {
        spaceCost: spaceData.buyPrice,
        spaceSize: size,
        spaceOwnership: "buy",
        newSpaceState: { size, ownership: "buy" },
      };
    } else {
      return {
        spaceCost: spaceData.rent,
        spaceSize: size,
        spaceOwnership: "rent",
        newSpaceState: null,
      };
    }
  }

  // sell or no action
  return {
    spaceCost: 0,
    spaceSize: "none",
    spaceOwnership: "none",
    newSpaceState: null,
  };
}

// ── Fleet repair revenue ──────────────────────────────────────────────────────

export function computeRepairRevenue(
  installedBase: Partial<Record<VehicleType, number>>,
  modelResults: Array<{
    vehicleType: VehicleType;
    reliabilityScore: number;
    fleetRepairRate: number;
  }>
): number {
  let totalRepairRevenue = 0;

  const types: VehicleType[] = [
    "COMPACT",
    "SEDAN",
    "SUV",
    "TRUCK",
    "SPORTS_CAR",
  ];

  for (const vt of types) {
    const baseUnits = installedBase[vt] ?? 0;
    if (baseUnits === 0) continue;

    // Find a model of this type to get repair rate (use first one found, or default)
    const modelResult = modelResults.find((m) => m.vehicleType === vt);
    const repairRate = modelResult
      ? modelResult.fleetRepairRate
      : BASE_REPAIR_RATE[vt];

    totalRepairRevenue += baseUnits * repairRate * AVG_REPAIR_VALUE;
  }

  return Math.round(totalRepairRevenue);
}

// ── Fleet repair rate for a model ────────────────────────────────────────────

export function computeFleetRepairRate(
  vehicleType: VehicleType,
  reliabilityScore: number
): number {
  const baseRate = BASE_REPAIR_RATE[vehicleType];
  return baseRate / reliabilityScore;
}

// ── Inventory carrying costs ──────────────────────────────────────────────────

export function computeInventoryCarryingCost(
  priorInventory: Partial<Record<VehicleType, number>>
): number {
  let total = 0;
  const types: VehicleType[] = [
    "COMPACT",
    "SEDAN",
    "SUV",
    "TRUCK",
    "SPORTS_CAR",
  ];
  for (const vt of types) {
    const units = priorInventory[vt] ?? 0;
    total += units * (INVENTORY_CARRYING_COST[vt] ?? 0);
  }
  return total;
}

// ── Engineering fees ──────────────────────────────────────────────────────────

export function computeEngineeringFeesForTeam(team: TeamInput): number {
  const ENGINEERING_FEES: Record<VehicleType, number> = {
    COMPACT: 3_000_000,
    SEDAN: 4_000_000,
    SUV: 5_000_000,
    TRUCK: 5_000_000,
    SPORTS_CAR: 6_000_000,
  };

  let total = 0;
  for (const model of team.vehicleSection.models) {
    if (model.isNewDesign) {
      // Check if this type exists in the team's installed base
      // If it's a new design for a type they don't currently have, charge fee
      const installedCount = team.installedBase[model.vehicleType] ?? 0;
      if (installedCount === 0) {
        total += ENGINEERING_FEES[model.vehicleType] ?? 0;
      }
      // Even if they have an installed base, isNewDesign means they're redesigning
      // Per spec: if isNewDesign=true, add engineering fee
      else {
        total += ENGINEERING_FEES[model.vehicleType] ?? 0;
      }
    }
  }
  return total;
}
