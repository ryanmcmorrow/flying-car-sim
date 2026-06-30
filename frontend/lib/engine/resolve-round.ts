// ── Round Resolution Orchestrator (Pure Function) ────────────────────────────
// No DB calls. Takes ResolveRoundInput, returns ResolveRoundOutput.

import type { ResolveRoundInput, ResolveRoundOutput, ModelResult, TeamRoundResult, IndustrySnapshot, NewRdUnlock, InstalledBaseUpdate } from "./types";
import type { Region, VehicleType } from "./constants";
import {
  VEHICLE_TYPES,
  REGIONS,
  YEAR1_DEMAND_BY_TYPE_BY_REGION,
  BRAND_PERCEPTION_PARAMS,
  PRICE_ELASTICITY,
  VEHICLE_PRICE_RANGE,
  MARKETING_CHANNEL_EFFECTIVENESS,
  PARTS_BASE_RELIABILITY,
  ENGINE_RELIABILITY_MOD,
  INVENTORY_CARRYING_COST,
  RD_RECURRING_COSTS,
  TECH_TREE_COSTS,
  AVG_REPAIR_VALUE,
} from "./constants";
import { getPolicyDemandFactor, computeThisRoundDemand, computeNextRoundDemand } from "./demand";
import { computeSupplyChainScarcity, computeSegmentCrowding, computeRegionalGlutDiscounts, computeTalentWarPenalty } from "./scarcity";
import { computeReliabilityScore, getRecallTier, computeBrandPerceptionDelta, computeNewPublicPerception } from "./perception";
import { computeTeamRdSpend, computeEffectiveUnitCost, computeQualityScore, computeSpaceCost, computeRepairRevenue, computeFleetRepairRate, computeInventoryCarryingCost, computeEngineeringFeesForTeam } from "./financials";
import type { FacilitiesCostResult } from "./financials";
import { SHIPPING_COST_PER_UNIT, MONOPOLY_DEMAND_BONUS } from "./constants";
import { computePolicyScoreUpdate } from "./lobbying";
import { TECH_TREE_DEF } from "@/lib/decision-utils";

const EXCLUSIVITY_WINDOW = 1; // rounds of exclusivity for first-mover tier-2+ R&D unlocks

