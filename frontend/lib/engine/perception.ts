// ── Brand & Public Perception Updates ────────────────────────────────────────

import {
  BRAND_RECALL_THRESHOLDS,
  BRAND_RECALL_PENALTIES,
  PARTS_BASE_RELIABILITY,
  ENGINE_RELIABILITY_MOD,
} from "./constants";
import type { VehicleType } from "./constants";
import type { TeamInput } from "./types";
import type { ModelResult } from "./types";

// ── Reliability score ─────────────────────────────────────────────────────────

export function computeReliabilityScore(
  internals: string,
  engine: string
): number {
  const base = PARTS_BASE_RELIABILITY[internals] ?? 1.0;
  const mod = ENGINE_RELIABILITY_MOD[engine] ?? 1.0;
  return base * mod;
}

// ── Recall tier from fleet repair rate ───────────────────────────────────────

export function getRecallTier(
  fleetRepairRate: number
): "none" | "minor" | "major" | "critical" {
  if (fleetRepairRate > BRAND_RECALL_THRESHOLDS.CRITICAL) return "critical";
  if (fleetRepairRate > BRAND_RECALL_THRESHOLDS.MAJOR) return "major";
  if (fleetRepairRate > BRAND_RECALL_THRESHOLDS.MINOR) return "minor";
  return "none";
}

// ── Brand perception delta ────────────────────────────────────────────────────

export interface BrandPerceptionDelta {
  marketingEffect: number;
  qualityEffect: number;
  recallPenalty: number;
  innovationEffect: number;
  industrySpillover: number;
  eventEffect: number;
  brandDecay: number;
  total: number;
}

