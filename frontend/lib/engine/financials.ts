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
import { computeModelUnitCost, computeEngineeringFee } from "@/lib/decision-utils";

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

  // Market intel purchases ($2M each, one-time — only buy if not already owned)
  const INTEL_COST = 2_000_000;
  for (const key of rd.intelPurchases ?? []) {
    if (!team.existingRdUnlocks.includes(key)) {
      spend += INTEL_COST;
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

// ── Facilities cost computation (multi-region) ───────────────────────────────

export interface FacilitiesCostResult {
  totalCost: number;
  totalCapacity: number;
  /** Regions with at least one active facility this round */
  activeRegions: Set<string>;
  /** Facilities to persist into game state as owned going forward */
  newOwnedFacilities: Array<{ region: string; size: string }>;
}

/**
 * Normalize a team's stored facilities into the array form the engine expects.
 * Supports the legacy single-space `{ size, ownership }` shape (owned → MIDWEST).
 */
export function parseFacilities(
  rawSpace: unknown
): Array<{ region: string; size: "small" | "medium" | "large" }> {
  if (Array.isArray(rawSpace)) {
    return rawSpace as Array<{ region: string; size: "small" | "medium" | "large" }>;
  }
  if (rawSpace && (rawSpace as { ownership?: string }).ownership === "buy") {
    return [{ region: "MIDWEST", size: (rawSpace as { size: string }).size as "small" | "medium" | "large" }];
  }
  return [];
}

export function computeSpaceCost(team: TeamInput): FacilitiesCostResult {
  let totalCost = 0;
  let totalCapacity = 0;
  const activeRegions = new Set<string>();
  const newOwnedFacilities: Array<{ region: string; size: string }> = [];

  // Existing owned facilities: always persist, pay maintenance
  for (const f of team.currentFacilities) {
    const spaceData = SPACE_COSTS[f.size as "small" | "medium" | "large"];
    if (!spaceData) continue;
    totalCost += spaceData.maintenance;
    totalCapacity += spaceData.capacity;
    activeRegions.add(f.region);
    newOwnedFacilities.push({ region: f.region, size: f.size });
  }

  const ownedKeys = new Set(team.currentFacilities.map((f) => `${f.region}::${f.size}`));

  // New facilities being added this round
  for (const f of team.manufacturingSection.newFacilities ?? []) {
    const key = `${f.region}::${f.size}`;
    if (ownedKeys.has(key)) continue; // already counted above
    const spaceData = SPACE_COSTS[f.size];
    if (!spaceData) continue;
    totalCapacity += spaceData.capacity;
    activeRegions.add(f.region);
    if (f.ownership === "buy") {
      totalCost += spaceData.buyPrice;
      newOwnedFacilities.push({ region: f.region, size: f.size });
    } else {
      totalCost += spaceData.rent;
    }
  }

  return { totalCost, totalCapacity, activeRegions, newOwnedFacilities };
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
  let total = 0;
  for (const model of team.vehicleSection.models) {
    if (model.isNewDesign) {
      total += computeEngineeringFee(model.vehicleType);
    }
  }
  return total;
}