export function resolveRound(input: ResolveRoundInput): ResolveRoundOutput {
  const {
    roundNumber,
    teams,
    worldEvent,
    priorFlyingDemand,
    priorTraditionalDemand,
    priorDemandByTypeByRegion,
    policyScore,
    publicPerception,
    teamBrandPerceptions,
    teamSpaces,
    perceptionPolicyBonusPending,
    segmentCrowdingRounds,
  } = input;

  // If no teams, return empty output
  if (teams.length === 0) {
    return buildEmptyOutput(input);
  }

  // ── Step 1: Load prior state (already in input) ──────────────────────────

  // ── Step 2: Apply world event immediate effects ───────────────────────────
  const worldEventDemandMod = worldEvent.demandModifier ?? 0;
  const worldEventMfgCostMod = worldEvent.manufacturingCostModifier ?? 0;
  const worldEventPerceptionMod = worldEvent.perceptionModifier ?? 0;
  const worldEventPolicyMod = worldEvent.policyModifier ?? 0;
  const worldEventRegionalMods = worldEvent.regionalDemandModifiers ?? {};
  const worldEventTypeMods = worldEvent.typeModifiers ?? {};

  // ── Step 3: Apply policy demand factor ───────────────────────────────────
  // Account for world event policy modifier in this round's score
  const effectivePolicyScore = Math.max(-20, Math.min(20, policyScore + worldEventPolicyMod));
  const policyDemandFactor = getPolicyDemandFactor(effectivePolicyScore);

  if (policyDemandFactor === 0) {
    // Flying cars outlawed — all revenue is 0
    return buildZeroDemandOutput(input);
  }

  // ── Step 4: Compute this round's demand ──────────────────────────────────
  const basePriorDemand = Object.keys(priorDemandByTypeByRegion).length > 0
    ? priorDemandByTypeByRegion
    : YEAR1_DEMAND_BY_TYPE_BY_REGION;

  const demandByTypeByRegion = computeThisRoundDemand(
    basePriorDemand as Record<VehicleType, Record<Region, number>>,
    policyDemandFactor,
    worldEventDemandMod,
    worldEventRegionalMods as Partial<Record<Region, number>>,
    worldEventTypeMods as Partial<Record<VehicleType, number>>,
    roundNumber
  );

  // ── Step 4.5: Priced-out buyers spill to cheaper alternatives ───────────────
  // Each segment has a budget floor (VEHICLE_PRICE_RANGE.low). When the cheapest
  // car available in a segment is above that floor, buyers who can't afford it
  // go looking in other segments for something within their budget. The further
  // above the floor the cheapest option sits, the more buyers spill out (capped
  // at 40% of the segment).
  {
    // Cheapest sale price offered per type × region (only models actually allocated there)
    const cheapestByTypeByRegion: Partial<Record<VehicleType, Partial<Record<Region, number>>>> = {};
    for (const team of teams) {
      for (const model of team.vehicleSection.models) {
        const prodModel = team.productionSection.models.find((m) => m.modelId === model.id);
        if (!prodModel?.salePrice) continue;
        for (const region of REGIONS) {
          const alloc = prodModel.regionalAllocation[region as keyof typeof prodModel.regionalAllocation] ?? 0;
          if (alloc <= 0) continue;
          const vt = model.vehicleType;
          if (!cheapestByTypeByRegion[vt]) cheapestByTypeByRegion[vt] = {};
          const prev = cheapestByTypeByRegion[vt]![region];
          cheapestByTypeByRegion[vt]![region] = prev === undefined ? prodModel.salePrice : Math.min(prev, prodModel.salePrice);
        }
      }
    }

    const deltas: Partial<Record<VehicleType, Partial<Record<Region, number>>>> = {};

    for (const sourceVt of VEHICLE_TYPES) {
      const budgetFloor = VEHICLE_PRICE_RANGE[sourceVt].low;

      for (const region of REGIONS) {
        const baseDemand = demandByTypeByRegion[sourceVt]?.[region] ?? 0;
        if (baseDemand === 0) continue;

        const cheapest = cheapestByTypeByRegion[sourceVt]?.[region];
        if (cheapest === undefined || cheapest <= budgetFloor) continue;

        // Fraction of buyers priced out: scales linearly from 0 (at budgetFloor)
        // to 40% (when cheapest is 2× the budgetFloor). Capped at 40%.
        const priceGap = cheapest - budgetFloor;
        const pricedOutFraction = Math.min(0.40, priceGap / budgetFloor);
        const spilloverBuyers = Math.round(baseDemand * pricedOutFraction);
        if (spilloverBuyers === 0) continue;

        // Find other segments where something exists priced ≤ cheapest (affordable for spilled buyers)
        const alternatives: VehicleType[] = [];
        for (const destVt of VEHICLE_TYPES) {
          if (destVt === sourceVt) continue;
          const destCheapest = cheapestByTypeByRegion[destVt]?.[region];
          if (destCheapest !== undefined && destCheapest <= cheapest) {
            alternatives.push(destVt);
          }
        }
        if (alternatives.length === 0) continue;

        if (!deltas[sourceVt]) deltas[sourceVt] = {};
        deltas[sourceVt]![region] = (deltas[sourceVt]![region] ?? 0) - spilloverBuyers;

        const perAlt = Math.round(spilloverBuyers / alternatives.length);
        for (const destVt of alternatives) {
          if (!deltas[destVt]) deltas[destVt] = {};
          deltas[destVt]![region] = (deltas[destVt]![region] ?? 0) + perAlt;
        }
      }
    }

    // Apply deltas
    for (const vt of VEHICLE_TYPES) {
      const vtDeltas = deltas[vt];
      if (!vtDeltas) continue;
      for (const region of REGIONS) {
        if (!demandByTypeByRegion[vt]) continue;
        demandByTypeByRegion[vt][region] = Math.max(
          0,
          (demandByTypeByRegion[vt][region] ?? 0) + (vtDeltas[region] ?? 0)
        );
      }
    }
  }

  // ── Step 5: Industry-level aggregates for scarcity ────────────────────────
  const scarcityResult = computeSupplyChainScarcity(teams);
  const crowdingResult = computeSegmentCrowding(teams);

  // Talent war: total R&D spend across all teams (rough estimate before final computation)
  let totalIndustryRdSpend = 0;
  for (const team of teams) {
    for (const [key, enabled] of Object.entries(team.rdSection.recurring)) {
      if (enabled) {
        totalIndustryRdSpend += RD_RECURRING_COSTS[key] ?? 0;
      }
    }
    for (const key of team.rdSection.techTreeUnlocks) {
      if (!team.existingRdUnlocks.includes(key)) {
        totalIndustryRdSpend += TECH_TREE_COSTS[key] ?? 0;
      }
    }
  }

  const talentWarPenalty = computeTalentWarPenalty(totalIndustryRdSpend);

  // ── Step 6: Per-team unit economics ──────────────────────────────────────
  interface TeamCalcs {
    rdSpend: number;
    effectiveRdSpend: number;
    unlocksPurchased: string[];
    allRdUnlocks: string[]; // existing + this round's
    effectiveUnitCostByModelId: Record<string, number>;
    reliabilityByModelId: Record<string, number>;
    qualityScoreByModelId: Record<string, number>;
    engineeringFees: number;
    spaceCostResult: FacilitiesCostResult;
  }

  const teamCalcs: Record<string, TeamCalcs> = {};

  for (const team of teams) {
    const { totalRdSpend, effectiveRdSpend, unlocksPurchased } = computeTeamRdSpend(team, talentWarPenalty);
    const allRdUnlocks = [...team.existingRdUnlocks, ...unlocksPurchased];

    const effectiveUnitCostByModelId: Record<string, number> = {};
    const reliabilityByModelId: Record<string, number> = {};
    const qualityScoreByModelId: Record<string, number> = {};

    for (const model of team.vehicleSection.models) {
      effectiveUnitCostByModelId[model.id] = computeEffectiveUnitCost(
        model,
        allRdUnlocks,
        scarcityResult.tripleTestedPenaltyPerUnit,
        scarcityResult.massProducedPenaltyPerUnit,
        worldEventMfgCostMod
      );
      reliabilityByModelId[model.id] = computeReliabilityScore(model.internals, model.engine);
      qualityScoreByModelId[model.id] = computeQualityScore(model, allRdUnlocks);
    }

    const engineeringFees = computeEngineeringFeesForTeam(team);
    const spaceCostResult = computeSpaceCost(team);

    teamCalcs[team.teamId] = {
      rdSpend: totalRdSpend,
      effectiveRdSpend,
      unlocksPurchased,
      allRdUnlocks,
      effectiveUnitCostByModelId,
      reliabilityByModelId,
      qualityScoreByModelId,
      engineeringFees,
      spaceCostResult,
    };
  }

  // ── Step 7: Marketing spend per segment ──────────────────────────────────
  interface TeamMarketingCalcs {
    categorySpend: number;
    brandSpend: number;
    isAttack: boolean;
    attackTargetTeamId: string | null;
    brandSpendByType: Record<VehicleType, number>;
    brandSpendByTypeByRegion: Record<VehicleType, Record<Region, number>>;
  }

  const teamMarketingCalcs: Record<string, TeamMarketingCalcs> = {};

  for (const team of teams) {
    const mkt = team.marketingSection;
    const totalBudget = mkt.totalBudget ?? 0;
    const isAttack = mkt.tone === "attack";
    const categorySplit = Math.min(100, Math.max(0, mkt.categorySplit ?? 0));
    const categorySpend = Math.round(totalBudget * categorySplit / 100);
    const brandSpend = totalBudget - categorySpend;

    // Compute channel-weighted effectiveness per type
    const channelWeights = mkt.channels ?? {
      tv_online: 0,
      radio: 0,
      print: 0,
      paid_search: 0,
    };
    const totalChannelPct =
      (channelWeights.tv_online ?? 0) +
      (channelWeights.radio ?? 0) +
      (channelWeights.print ?? 0) +
      (channelWeights.paid_search ?? 0);

    // Channel effectiveness multiplier per vehicle type
    const channelEffByType: Record<VehicleType, number> = {} as Record<VehicleType, number>;
    for (const vt of VEHICLE_TYPES) {
      let eff = 0;
      if (totalChannelPct > 0) {
        for (const ch of ["tv_online", "radio", "print", "paid_search"] as const) {
          const pct = (channelWeights[ch] ?? 0) / totalChannelPct;
          eff += pct * (MARKETING_CHANNEL_EFFECTIVENESS[ch][vt] ?? 1.0);
        }
      } else {
        eff = 1.0;
      }
      channelEffByType[vt] = eff;
    }

    // Regional budget split
    const brandSpendByTypeByRegion: Record<VehicleType, Record<Region, number>> =
      {} as Record<VehicleType, Record<Region, number>>;

    for (const vt of VEHICLE_TYPES) {
      brandSpendByTypeByRegion[vt] = {} as Record<Region, number>;

      // Base brand spend weighted by channel effectiveness
      const typeEffectiveBrandSpend = brandSpend * channelEffByType[vt];

      for (const region of REGIONS) {
        let regionPct: number;
        if (mkt.regionalTargeting === "targeted" && mkt.regionalBudgetSplit) {
          regionPct = (mkt.regionalBudgetSplit[region as keyof typeof mkt.regionalBudgetSplit] ?? 0) / 100;
        } else {
          regionPct = 1 / REGIONS.length;
        }

        const regionalEfficiencyBonus =
          mkt.regionalTargeting === "targeted" ? 1.2 : 1.0;

        brandSpendByTypeByRegion[vt][region] =
          typeEffectiveBrandSpend * regionPct * regionalEfficiencyBonus;
      }
    }

    // brandSpendByType (total per type)
    const brandSpendByType: Record<VehicleType, number> = {} as Record<VehicleType, number>;
    for (const vt of VEHICLE_TYPES) {
      brandSpendByType[vt] = Object.values(brandSpendByTypeByRegion[vt]).reduce(
        (a, b) => a + b,
        0
      );
    }

    teamMarketingCalcs[team.teamId] = {
      categorySpend,
      brandSpend,
      isAttack,
      attackTargetTeamId: isAttack ? (mkt.attackTargetTeamId ?? null) : null,
      brandSpendByType,
      brandSpendByTypeByRegion,
    };
  }

  // Pre-compute total attack spend aimed at each team (used in Step 8 and brand delta)
  const incomingAttackSpendByTeamId: Record<string, number> = {};
  for (const team of teams) {
    const mkt = teamMarketingCalcs[team.teamId];
    if (!mkt?.isAttack || !mkt.attackTargetTeamId) continue;
    incomingAttackSpendByTeamId[mkt.attackTargetTeamId] =
      (incomingAttackSpendByTeamId[mkt.attackTargetTeamId] ?? 0) + mkt.brandSpend;
  }

  // ── Step 8: Market share per team × type × region ─────────────────────────
  const unitsDemandedByModelByRegion: Record<string, Record<string, Record<Region, number>>> = {};
  const effectivePriceByModelByRegion: Record<string, Record<string, Record<Region, number>>> = {};
  // clearingPrice[teamId][modelId][region]
  const clearingPriceByModelByRegion: Record<string, Record<string, Record<Region, number>>> = {};

  // Glut discounts (need supply totals first)
  const glutDiscounts = computeRegionalGlutDiscounts(teams, demandByTypeByRegion);

  for (const vt of VEHICLE_TYPES) {
    const priceRange = VEHICLE_PRICE_RANGE[vt];

    for (const region of REGIONS) {
      const baseDemandHere = demandByTypeByRegion[vt]?.[region] ?? 0;
      if (baseDemandHere === 0) continue;

      // Find all teams competing in this type × region
      const competitors: Array<{
        team: (typeof teams)[number];
        model: (typeof teams)[number]["vehicleSection"]["models"][number];
        prodModel: (typeof teams)[number]["productionSection"]["models"][number];
        run: (typeof teams)[number]["manufacturingSection"]["productionRuns"][number];
        salePrice: number;
        qualityScore: number;
        marketingSpend: number;
        regionAlloc: number;
      }> = [];

      for (const team of teams) {
        for (const model of team.vehicleSection.models) {
          if (model.vehicleType !== vt) continue;
          const prodModel = team.productionSection.models.find((m) => m.modelId === model.id);
          const run = team.manufacturingSection.productionRuns.find((r) => r.modelId === model.id);
          if (!prodModel || !run) continue;
          const regionAlloc = prodModel.regionalAllocation[region as keyof typeof prodModel.regionalAllocation] ?? 0;
          if (regionAlloc <= 0) continue;
          competitors.push({
            team, model, prodModel, run,
            salePrice: prodModel.salePrice,
            qualityScore: teamCalcs[team.teamId]?.qualityScoreByModelId[model.id] ?? 1.0,
            marketingSpend: teamMarketingCalcs[team.teamId]?.brandSpendByTypeByRegion[vt][region] ?? 0,
            regionAlloc,
          });
        }
      }

      if (competitors.length === 0) continue;

      // ── Absolute demand curve ─────────────────────────────────────────────
      // Weighted average price by units allocated in this region
      let totalWeightedPrice = 0, totalAllocUnits = 0;
      for (const c of competitors) {
        const units = Math.round(c.run.units * c.regionAlloc / 100);
        totalWeightedPrice += c.salePrice * units;
        totalAllocUnits += units;
      }
      const industryAvgPrice = totalAllocUnits > 0 ? totalWeightedPrice / totalAllocUnits : competitors[0].salePrice;

      let absDemandMultiplier: number;
      if (industryAvgPrice <= priceRange.low) {
        // Below floor: small boost, capped at +15%
        absDemandMultiplier = Math.min(1.15, 1.0 + 0.15 * (priceRange.low - industryAvgPrice) / priceRange.low);
      } else if (industryAvgPrice <= priceRange.high) {
        // Normal range: no adjustment
        absDemandMultiplier = 1.0;
      } else {
        // Above ceiling: linear demand destruction, floor at 0.25×
        const overshoot = (industryAvgPrice - priceRange.high) / priceRange.high;
        absDemandMultiplier = Math.max(0.25, 1.0 - 0.75 * overshoot);
      }

      // Monopoly pricing power: sole brand in segment gets +10% demand
      const competitorCount = crowdingResult.teamCountByType[vt];
      if (competitorCount === 1) {
        absDemandMultiplier = Math.min(1.5, absDemandMultiplier * (1 + MONOPOLY_DEMAND_BONUS));
      }

      const demandHere = Math.round(baseDemandHere * absDemandMultiplier);

      // Quality ratchet: crowded segments raise consumer expectations over time.
      // Mass-produced vehicles take an increasing demand penalty in mature crowded segments.
      const crowdingRoundsForType = segmentCrowdingRounds?.[vt] ?? 0;

      // ── Relative demand share ─────────────────────────────────────────────
      const avgPrice = competitors.reduce((s, c) => s + c.salePrice, 0) / competitors.length;
      const crowdingFactor = crowdingResult.marketingFactor[vt];
      const priceForcedDown = crowdingResult.priceForcedDown[vt];
      const effectiveAvgPrice = avgPrice * (1 - priceForcedDown);
      const anyBrandSpend = competitors.some((c) => c.marketingSpend > 0);

      const demandScores: number[] = [];
      const baseScores: number[] = []; // score without priceFactor, for clearing price calc

      for (const c of competitors) {
        const brandPerception = teamBrandPerceptions[c.team.teamId] ?? 0;
        const { divisor, floor } = BRAND_PERCEPTION_PARAMS[vt];
        const brandMulti = Math.max(floor, 1.0 + brandPerception / divisor);

        // Diminishing returns: sqrt curve so doubling spend ≠ doubling share.
        // Each $1M = 1 unit of "effective spend"; sqrt(25M) = 5, sqrt(100M) = 10.
        // Attack ads from competitors partially cancel this team's brand spend.
        // Attack effect also has diminishing returns (sqrt) — can't fully zero out a
        // well-funded brand, but $36M of attacks against $10M of spend hurts badly.
        let marketingShareRaw: number;
        if (!anyBrandSpend) {
          marketingShareRaw = 1.0;
        } else {
          const rawSpend = c.marketingSpend;
          const attackSpend = incomingAttackSpendByTeamId[c.team.teamId] ?? 0;
          // Attacks cancel up to 70% of the target's brand spend; sqrt curve on attack
          const attackCancelFraction = attackSpend > 0
            ? Math.min(0.70, Math.sqrt(attackSpend / 1_000_000) / Math.max(1, Math.sqrt(rawSpend / 1_000_000)))
            : 0;
          const effectiveSpend = rawSpend > 0
            ? Math.sqrt(rawSpend * (1 - attackCancelFraction) / 1_000_000)
            : 0.1;
          marketingShareRaw = effectiveSpend * crowdingFactor;
        }

        // Quality ratchet penalty: mass-produced vehicles lose demand in mature crowded segments
        const massProducedPenalty =
          c.model.internals === "mass_produced" && crowdingRoundsForType >= 3 ? 0.25 :
          c.model.internals === "mass_produced" && crowdingRoundsForType >= 1 ? 0.12 : 0;

        // Model age penalty: stale models that haven't been refreshed lose demand year-over-year
        const modelAge = roundNumber - (c.model.modelYear ?? roundNumber);
        const agePenalty = modelAge >= 3 ? 0.20 : modelAge >= 2 ? 0.12 : modelAge >= 1 ? 0.05 : 0;

        const baseScore = brandMulti * c.qualityScore * marketingShareRaw * (1 - massProducedPenalty) * (1 - agePenalty);
        baseScores.push(baseScore);

        // Luxury Chassis: reduced price compression for SUV/Sports Car
        const teamPriceForcedDown =
          (vt === "SUV" || vt === "SPORTS_CAR") &&
          (teamCalcs[c.team.teamId]?.allRdUnlocks ?? []).includes("luxury_chassis")
            ? priceForcedDown * 0.35
            : priceForcedDown;

        let priceFactor: number;
        const effectiveSalePrice = c.salePrice * (1 - teamPriceForcedDown);

        if (vt === "SPORTS_CAR") {
          if (effectiveSalePrice > effectiveAvgPrice) {
            priceFactor = 1.0 + Math.min(0.15, 0.375 * (effectiveSalePrice - effectiveAvgPrice) / effectiveAvgPrice);
          } else {
            priceFactor = 1.0 - 0.5 * (effectiveAvgPrice - effectiveSalePrice) / effectiveAvgPrice;
          }
        } else {
          const elasticity = PRICE_ELASTICITY[vt];
          priceFactor = effectiveAvgPrice > 0
            ? 1.0 + elasticity * (effectiveAvgPrice - effectiveSalePrice) / effectiveAvgPrice
            : 1.0;
        }

        demandScores.push(Math.max(0, baseScore * Math.max(0.1, priceFactor)));
      }

      const totalDemandScore = demandScores.reduce((a, b) => a + b, 0);

      for (let i = 0; i < competitors.length; i++) {
        const c = competitors[i];
        const share = totalDemandScore > 0 ? demandScores[i] / totalDemandScore : 1 / competitors.length;
        const unitsDemanded = Math.round(share * demandHere);

        if (!unitsDemandedByModelByRegion[c.team.teamId]) unitsDemandedByModelByRegion[c.team.teamId] = {};
        if (!unitsDemandedByModelByRegion[c.team.teamId][c.model.id]) unitsDemandedByModelByRegion[c.team.teamId][c.model.id] = {} as Record<Region, number>;
        unitsDemandedByModelByRegion[c.team.teamId][c.model.id][region] = unitsDemanded;

        const glutDiscount = glutDiscounts[vt]?.[region] ?? 0;
        const effectivePrice = c.salePrice * (1 - glutDiscount) * (1 - priceForcedDown);
        if (!effectivePriceByModelByRegion[c.team.teamId]) effectivePriceByModelByRegion[c.team.teamId] = {};
        if (!effectivePriceByModelByRegion[c.team.teamId][c.model.id]) effectivePriceByModelByRegion[c.team.teamId][c.model.id] = {} as Record<Region, number>;
        effectivePriceByModelByRegion[c.team.teamId][c.model.id][region] = Math.round(effectivePrice);

        // ── Clearing price ────────────────────────────────────────────────
        // Price at which share(P) × demandHere = unitsAllocated exactly.
        const unitsAllocated = Math.round(c.run.units * c.regionAlloc / 100);
        let clearingPrice = 0;

        if (demandHere > 0 && unitsAllocated > 0) {
          const sumOtherScores = totalDemandScore - demandScores[i];

          if (sumOtherScores === 0) {
            // Solo in this region — whole market is theirs regardless of price (within relative model).
            // Absolute curve ceiling is the meaningful upper bound.
            clearingPrice = unitsAllocated <= demandHere ? priceRange.high : 0;
          } else if (unitsAllocated >= demandHere) {
            // Need more than 100% share — not achievable. Signal: demand-limited.
            clearingPrice = 0;
          } else {
            const targetShare = unitsAllocated / demandHere;
            // targetScore such that targetScore / (targetScore + sumOther) = targetShare
            const targetScore = targetShare * sumOtherScores / (1 - targetShare);
            const myBase = baseScores[i];
            const targetPriceFactor = myBase > 0 ? targetScore / myBase : 1.0;

            if (vt === "SPORTS_CAR") {
              // Binary search — prestige curve isn't analytically invertible
              let lo = avgPrice * 0.3, hi = avgPrice * 4;
              for (let iter = 0; iter < 24; iter++) {
                const mid = (lo + hi) / 2;
                let pf: number;
                if (mid > avgPrice) {
                  pf = 1.0 + Math.min(0.15, 0.375 * (mid - avgPrice) / avgPrice);
                } else {
                  pf = 1.0 - 0.5 * (avgPrice - mid) / avgPrice;
                }
                if (Math.max(0.1, pf) < targetPriceFactor) lo = mid; else hi = mid;
              }
              clearingPrice = Math.round((lo + hi) / 2);
            } else {
              const elasticity = PRICE_ELASTICITY[vt];
              if (elasticity > 0) {
                // priceFactor = 1 + e*(avgPrice - P)/avgPrice = targetPriceFactor
                // P = avgPrice * (1 - (targetPriceFactor - 1) / e)
                clearingPrice = Math.round(avgPrice * (1 - (targetPriceFactor - 1) / elasticity));
              } else {
                clearingPrice = c.salePrice; // elasticity=0, relative price irrelevant
              }
            }
            // Clamp: clearing price shouldn't be negative or absurdly high
            clearingPrice = Math.max(0, Math.min(clearingPrice, priceRange.high * 3));
          }
        }

        if (!clearingPriceByModelByRegion[c.team.teamId]) clearingPriceByModelByRegion[c.team.teamId] = {};
        if (!clearingPriceByModelByRegion[c.team.teamId][c.model.id]) clearingPriceByModelByRegion[c.team.teamId][c.model.id] = {} as Record<Region, number>;
        clearingPriceByModelByRegion[c.team.teamId][c.model.id][region] = clearingPrice;
      }
    }
  }

  // ── Step 10: Units sold and inventory ─────────────────────────────────────
  const teamResultsMap: Record<string, TeamRoundResult> = {};

  for (const team of teams) {
    const calcs = teamCalcs[team.teamId];
    const mktCalcs = teamMarketingCalcs[team.teamId];
    if (!calcs) continue;

    const modelResults: ModelResult[] = [];

    let totalSalesRevenue = 0;
    let totalCogs = 0;
    let totalShipping = 0;
    let totalUnitsSold = 0;

    const inventoryByType: Record<VehicleType, number> = {
      COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0,
    };

    // Distribute prior inventory across models of the same type proportionally by production volume
    const priorInventoryByModelId: Record<string, number> = {};
    const modelsGroupedByType: Record<string, Array<{ id: string; units: number }>> = {};
    for (const model of team.vehicleSection.models) {
      const r = team.manufacturingSection.productionRuns.find((pr) => pr.modelId === model.id);
      if (!modelsGroupedByType[model.vehicleType]) modelsGroupedByType[model.vehicleType] = [];
      modelsGroupedByType[model.vehicleType].push({ id: model.id, units: r?.units ?? 0 });
    }
    for (const vt of VEHICLE_TYPES) {
      const group = modelsGroupedByType[vt];
      if (!group?.length) continue;
      const totalInv = team.priorInventory[vt] ?? 0;
      if (!totalInv) continue;
      const totalProd = group.reduce((s, m) => s + m.units, 0);
      for (const m of group) {
        const share = totalProd > 0 ? m.units / totalProd : 1 / group.length;
        priorInventoryByModelId[m.id] = Math.round(totalInv * share);
      }
    }
    const inventorySoldThisRound: Record<VehicleType, number> = {
      COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0,
    };

    const teamTotalProd = team.manufacturingSection.productionRuns.reduce((s, r) => s + r.units, 0);
    const teamCapacity = calcs.spaceCostResult.totalCapacity;
    const capacityScale = teamCapacity > 0 && teamTotalProd > teamCapacity ? teamCapacity / teamTotalProd : 1;

    for (const model of team.vehicleSection.models) {
      const run = team.manufacturingSection.productionRuns.find(
        (r) => r.modelId === model.id
      );
      const prodModel = team.productionSection.models.find(
        (m) => m.modelId === model.id
      );

      if (!run || !prodModel) {
        continue;
      }

      const unitsProduced = Math.round(run.units * capacityScale);
      const reliabilityScore = calcs.reliabilityByModelId[model.id] ?? 1.0;
      const fleetRepairRate = computeFleetRepairRate(model.vehicleType, reliabilityScore);
      let recallTier = getRecallTier(fleetRepairRate);
      // Heavy Duty Platform: trucks get at most one recall tier lower (critical→major, major→minor)
      if (model.vehicleType === "TRUCK" && calcs.allRdUnlocks.includes("heavy_duty_platform")) {
        if (recallTier === "critical") recallTier = "major";
        else if (recallTier === "major") recallTier = "minor";
      }
      const unitCost = calcs.effectiveUnitCostByModelId[model.id] ?? 0;
      const salePrice = prodModel.salePrice;

      const facilitiesCostResult = calcs.spaceCostResult;
      const byRegion: ModelResult["byRegion"] = [];
      let modelUnitsSold = 0;
      let modelRevenue = 0;
      let modelUnitsDemanded = 0;
      let modelInvUnitsSold = 0;

      const modelPriorInv = priorInventoryByModelId[model.id] ?? 0;
      const inventoryDiscount = prodModel.inventoryDiscount ?? 0;

      for (const region of REGIONS) {
        const regionAlloc =
          prodModel.regionalAllocation[region as keyof typeof prodModel.regionalAllocation] ?? 0;
        if (regionAlloc <= 0) continue;

        const allocatedNew = Math.round(unitsProduced * (regionAlloc / 100));
        const allocatedInv = Math.round(modelPriorInv * (regionAlloc / 100));
        const totalAllocated = allocatedNew + allocatedInv;
        const demanded =
          unitsDemandedByModelByRegion[team.teamId]?.[model.id]?.[region] ?? 0;
        const soldHere = Math.min(demanded, totalAllocated);
        const effectivePrice =
          effectivePriceByModelByRegion[team.teamId]?.[model.id]?.[region] ?? salePrice;
        const glutDiscount = glutDiscounts[model.vehicleType]?.[region] ?? 0;

        // New production fills first; inventory covers the remainder
        const newSoldHere = Math.min(soldHere, allocatedNew);
        const invSoldHere = soldHere - newSoldHere;
        const effectiveInvPrice = Math.round(effectivePrice * (1 - inventoryDiscount / 100));
        const revenueHere = newSoldHere * effectivePrice + invSoldHere * effectiveInvPrice;

        const hasFactory = facilitiesCostResult.activeRegions.has(region);
        const shippingCostHere = hasFactory ? 0 : soldHere * SHIPPING_COST_PER_UNIT;
        byRegion.push({
          region,
          allocated: totalAllocated,
          demanded,
          sold: soldHere,
          effectivePrice,
          glutDiscount,
          hasFactory,
          shippingCostHere,
          clearingPrice: clearingPriceByModelByRegion[team.teamId]?.[model.id]?.[region] ?? 0,
        });

        modelUnitsSold += soldHere;
        modelRevenue += revenueHere;
        modelUnitsDemanded += demanded;
        modelInvUnitsSold += invSoldHere;
      }

      inventorySoldThisRound[model.vehicleType] += modelInvUnitsSold;
      const newProdSold = modelUnitsSold - modelInvUnitsSold;
      const unitsLeftInInventory = Math.max(0, unitsProduced - newProdSold);
      inventoryByType[model.vehicleType] += unitsLeftInInventory;

      // Shipping surcharge: units sold in regions without a local facility cost extra
      let shippingCosts = 0;
      for (const r of byRegion) {
        if (!facilitiesCostResult.activeRegions.has(r.region)) {
          shippingCosts += r.sold * SHIPPING_COST_PER_UNIT;
        }
      }
      const modelCogs = unitsProduced * unitCost;
      const unmetDemand = Math.max(0, modelUnitsDemanded - modelUnitsSold);
      // Gross profit per unit if they had been sold
      const unmetDemandGrossProfit = unmetDemand * (salePrice - unitCost);

      modelResults.push({
        modelId: model.id,
        modelName: model.name,
        vehicleType: model.vehicleType,
        unitCost,
        salePrice,
        unitsProduced,
        unitsSold: modelUnitsSold,
        unitsDemanded: modelUnitsDemanded,
        unitsLeftInInventory,
        revenue: Math.round(modelRevenue),
        cogs: Math.round(modelCogs),
        shippingCosts: Math.round(shippingCosts),
        repairRevenue: 0, // filled below
        reliabilityScore,
        fleetRepairRate,
        recallTier,
        unmetDemand,
        unmetDemandGrossProfit: Math.round(unmetDemandGrossProfit),
        byRegion,
      });

      totalSalesRevenue += modelRevenue;
      totalCogs += modelCogs;
      totalShipping += shippingCosts;
      totalUnitsSold += modelUnitsSold;
    }

    // Repair revenue from installed base
    const repairRevenue = computeRepairRevenue(
      team.installedBase,
      modelResults
    );

    // Split repair revenue across models by type proportionally
    // (just for reporting — assign it to each model type's result)
    const repairByType: Record<string, number> = {};
    for (const vt of VEHICLE_TYPES) {
      const baseUnits = team.installedBase[vt] ?? 0;
      if (baseUnits === 0) continue;
      const modelResult = modelResults.find((m) => m.vehicleType === vt);
      const repairRate = modelResult?.fleetRepairRate ?? 0;
      repairByType[vt] = baseUnits * repairRate * AVG_REPAIR_VALUE;
    }
    for (const mr of modelResults) {
      mr.repairRevenue = Math.round(repairByType[mr.vehicleType] ?? 0);
    }

    // Carrying cost applies only to unsold prior inventory (deduct what was sold this round)
    const adjustedPriorInventory = { ...team.priorInventory };
    for (const vt of VEHICLE_TYPES) {
      adjustedPriorInventory[vt] = Math.max(0, (team.priorInventory[vt] ?? 0) - (inventorySoldThisRound[vt] ?? 0));
    }
    const carryingCost = computeInventoryCarryingCost(adjustedPriorInventory);

    const spaceCostResult = calcs.spaceCostResult;
    const rdSpend = calcs.rdSpend;
    const mktSpend = team.marketingSection.totalBudget ?? 0;
    const lobbySpend = team.lobbyingSection.lobbyingSpend ?? 0;
    const engineeringFees = calcs.engineeringFees;

    const totalRevenue =
      Math.round(totalSalesRevenue) + repairRevenue;
    const totalCostsAmount =
      Math.round(totalCogs) +
      Math.round(totalShipping) +
      engineeringFees +
      spaceCostResult.totalCost +
      Math.round(rdSpend) +
      mktSpend +
      lobbySpend +
      carryingCost;

    const netCashChange = totalRevenue - totalCostsAmount;
    const priorCash = parseFloat(team.cash);
    const newCash = priorCash + netCashChange;

    // Market share by type
    const marketShareByType: Record<string, number> = {};
    for (const vt of VEHICLE_TYPES) {
      const totalDemandForType = Object.values(
        demandByTypeByRegion[vt] ?? {}
      ).reduce((a, b) => a + b, 0);
      const teamSoldForType = modelResults
        .filter((m) => m.vehicleType === vt)
        .reduce((a, m) => a + m.unitsSold, 0);
      marketShareByType[vt] =
        totalDemandForType > 0 ? teamSoldForType / totalDemandForType : 0;
    }

    // Brand perception
    const brandPerceptionStart = teamBrandPerceptions[team.teamId] ?? 0;
    const incomingAttackSpend = incomingAttackSpendByTeamId[team.teamId] ?? 0;

    const brandDelta = computeBrandPerceptionDelta({
      team,
      brandMarketingSpend: mktCalcs?.brandSpend ?? 0,
      categoryMarketingSpend: mktCalcs?.categorySpend ?? 0,
      isAttackAd: mktCalcs?.isAttack ?? false,
      attackBackfireChance: 0.20,
      modelResults,
      effectiveRdSpend: calcs.effectiveRdSpend,
      publicPerception,
      worldEventPerceptionModifier: worldEventPerceptionMod,
      incomingAttackSpend,
      brandPerceptionCurrent: brandPerceptionStart,
    });

    // Family Safety Package: +4 brand perception per round when selling SUVs
    let familySafetyBonus = 0;
    if (calcs.allRdUnlocks.includes("family_safety_package")) {
      const soldAnySuv = modelResults.some((mr) => mr.vehicleType === "SUV" && mr.unitsSold > 0);
      if (soldAnySuv) familySafetyBonus = 4;
    }

    const brandPerceptionEnd = Math.max(
      -100,
      Math.min(100, brandPerceptionStart + brandDelta.total + familySafetyBonus)
    );

    // Scarcity impacts summary
    const crowdingApplied: string[] = [];
    for (const vt of VEHICLE_TYPES) {
      if (crowdingResult.marketingFactor[vt] < 1.0) {
        const hasThisType = team.vehicleSection.models.some(
          (m) => m.vehicleType === vt
        );
        if (hasThisType) {
          crowdingApplied.push(vt);
        }
      }
    }

    const glutByRegion: Record<string, number> = {};
    for (const vt of VEHICLE_TYPES) {
      for (const region of REGIONS) {
        const discount = glutDiscounts[vt]?.[region] ?? 0;
        if (discount > 0) {
          glutByRegion[`${vt}_${region}`] = discount;
        }
      }
    }

    teamResultsMap[team.teamId] = {
      decisions: {
        totalRdSpend: Math.round(rdSpend),
        totalMarketingSpend: mktSpend,
        totalLobbyingSpend: lobbySpend,
        rdUnlocksPurchased: calcs.unlocksPurchased,
        spaceSizeUsed: spaceCostResult.totalCapacity > 0 ? `${spaceCostResult.totalCapacity} units` : "none",
        spaceOwnership: spaceCostResult.activeRegions.size > 0 ? "active" : "none",
        spaceAnnualCost: spaceCostResult.totalCost,
        pricingResearchSegment: team.rdSection.recurring.pricingResearch
          ? (team.rdSection.recurringTargets?.pricingResearch ?? undefined)
          : undefined,
      },
      revenue: {
        sales: Math.round(totalSalesRevenue),
        repairs: repairRevenue,
        total: totalRevenue,
      },
      costs: {
        cogs: Math.round(totalCogs),
        shipping: Math.round(totalShipping),
        engineeringFees,
        spaceCost: spaceCostResult.totalCost,
        rdSpend: Math.round(rdSpend),
        marketingSpend: mktSpend,
        lobbyingSpend: lobbySpend,
        inventoryCarrying: carryingCost,
        total: totalCostsAmount,
      },
      netCashChange,
      priorCash: team.cash,
      newCash: newCash.toFixed(2),
      brandPerceptionStart,
      brandPerceptionEnd,
      brandPerceptionDelta: brandDelta,
      modelResults,
      scarcityImpacts: {
        supplyChainPenalty:
          scarcityResult.tripleTestedPenaltyPerUnit +
          scarcityResult.massProducedPenaltyPerUnit,
        crowdingApplied,
        talentWarPenalty,
        glutByRegion,
      },
      marketShareByType,
    };
  }

  // ── Step 11b: Fix market share — use industry units sold, not potential demand ──
  // Market share = your units sold / total units sold by ALL teams for that type.
  // Computing it inside the team loop used totalDemand as denominator, which gives
  // ~6% for a solo seller in a large market instead of 100%.
  {
    const totalSoldByType: Record<string, number> = {};
    for (const team of teams) {
      for (const mr of teamResultsMap[team.teamId]?.modelResults ?? []) {
        totalSoldByType[mr.vehicleType] = (totalSoldByType[mr.vehicleType] ?? 0) + mr.unitsSold;
      }
    }
    for (const team of teams) {
      const result = teamResultsMap[team.teamId];
      if (!result) continue;
      for (const vt of VEHICLE_TYPES) {
        const teamSold = result.modelResults.filter(m => m.vehicleType === vt).reduce((s, m) => s + m.unitsSold, 0);
        const industrySold = totalSoldByType[vt] ?? 0;
        result.marketShareByType[vt] = industrySold > 0 ? teamSold / industrySold : 0;
      }
    }
  }

  // ── Step 12: Lobbying and policy update ───────────────────────────────────
  // Find which teams newly unlock all_electric this round
  const newAllElectricTeams: string[] = [];
  for (const team of teams) {
    const calcs = teamCalcs[team.teamId];
    if (!calcs) continue;
    if (
      calcs.unlocksPurchased.includes("all_electric") &&
      !team.existingRdUnlocks.includes("all_electric")
    ) {
      newAllElectricTeams.push(team.teamId);
    }
  }

  const { newPolicyScore } = computePolicyScoreUpdate(
    teams,
    effectivePolicyScore,
    perceptionPolicyBonusPending,
    newAllElectricTeams
  );

  // ── Step 13: Update public perception ─────────────────────────────────────
  const totalCategoryMarketingSpend = teams.reduce((sum, team) => {
    return sum + (teamMarketingCalcs[team.teamId]?.categorySpend ?? 0);
  }, 0);

  const anyTeamHasCriticalRecall = teams.some((team) =>
    teamResultsMap[team.teamId]?.modelResults.some(
      (m) => m.recallTier === "critical"
    )
  );

  const { newPublicPerception, perceptionPolicyBonus } =
    computeNewPublicPerception(
      publicPerception,
      totalCategoryMarketingSpend,
      anyTeamHasCriticalRecall,
      newPolicyScore,
      worldEventPerceptionMod
    );

  // ── Step 14: Update brand perception per team ─────────────────────────────
  const updatedBrandPerceptions: Record<string, number> = { ...teamBrandPerceptions };
  for (const team of teams) {
    const result = teamResultsMap[team.teamId];
    if (!result) continue;
    updatedBrandPerceptions[team.teamId] = result.brandPerceptionEnd;
  }

  // ── Step 15: Next round demand ────────────────────────────────────────────
  const allTeamRdUnlocks = teams.map((t) => {
    const calcs = teamCalcs[t.teamId];
    return calcs?.allRdUnlocks ?? t.existingRdUnlocks;
  });

  // Use this round's realized demand (not stale prior) as the growth base
  const currentFlyingDemand = VEHICLE_TYPES.reduce(
    (sum, vt) => sum + REGIONS.reduce((s, r) => s + (demandByTypeByRegion[vt]?.[r] ?? 0), 0),
    0
  );
  const currentTraditionalDemand = Math.max(0, priorTraditionalDemand + priorFlyingDemand - currentFlyingDemand);

  const nextDemand = computeNextRoundDemand(
    {
      currentFlyingDemand,
      currentTraditionalDemand,
      policyScore: newPolicyScore,
      categoryMarketingSpend: totalCategoryMarketingSpend,
      allTeamRdUnlocks,
      roundNumber,
    },
    demandByTypeByRegion
  );

  // ── Step 16: Process R&D unlocks ──────────────────────────────────────────
  const newRdUnlocks: NewRdUnlock[] = [];

  // Track which unlocks have been claimed by any team so far this round
  const firstMovers: Record<string, string> = {}; // unlockKey -> teamId of first mover

  for (const team of teams) {
    const calcs = teamCalcs[team.teamId];
    if (!calcs) continue;

    // One unlock per tree per round — track which trees have been claimed.
    const treeClaimedThisRound: Record<string, boolean> = {};

    for (const key of calcs.unlocksPurchased) {
      // Validate prereqs from TECH_TREE_DEF
      const nodeDef = TECH_TREE_DEF.find((n) => n.key === key);
      if (!nodeDef) continue;

      // Prereqs must be satisfied by already-owned unlocks only, not same-round purchases.
      // This prevents chaining multiple tiers in one round even if both are submitted.
      const prereqsMet = nodeDef.prereqs.every((p) =>
        team.existingRdUnlocks.includes(p)
      );
      if (!prereqsMet) continue;

      // Enforce one unlock per tree per round.
      if (treeClaimedThisRound[nodeDef.tree]) continue;
      treeClaimedThisRound[nodeDef.tree] = true;

      // Tier-1 nodes are non-exclusive — foundational tech, anyone can buy them.
      // Tier-2+ gets first-mover exclusivity for EXCLUSIVITY_WINDOW rounds.
      const isTier1 = (nodeDef.tier ?? 1) <= 1;
      const isFirstMover = !isTier1 && !firstMovers[key];
      if (isFirstMover) {
        firstMovers[key] = team.teamId;
      }

      newRdUnlocks.push({
        teamId: team.teamId,
        unlockKey: key,
        unlockedInRound: roundNumber,
        exclusiveUntilRound: isFirstMover ? roundNumber + EXCLUSIVITY_WINDOW : null,
      });
    }
  }

  // ── Step 17: InstalledBase updates ───────────────────────────────────────
  const installedBaseUpdates: InstalledBaseUpdate[] = [];
  for (const team of teams) {
    const result = teamResultsMap[team.teamId];
    if (!result) continue;

    const soldByType: Partial<Record<VehicleType, number>> = {};
    for (const mr of result.modelResults) {
      soldByType[mr.vehicleType] =
        (soldByType[mr.vehicleType] ?? 0) + mr.unitsSold;
    }

    for (const vt of VEHICLE_TYPES) {
      const units = soldByType[vt] ?? 0;
      if (units > 0) {
        installedBaseUpdates.push({
          teamId: team.teamId,
          vehicleType: vt,
          unitsToAdd: units,
        });
      }
    }
  }

  // ── Step 18: New cash by team ─────────────────────────────────────────────
  const newCashByTeam: Record<string, string> = {};
  for (const team of teams) {
    const result = teamResultsMap[team.teamId];
    newCashByTeam[team.teamId] = result?.newCash ?? team.cash;
  }

  // ── Step 19: Persist-ready data ───────────────────────────────────────────
  // Updated team facilities (persist owned facilities for next round)
  const updatedTeamSpaces: Record<string, Array<{ region: string; size: string }>> = {};
  for (const team of teams) {
    const calcs = teamCalcs[team.teamId];
    updatedTeamSpaces[team.teamId] = calcs?.spaceCostResult.newOwnedFacilities ?? team.currentFacilities;
  }

  // Track consecutive crowded rounds per segment for next-round quality ratchet
  const updatedCrowdingRounds: Record<string, number> = { ...(segmentCrowdingRounds ?? {}) };
  for (const vt of VEHICLE_TYPES) {
    const count = crowdingResult.teamCountByType[vt];
    if (count >= 2) {
      updatedCrowdingRounds[vt] = (updatedCrowdingRounds[vt] ?? 0) + 1;
    } else {
      updatedCrowdingRounds[vt] = 0; // reset when segment clears
    }
  }

  // Demand by type (totals for next round)
  const nextDemandByType: Record<string, number> = {};
  for (const vt of VEHICLE_TYPES) {
    nextDemandByType[vt] = nextDemand.nextDemandByType[vt];
  }

  // ── Build IndustrySnapshot ────────────────────────────────────────────────
  // Leaderboard
  const totalIndustryUnitsSold = Object.values(teamResultsMap).reduce(
    (sum, r) => sum + r.modelResults.reduce((s, m) => s + m.unitsSold, 0),
    0
  );

  const leaderboard = teams
    .map((team) => {
      const result = teamResultsMap[team.teamId];
      const unitsSold = result?.modelResults.reduce(
        (s, m) => s + m.unitsSold,
        0
      ) ?? 0;
      return {
        teamId: team.teamId,
        brandName: team.brandName,
        revenue: result?.revenue.total ?? 0,
        unitsSold,
        marketShare:
          totalIndustryUnitsSold > 0 ? unitsSold / totalIndustryUnitsSold : 0,
        cashBalance: result?.newCash ?? team.cash,
        brandPerception: result?.brandPerceptionEnd ?? 0,
        rank: 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  // ── Research payoffs: attach intel each team paid for (all results now exist) ──
  for (const team of teams) {
    const result = teamResultsMap[team.teamId];
    if (!result) continue;
    const targets = team.rdSection.recurringTargets ?? {};

    if (team.rdSection.recurring.competitorResearch && targets.competitorResearch) {
      const rival = teamResultsMap[targets.competitorResearch];
      const rivalEntry = leaderboard.find((e) => e.teamId === targets.competitorResearch);
      if (rival && rivalEntry) {
        result.decisions.competitorIntel = {
          brandName: rivalEntry.brandName,
          marketShare: rivalEntry.marketShare,
          models: rival.modelResults.map((m) => ({
            modelName: m.modelName,
            vehicleType: m.vehicleType,
            salePrice: m.salePrice,
            unitsSold: m.unitsSold,
            unitsProduced: m.unitsProduced,
          })),
        };
      }
    }

  }

  // Segment crowding counts
  const segmentCrowding: Record<string, number> = {};
  for (const vt of VEHICLE_TYPES) {
    segmentCrowding[vt] = crowdingResult.teamCountByType[vt];
  }

  // Average prices by type
  const avgPricesByType: Record<string, number> = {};
  for (const vt of VEHICLE_TYPES) {
    const prices: number[] = [];
    for (const team of teams) {
      for (const model of team.vehicleSection.models) {
        if (model.vehicleType !== vt) continue;
        const prodModel = team.productionSection.models.find(
          (m) => m.modelId === model.id
        );
        if (prodModel) prices.push(prodModel.salePrice);
      }
    }
    avgPricesByType[vt] =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;
  }

  // Public R&D achievements
  const UNLOCK_DISPLAY_NAMES = Object.fromEntries(TECH_TREE_DEF.map((n) => [n.key, n.name]));

  // Only reveal non-secret unlocks publicly
  const secretUnlocks = new Set([
    "market_analytics",
    "competitive_intel",
    "demand_forecasting_ai",
    "market_dominance",
  ]);

  const publicRdAchievements = newRdUnlocks
    .filter((u) => !secretUnlocks.has(u.unlockKey))
    .map((u) => {
      const team = teams.find((t) => t.teamId === u.teamId);
      return {
        teamId: u.teamId,
        brandName: team?.brandName ?? u.teamId,
        unlockKey: u.unlockKey,
        unlockDisplayName:
          UNLOCK_DISPLAY_NAMES[u.unlockKey] ?? u.unlockKey,
      };
    });

  // Recalls
  const recalls: IndustrySnapshot["recalls"] = [];
  for (const team of teams) {
    const result = teamResultsMap[team.teamId];
    if (!result) continue;
    for (const mr of result.modelResults) {
      if (mr.recallTier !== "none") {
        recalls.push({
          teamId: team.teamId,
          brandName: team.brandName,
          vehicleType: mr.vehicleType,
          tier: mr.recallTier,
        });
      }
    }
  }

  // Current flying demand for snapshot (this round's demand)
  const currentRoundTotalFlyingDemand = VEHICLE_TYPES.reduce((sum, vt) => {
    return (
      sum +
      REGIONS.reduce(
        (rs, region) => rs + (demandByTypeByRegion[vt]?.[region] ?? 0),
        0
      )
    );
  }, 0);

  const currentDemandByType: Record<string, number> = {};
  for (const vt of VEHICLE_TYPES) {
    currentDemandByType[vt] = REGIONS.reduce(
      (sum, region) => sum + (demandByTypeByRegion[vt]?.[region] ?? 0),
      0
    );
  }

  const industrySnapshot: IndustrySnapshot = {
    roundNumber,
    worldEvent,
    policyScore: newPolicyScore,
    publicPerception: newPublicPerception,
    totalFlyingCarDemand: currentRoundTotalFlyingDemand,
    totalTraditionalDemand: priorTraditionalDemand,
    demandByType: currentDemandByType,
    demandByTypeByRegion,
    leaderboard,
    segmentCrowding,
    averagePricesByType: avgPricesByType,
    publicRdAchievements,
    recalls,
    scarcityEvents: scarcityResult.scarcityEvents,
  };

  const nextDemandByTypeByRegion: Record<string, Record<string, number>> = {};
  for (const vt of VEHICLE_TYPES) {
    nextDemandByTypeByRegion[vt] = {};
    for (const region of REGIONS) {
      nextDemandByTypeByRegion[vt][region] =
        nextDemand.nextDemandByTypeByRegion[vt]?.[region] ?? 0;
    }
  }

  return {
    teamResults: teamResultsMap,
    industrySnapshot,
    newRdUnlocks,
    installedBaseUpdates,
    nextRoundSettings: {
      policyScore: newPolicyScore,
      publicPerception: newPublicPerception,
      teamBrandPerceptions: updatedBrandPerceptions,
      teamSpaces: updatedTeamSpaces,
      totalFlyingCarDemand: nextDemand.nextFlyingDemand,
      totalTraditionalDemand: nextDemand.nextTraditionalDemand,
      demandByType: nextDemandByType,
      demandByTypeByRegion: nextDemandByTypeByRegion,
      perceptionPolicyBonusPending: perceptionPolicyBonus,
      segmentCrowdingRounds: updatedCrowdingRounds,
    },
    newCashByTeam,
  };
}

// ── Helper: empty output when no teams ───────────────────────────────────────

function buildEmptyOutput(input: ResolveRoundInput): ResolveRoundOutput {
  return {
    teamResults: {},
    industrySnapshot: {
      roundNumber: input.roundNumber,
      worldEvent: input.worldEvent,
      policyScore: input.policyScore,
      publicPerception: input.publicPerception,
      totalFlyingCarDemand: input.priorFlyingDemand,
      totalTraditionalDemand: input.priorTraditionalDemand,
      demandByType: {},
      demandByTypeByRegion: {},
      leaderboard: [],
      segmentCrowding: {},
      averagePricesByType: {},
      publicRdAchievements: [],
      recalls: [],
      scarcityEvents: [],
    },
    newRdUnlocks: [],
    installedBaseUpdates: [],
    nextRoundSettings: {
      policyScore: input.policyScore,
      publicPerception: input.publicPerception,
      teamBrandPerceptions: input.teamBrandPerceptions,
      teamSpaces: input.teamSpaces,
      totalFlyingCarDemand: input.priorFlyingDemand,
      totalTraditionalDemand: input.priorTraditionalDemand,
      demandByType: {},
      demandByTypeByRegion: {},
      perceptionPolicyBonusPending: 0,
      segmentCrowdingRounds: input.segmentCrowdingRounds ?? {},
    },
    newCashByTeam: {},
  };
}

function buildZeroDemandOutput(input: ResolveRoundInput): ResolveRoundOutput {
  // Policy score -20: flying cars outlawed, all revenue = 0
  const teamResults: Record<string, TeamRoundResult> = {};

  for (const team of input.teams) {
    teamResults[team.teamId] = {
      decisions: {
        totalRdSpend: 0,
        totalMarketingSpend: 0,
        totalLobbyingSpend: 0,
        rdUnlocksPurchased: [],
        spaceSizeUsed: "none",
        spaceOwnership: "none",
        spaceAnnualCost: 0,
      },
      revenue: { sales: 0, repairs: 0, total: 0 },
      costs: {
        cogs: 0,
        shipping: 0,
        engineeringFees: 0,
        spaceCost: 0,
        rdSpend: 0,
        marketingSpend: 0,
        lobbyingSpend: 0,
        inventoryCarrying: 0,
        total: 0,
      },
      netCashChange: 0,
      priorCash: team.cash,
      newCash: team.cash,
      brandPerceptionStart: input.teamBrandPerceptions[team.teamId] ?? 0,
      brandPerceptionEnd: input.teamBrandPerceptions[team.teamId] ?? 0,
      brandPerceptionDelta: {
        marketingEffect: 0,
        qualityEffect: 0,
        recallPenalty: 0,
        innovationEffect: 0,
        industrySpillover: 0,
        eventEffect: 0,
        total: 0,
      },
      modelResults: [],
      scarcityImpacts: {
        supplyChainPenalty: 0,
        crowdingApplied: [],
        talentWarPenalty: 0,
        glutByRegion: {},
      },
      marketShareByType: {},
    };
  }

  return {
    teamResults,
    industrySnapshot: {
      roundNumber: input.roundNumber,
      worldEvent: input.worldEvent,
      policyScore: -20,
      publicPerception: input.publicPerception,
      totalFlyingCarDemand: 0,
      totalTraditionalDemand: input.priorTraditionalDemand,
      demandByType: {},
      demandByTypeByRegion: {},
      leaderboard: input.teams.map((t, i) => ({
        teamId: t.teamId,
        brandName: t.brandName,
        revenue: 0,
        unitsSold: 0,
        marketShare: 0,
        cashBalance: t.cash,
        brandPerception: input.teamBrandPerceptions[t.teamId] ?? 0,
        rank: i + 1,
      })),
      segmentCrowding: {},
      averagePricesByType: {},
      publicRdAchievements: [],
      recalls: [],
      scarcityEvents: ["FLYING CARS OUTLAWED: Policy score reached -20. No sales possible."],
    },
    newRdUnlocks: [],
    installedBaseUpdates: [],
    nextRoundSettings: {
      policyScore: -20,
      publicPerception: input.publicPerception,
      teamBrandPerceptions: input.teamBrandPerceptions,
      teamSpaces: input.teamSpaces,
      totalFlyingCarDemand: input.priorFlyingDemand,
      totalTraditionalDemand: input.priorTraditionalDemand,
      demandByType: {},
      demandByTypeByRegion: {},
      perceptionPolicyBonusPending: 0,
      segmentCrowdingRounds: input.segmentCrowdingRounds ?? {},
    },
    newCashByTeam: Object.fromEntries(input.teams.map((t) => [t.teamId, t.cash])),
  };
}
