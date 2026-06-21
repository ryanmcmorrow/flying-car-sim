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
  MARKETING_CHANNEL_EFFECTIVENESS,
  PARTS_BASE_RELIABILITY,
  ENGINE_RELIABILITY_MOD,
  INVENTORY_CARRYING_COST,
  RD_RECURRING_COSTS,
  TECH_TREE_COSTS,
} from "./constants";
import { getPolicyDemandFactor, computeThisRoundDemand, computeNextRoundDemand } from "./demand";
import { computeSupplyChainScarcity, computeSegmentCrowding, computeRegionalGlutDiscounts, computeTalentWarPenalty } from "./scarcity";
import { computeReliabilityScore, getRecallTier, computeBrandPerceptionDelta, computeNewPublicPerception } from "./perception";
import { computeTeamRdSpend, computeEffectiveUnitCost, computeQualityScore, computeSpaceCost, computeRepairRevenue, computeFleetRepairRate, computeInventoryCarryingCost, computeEngineeringFeesForTeam } from "./financials";
import { computePolicyScoreUpdate } from "./lobbying";
import { TECH_TREE_DEF } from "@/lib/decision-utils";

const EXCLUSIVITY_WINDOW = 2; // rounds of exclusivity for first-mover R&D unlocks

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
    unlocksPurchased: string[];
    allRdUnlocks: string[]; // existing + this round's
    effectiveUnitCostByModelId: Record<string, number>;
    reliabilityByModelId: Record<string, number>;
    qualityScoreByModelId: Record<string, number>;
    engineeringFees: number;
    spaceCostResult: ReturnType<typeof computeSpaceCost>;
  }

  const teamCalcs: Record<string, TeamCalcs> = {};

  for (const team of teams) {
    const { totalRdSpend, unlocksPurchased } = computeTeamRdSpend(team, talentWarPenalty);
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
    const isCategory = mkt.messagingType === "category";
    const isAttack = mkt.tone === "attack";

    const categorySpend = isCategory ? totalBudget : 0;
    const brandSpend = !isCategory ? totalBudget : 0;

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

  // ── Step 8: Market share per team × type × region ─────────────────────────
  // unitsDemanded[teamId][modelId][region]
  const unitsDemandedByModelByRegion: Record<string, Record<string, Record<Region, number>>> = {};
  const effectivePriceByModelByRegion: Record<string, Record<string, Record<Region, number>>> = {};

  // Glut discounts (Step 9 first pass — we need supply to compute this)
  const glutDiscounts = computeRegionalGlutDiscounts(teams, demandByTypeByRegion);

  for (const vt of VEHICLE_TYPES) {
    for (const region of REGIONS) {
      const demandHere = demandByTypeByRegion[vt]?.[region] ?? 0;
      if (demandHere === 0) continue;

      // Find all teams competing in this type × region
      const competitors: Array<{
        team: (typeof teams)[number];
        model: (typeof teams)[number]["vehicleSection"]["models"][number];
        prodModel: (typeof teams)[number]["productionSection"]["models"][number];
        run: (typeof teams)[number]["manufacturingSection"]["productionRuns"][number];
        salePrice: number;
        qualityScore: number;
        marketingSpend: number;
      }> = [];

      for (const team of teams) {
        for (const model of team.vehicleSection.models) {
          if (model.vehicleType !== vt) continue;

          const prodModel = team.productionSection.models.find(
            (m) => m.modelId === model.id
          );
          const run = team.manufacturingSection.productionRuns.find(
            (r) => r.modelId === model.id
          );

          if (!prodModel || !run) continue;

          const regionAlloc =
            prodModel.regionalAllocation[region as keyof typeof prodModel.regionalAllocation] ?? 0;
          if (regionAlloc <= 0) continue;

          competitors.push({
            team,
            model,
            prodModel,
            run,
            salePrice: prodModel.salePrice,
            qualityScore:
              teamCalcs[team.teamId]?.qualityScoreByModelId[model.id] ?? 1.0,
            marketingSpend:
              teamMarketingCalcs[team.teamId]?.brandSpendByTypeByRegion[vt][region] ?? 0,
          });
        }
      }

      if (competitors.length === 0) continue;

      // Average price
      const avgPrice =
        competitors.reduce((s, c) => s + c.salePrice, 0) / competitors.length;

      // Crowding factor
      const crowdingFactor = crowdingResult.marketingFactor[vt];
      const priceForcedDown = crowdingResult.priceForcedDown[vt];

      // Effective avg price after crowding
      const effectiveAvgPrice = avgPrice * (1 - priceForcedDown);

      // Determine if any teams have brand spend
      const anyBrandSpend = competitors.some((c) => c.marketingSpend > 0);

      // Compute demand score for each competitor
      const demandScores: number[] = [];

      for (const c of competitors) {
        const brandPerception = teamBrandPerceptions[c.team.teamId] ?? 0;
        const { divisor, floor } = BRAND_PERCEPTION_PARAMS[vt];
        const brandMulti = Math.max(floor, 1.0 + brandPerception / divisor);

        // Price factor
        let priceFactor: number;
        const effectiveSalePrice = c.salePrice * (1 - priceForcedDown);

        if (vt === "SPORTS_CAR") {
          // Prestige pricing
          if (effectiveSalePrice > effectiveAvgPrice) {
            const prestigeBonus = Math.min(
              0.15,
              0.375 * (effectiveSalePrice - effectiveAvgPrice) / effectiveAvgPrice
            );
            priceFactor = 1.0 + prestigeBonus;
          } else {
            const cheapnessPenalty =
              0.5 * (effectiveAvgPrice - effectiveSalePrice) / effectiveAvgPrice;
            priceFactor = 1.0 - cheapnessPenalty;
          }
        } else {
          const elasticity = PRICE_ELASTICITY[vt];
          priceFactor =
            effectiveAvgPrice > 0
              ? 1.0 +
                elasticity *
                  (effectiveAvgPrice - effectiveSalePrice) /
                  effectiveAvgPrice
              : 1.0;
        }

        priceFactor = Math.max(0.1, priceFactor);

        // Marketing share raw
        let marketingShareRaw: number;
        if (!anyBrandSpend) {
          marketingShareRaw = 1.0;
        } else {
          marketingShareRaw = c.marketingSpend > 0
            ? c.marketingSpend * crowdingFactor
            : 0.1 * crowdingFactor; // floor for zero-spend teams
        }

        const demandScore =
          brandMulti * priceFactor * c.qualityScore * marketingShareRaw;
        demandScores.push(Math.max(0, demandScore));
      }

      const totalDemandScore = demandScores.reduce((a, b) => a + b, 0);

      for (let i = 0; i < competitors.length; i++) {
        const c = competitors[i];
        const share = totalDemandScore > 0 ? demandScores[i] / totalDemandScore : 1 / competitors.length;
        const unitsDemanded = Math.round(share * demandHere);

        if (!unitsDemandedByModelByRegion[c.team.teamId]) {
          unitsDemandedByModelByRegion[c.team.teamId] = {};
        }
        if (!unitsDemandedByModelByRegion[c.team.teamId][c.model.id]) {
          unitsDemandedByModelByRegion[c.team.teamId][c.model.id] = {} as Record<Region, number>;
        }
        unitsDemandedByModelByRegion[c.team.teamId][c.model.id][region] = unitsDemanded;

        // Effective price after glut discount
        const glutDiscount = glutDiscounts[vt]?.[region] ?? 0;
        const effectivePrice = c.salePrice * (1 - glutDiscount) * (1 - crowdingResult.priceForcedDown[vt]);

        if (!effectivePriceByModelByRegion[c.team.teamId]) {
          effectivePriceByModelByRegion[c.team.teamId] = {};
        }
        if (!effectivePriceByModelByRegion[c.team.teamId][c.model.id]) {
          effectivePriceByModelByRegion[c.team.teamId][c.model.id] = {} as Record<Region, number>;
        }
        effectivePriceByModelByRegion[c.team.teamId][c.model.id][region] = Math.round(effectivePrice);
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
    let totalUnitsSold = 0;

    const inventoryByType: Record<VehicleType, number> = {
      COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0,
    };

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

      const unitsProduced = run.units;
      const reliabilityScore = calcs.reliabilityByModelId[model.id] ?? 1.0;
      const fleetRepairRate = computeFleetRepairRate(model.vehicleType, reliabilityScore);
      const recallTier = getRecallTier(fleetRepairRate);
      const unitCost = calcs.effectiveUnitCostByModelId[model.id] ?? 0;
      const salePrice = prodModel.salePrice;

      const byRegion: ModelResult["byRegion"] = [];
      let modelUnitsSold = 0;
      let modelRevenue = 0;
      let modelUnitsDemanded = 0;

      for (const region of REGIONS) {
        const regionAlloc =
          prodModel.regionalAllocation[region as keyof typeof prodModel.regionalAllocation] ?? 0;
        if (regionAlloc <= 0) continue;

        const allocatedUnits = Math.round(unitsProduced * (regionAlloc / 100));
        const demanded =
          unitsDemandedByModelByRegion[team.teamId]?.[model.id]?.[region] ?? 0;
        const soldHere = Math.min(demanded, allocatedUnits);
        const effectivePrice =
          effectivePriceByModelByRegion[team.teamId]?.[model.id]?.[region] ?? salePrice;
        const glutDiscount = glutDiscounts[model.vehicleType]?.[region] ?? 0;

        byRegion.push({
          region,
          allocated: allocatedUnits,
          demanded,
          sold: soldHere,
          effectivePrice,
          glutDiscount,
        });

        modelUnitsSold += soldHere;
        modelRevenue += soldHere * effectivePrice;
        modelUnitsDemanded += demanded;
      }

      const unitsLeftInInventory = Math.max(0, unitsProduced - modelUnitsSold);
      inventoryByType[model.vehicleType] += unitsLeftInInventory;

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
      repairByType[vt] = baseUnits * repairRate * 2400;
    }
    for (const mr of modelResults) {
      mr.repairRevenue = Math.round(repairByType[mr.vehicleType] ?? 0);
    }

    // Inventory carrying cost from PRIOR round's inventory
    const carryingCost = computeInventoryCarryingCost(team.priorInventory);

    const spaceCostResult = calcs.spaceCostResult;
    const rdSpend = calcs.rdSpend;
    const mktSpend = team.marketingSection.totalBudget ?? 0;
    const lobbySpend = team.lobbyingSection.lobbyingSpend ?? 0;
    const engineeringFees = calcs.engineeringFees;

    const totalRevenue =
      Math.round(totalSalesRevenue) + repairRevenue;
    const totalCostsAmount =
      Math.round(totalCogs) +
      engineeringFees +
      spaceCostResult.spaceCost +
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
    const incomingAttackSpend = teams.reduce((sum, otherTeam) => {
      const otherMkt = teamMarketingCalcs[otherTeam.teamId];
      if (
        otherMkt?.isAttack &&
        otherMkt.attackTargetTeamId === team.teamId
      ) {
        return sum + otherMkt.brandSpend;
      }
      return sum;
    }, 0);

    const brandDelta = computeBrandPerceptionDelta({
      team,
      brandMarketingSpend: mktCalcs?.brandSpend ?? 0,
      isAttackAd: mktCalcs?.isAttack ?? false,
      attackBackfireChance: 0.20,
      modelResults,
      effectiveRdSpend: rdSpend,
      publicPerception,
      worldEventPerceptionModifier: worldEventPerceptionMod,
      incomingAttackSpend,
    });

    const brandPerceptionEnd = Math.max(
      -100,
      Math.min(100, brandPerceptionStart + brandDelta.total)
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
        spaceSizeUsed: spaceCostResult.spaceSize,
        spaceOwnership: spaceCostResult.spaceOwnership,
        spaceAnnualCost: spaceCostResult.spaceCost,
      },
      revenue: {
        sales: Math.round(totalSalesRevenue),
        repairs: repairRevenue,
        total: totalRevenue,
      },
      costs: {
        cogs: Math.round(totalCogs),
        engineeringFees,
        spaceCost: spaceCostResult.spaceCost,
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

  const nextDemand = computeNextRoundDemand(
    {
      currentFlyingDemand: priorFlyingDemand,
      currentTraditionalDemand: priorTraditionalDemand,
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

    for (const key of calcs.unlocksPurchased) {
      // Validate prereqs from TECH_TREE_DEF
      const nodeDef = TECH_TREE_DEF.find((n) => n.key === key);
      if (!nodeDef) continue;

      const prereqsMet = nodeDef.prereqs.every(
        (p) =>
          team.existingRdUnlocks.includes(p) ||
          calcs.unlocksPurchased.includes(p)
      );
      if (!prereqsMet) continue;

      // Exclusivity: is this key claimed by another team already?
      const isFirstMover = !firstMovers[key];
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
  // Updated team spaces
  const updatedTeamSpaces: Record<string, { size: string; ownership: string } | null> = {
    ...teamSpaces,
  };
  for (const team of teams) {
    const calcs = teamCalcs[team.teamId];
    if (!calcs) continue;
    const newSpace = calcs.spaceCostResult.newSpaceState;
    if (newSpace) {
      updatedTeamSpaces[team.teamId] = newSpace;
    } else if (
      team.manufacturingSection.spaceAction === "sell" ||
      (team.manufacturingSection.spaceAction === "new" &&
        team.manufacturingSection.spaceOwnership === "rent")
    ) {
      // If renting or sold, don't persist as owned space
      updatedTeamSpaces[team.teamId] = null;
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
  const UNLOCK_DISPLAY_NAMES: Record<string, string> = {
    mfg_efficiency_1: "Manufacturing Efficiency I",
    mfg_efficiency_2: "Manufacturing Efficiency II",
    mfg_efficiency_3: "Manufacturing Efficiency III",
    mfg_mastery: "Manufacturing Mastery",
    advanced_aerodynamics: "Advanced Aerodynamics",
    fly_by_wire: "Fly-By-Wire",
    battery_research: "Battery Research",
    market_analytics: "Market Analytics",
    competitive_intel: "Competitive Intelligence",
    fuel_cell_research: "Fuel Cell Research",
    autonomous_flight: "Autonomous Flight",
    fuel_efficiency: "Fuel Efficiency",
    demand_forecasting_ai: "Demand Forecasting AI",
    all_electric: "All Electric",
    full_autonomy: "Full Autonomy",
    market_dominance: "Market Dominance",
  };

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
    updatedTeamSpaces,
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
      leaderboard: [],
      segmentCrowding: {},
      averagePricesByType: {},
      publicRdAchievements: [],
      recalls: [],
      scarcityEvents: [],
    },
    newRdUnlocks: [],
    installedBaseUpdates: [],
    updatedTeamSpaces: input.teamSpaces,
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
    updatedTeamSpaces: input.teamSpaces,
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
    },
    newCashByTeam: Object.fromEntries(input.teams.map((t) => [t.teamId, t.cash])),
  };
}