export function computeBrandPerceptionDelta(params: {
  team: TeamInput;
  brandMarketingSpend: number;
  categoryMarketingSpend: number; // category spend gives a halo brand benefit
  isAttackAd: boolean;
  attackBackfireChance: number; // 0.20
  modelResults: ModelResult[];
  effectiveRdSpend: number;
  publicPerception: number;
  worldEventPerceptionModifier: number;
  incomingAttackSpend: number;
  brandPerceptionCurrent: number;
}): BrandPerceptionDelta {
  const {
    team,
    brandMarketingSpend,
    categoryMarketingSpend,
    isAttackAd,
    attackBackfireChance,
    modelResults,
    effectiveRdSpend,
    publicPerception,
    worldEventPerceptionModifier,
    incomingAttackSpend,
    brandPerceptionCurrent,
  } = params;

  // Brand marketing effect — log curve for diminishing returns.
  // $5M → ~2.8 pts, $10M → ~4.4 pts, $20M → ~6.4 pts, $40M → ~8.8 pts.
  let marketingEffect = 0;
  if (!isAttackAd && brandMarketingSpend > 0) {
    marketingEffect = Math.log(1 + brandMarketingSpend / 5_000_000) * 4;
  }

  // Category halo: being seen as a market-builder gives a small brand lift.
  // Weaker than direct brand spend — max ~3 pts at $40M — but it adds up.
  if (categoryMarketingSpend > 0) {
    marketingEffect += Math.log(1 + categoryMarketingSpend / 10_000_000) * 2;
  }
  // Attack backfire
  if (isAttackAd && Math.random() < attackBackfireChance) {
    marketingEffect = -(brandMarketingSpend / 10_000_000) * 1.5;
  }
  // Incoming attack — sqrt curve for diminishing returns on perception damage too.
  // $10M attack → ~2pts damage, $40M → ~4pts, $160M → ~8pts (not 24pts linearly).
  const attackPenalty = incomingAttackSpend > 0
    ? Math.sqrt(incomingAttackSpend / 10_000_000) * 2
    : 0;
  marketingEffect -= attackPenalty;

  // Brand decay — perception erodes 8% per round toward 0.
  // Consistent brand spend ($5M per 1pt of decay) offsets the drift.
  // At brand=50: decay=-4pts; need $20M brand spend to fully offset it.
  const rawDecay = brandPerceptionCurrent * 0.08;
  const decayOffset = Math.min(Math.abs(rawDecay), brandMarketingSpend / 5_000_000);
  const brandDecay = -(Math.abs(rawDecay) - decayOffset) * Math.sign(brandPerceptionCurrent);

  // Quality effect (per model, weighted by units produced)
  let totalUnitsProduced = 0;
  let weightedQualityEffect = 0;

  for (const result of modelResults) {
    const model = team.vehicleSection.models.find(
      (m) => m.id === result.modelId
    );
    if (!model) continue;
    const units = result.unitsProduced;
    totalUnitsProduced += units;

    let qEffect = 0;
    if (model.internals === "triple_tested" && model.engine === "reliable") {
      qEffect = 3;
    } else if (
      model.internals === "triple_tested" &&
      model.engine === "high_performance"
    ) {
      qEffect = 1;
    } else if (
      model.internals === "mass_produced" &&
      model.engine === "reliable"
    ) {
      qEffect = 1;
    } else if (
      model.internals === "mass_produced" &&
      model.engine === "high_performance"
    ) {
      qEffect = 0;
    } else if (model.internals === "low_grade") {
      qEffect = -2;
    }

    // cheap engine penalty
    if (model.engine === "cheap") {
      qEffect -= 1;
    }

    weightedQualityEffect += qEffect * units;
  }

  const qualityEffect =
    totalUnitsProduced > 0 ? weightedQualityEffect / totalUnitsProduced : 0;

  // Recall penalty: use worst recall across all models
  const recallTierOrder = { none: 0, minor: 1, major: 2, critical: 3 } as const;
  let worstRecallTierIdx = 0;
  for (const result of modelResults) {
    const tierIdx = recallTierOrder[result.recallTier as keyof typeof recallTierOrder] ?? 0;
    if (tierIdx > worstRecallTierIdx) {
      worstRecallTierIdx = tierIdx;
    }
  }
  const RECALL_TIER_NAMES = ["none", "minor", "major", "critical"] as const;
  const worstRecallTierKey = RECALL_TIER_NAMES[worstRecallTierIdx] ?? "none";

  const recallPenalty = BRAND_RECALL_PENALTIES[worstRecallTierKey.toUpperCase() as keyof typeof BRAND_RECALL_PENALTIES] ?? 0;

  // Innovation effect from R&D spend (capped at +6)
  const innovationEffect = Math.min(
    (effectiveRdSpend / 5_000_000) * 2,
    6
  );

  // Industry spillover
  const industrySpillover = publicPerception > 30 ? 1 : 0;

  // Event effect
  const eventEffect = worldEventPerceptionModifier;

  const total =
    marketingEffect +
    qualityEffect +
    recallPenalty +
    innovationEffect +
    industrySpillover +
    eventEffect +
    brandDecay;

  return {
    marketingEffect: Math.round(marketingEffect * 100) / 100,
    qualityEffect: Math.round(qualityEffect * 100) / 100,
    recallPenalty,
    innovationEffect: Math.round(innovationEffect * 100) / 100,
    industrySpillover,
    eventEffect,
    brandDecay: Math.round(brandDecay * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ── Public perception update ──────────────────────────────────────────────────

export function computeNewPublicPerception(
  currentPublicPerception: number,
  totalCategoryMarketingSpend: number,
  anyTeamHasCriticalRecall: boolean,
  newPolicyScore: number,
  worldEventPerceptionModifier: number
): { newPublicPerception: number; perceptionPolicyBonus: number } {
  // Log curve: $5M → ~1.4pts, $10M → ~2.2pts, $20M → ~3.2pts. Prevents one
  // team's huge category spend from dominating public perception solo.
  const categoryEffect = Math.log(1 + totalCategoryMarketingSpend / 5_000_000) * 2;
  const recallEffect = anyTeamHasCriticalRecall ? -2 : 0;
  const policyEffect = newPolicyScore > 10 ? 1 : 0;
  const eventEffect = worldEventPerceptionModifier;

  const newPublicPerception = Math.max(
    -100,
    Math.min(
      100,
      currentPublicPerception +
        categoryEffect +
        recallEffect +
        eventEffect +
        policyEffect
    )
  );

  // Policy bonus from public perception (applied to next round)
  const perceptionPolicyBonus =
    Math.floor(Math.max(0, newPublicPerception) / 10) * 2;

  return { newPublicPerception, perceptionPolicyBonus };
}
