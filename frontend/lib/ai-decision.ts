import type {
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
  VehicleModel,
} from "@/types/decisions";
import { TECH_TREE_COSTS, SPACE_COSTS, RD_RECURRING_COSTS } from "@/lib/engine/constants";

export type AiDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface AiDecisionInput {
  difficulty: AiDifficulty;
  roundNumber: number;
  teamId: string;
  currentFacilities: Array<{ region: string; size: string }>;
  rdUnlocks: string[];
  cash: number;
  previousModels: VehicleModel[];
}

export interface AiDecisionOutput {
  vehicleSection: VehicleSection;
  rdSection: RdSection;
  manufacturingSection: ManufacturingSection;
  productionSection: ProductionSection;
  marketingSection: MarketingSection;
  lobbyingSection: LobbyingSection;
}

// ── Cost helpers ──────────────────────────────────────────────────────────────

const BASE_COSTS: Record<string, number> = {
  COMPACT: 23_000, SEDAN: 28_000, SUV: 35_000, TRUCK: 47_000, SPORTS_CAR: 88_000,
};
const ENGINE_ADDERS: Record<string, number> = {
  high_performance: 6_000, reliable: 2_500, cheap: 0,
};
const INTERNALS_ADDERS: Record<string, number> = {
  triple_tested: 4_000, mass_produced: 1_000, low_grade: 0,
};
const FEATURE_ADDERS: Record<string, number> = {
  touchscreen: 1_200, lane_assist: 1_800, cameras: 1_000, speakers: 800,
  leather: 2_000, phone_integration: 1_200, virtual_assistant: 3_000, entertainment: 1_500,
};

function unitCost(model: Omit<VehicleModel, "id" | "name" | "isNewDesign">): number {
  return (
    (BASE_COSTS[model.vehicleType] ?? 0) +
    (ENGINE_ADDERS[model.engine] ?? 0) +
    (INTERNALS_ADDERS[model.internals] ?? 0) +
    model.features.reduce((s, f) => s + (FEATURE_ADDERS[f] ?? 0), 0)
  );
}

// ── R&D progression tables ────────────────────────────────────────────────────
// Each entry is the set of tech tree unlocks to attempt in that round.

const RD_PROGRESSION: Record<AiDifficulty, string[][]> = {
  EASY: [
    [], [], ["battery_research"], [], [], [], [], [],
  ],
  MEDIUM: [
    ["market_analytics"],
    ["mfg_efficiency_1"],
    ["advanced_aerodynamics"],
    ["competitive_intel"],
    ["mfg_efficiency_2"],
    [], [], [],
  ],
  HARD: [
    ["market_analytics", "mfg_efficiency_1"],
    ["advanced_aerodynamics", "mfg_efficiency_2"],
    ["fly_by_wire", "competitive_intel"],
    ["autonomous_flight", "mfg_efficiency_3"],
    ["fuel_efficiency", "all_electric"],
    ["mfg_mastery"],
    ["full_autonomy", "market_dominance"],
    [],
  ],
};

const RECURRING_BY_ROUND: Record<AiDifficulty, (round: number) => Partial<Record<string, boolean>>> = {
  EASY:   () => ({}),
  MEDIUM: (r) => r >= 3 ? { marketResearch: true } : {},
  HARD:   (r) => r >= 2 ? { pricingResearch: true, marketResearch: true } : {},
};

// ── Strategy presets ──────────────────────────────────────────────────────────

const PRESETS = {
  EASY: {
    vehicleType: "COMPACT" as const,
    engine: "cheap" as const,
    internals: "low_grade" as const,
    features: ["touchscreen"] as VehicleModel["features"],
    modelName: "Model A",
    factoryRegion: "NORTHEAST" as const, // suboptimal
    unitTarget: 3_500,
    basePrice: { COMPACT: 108_000, SEDAN: 155_000, SUV: 190_000, TRUCK: 175_000, SPORTS_CAR: 280_000 },
    regionAlloc: (_: string) => ({ WEST_COAST: 20, NORTHEAST: 20, SOUTHEAST: 20, MIDWEST: 20, SOUTHWEST: 20 }),
    marketingBudget: 3_000_000,
    channels: { tv_online: 60, radio: 20, print: 10, paid_search: 10 },
    lobbySpend: 0,
    categorySplit: 50,
  },
  MEDIUM: {
    vehicleType: "COMPACT" as const,
    engine: "reliable" as const,
    internals: "mass_produced" as const,
    features: ["touchscreen", "lane_assist"] as VehicleModel["features"],
    modelName: "City Cruiser",
    factoryRegion: "MIDWEST" as const,
    unitTarget: 5_000,
    basePrice: { COMPACT: 82_000, SEDAN: 110_000, SUV: 145_000, TRUCK: 130_000, SPORTS_CAR: 195_000 },
    regionAlloc: (_: string) => ({ WEST_COAST: 30, NORTHEAST: 29, SOUTHEAST: 16, MIDWEST: 14, SOUTHWEST: 11 }),
    marketingBudget: 8_000_000,
    channels: { tv_online: 50, radio: 20, print: 10, paid_search: 20 },
    lobbySpend: 1_000_000,
    categorySplit: 60,
  },
  HARD: {
    vehicleType: "SEDAN" as const,
    engine: "reliable" as const,
    internals: "mass_produced" as const,
    features: ["touchscreen", "lane_assist", "cameras", "leather"] as VehicleModel["features"],
    modelName: "Executive",
    factoryRegion: "MIDWEST" as const,
    unitTarget: 5_000,
    basePrice: { COMPACT: 76_000, SEDAN: 112_000, SUV: 148_000, TRUCK: 135_000, SPORTS_CAR: 215_000 },
    regionAlloc: (vt: string) => vt === "SEDAN"
      ? { WEST_COAST: 27, NORTHEAST: 24, SOUTHEAST: 20, MIDWEST: 18, SOUTHWEST: 11 }
      : { WEST_COAST: 25, NORTHEAST: 25, SOUTHEAST: 20, MIDWEST: 18, SOUTHWEST: 12 },
    marketingBudget: 12_000_000,
    channels: { tv_online: 40, radio: 15, print: 20, paid_search: 25 },
    lobbySpend: 2_000_000,
    categorySplit: 65,
  },
};

// ── Main generator ────────────────────────────────────────────────────────────

export function generateAiDecision(input: AiDecisionInput): AiDecisionOutput {
  const { difficulty, roundNumber, teamId, currentFacilities, rdUnlocks, cash, previousModels } = input;
  const preset = PRESETS[difficulty];
  const modelId = `ai-${teamId.slice(-8)}-v1`;

  // ── Vehicle section ────────────────────────────────────────────────────────
  let models: VehicleModel[];
  if (previousModels.length > 0) {
    // Carry forward existing models unchanged
    models = previousModels.map((m) => ({ ...m, isNewDesign: false }));
  } else {
    models = [{
      id: modelId,
      name: preset.modelName,
      vehicleType: preset.vehicleType,
      engine: preset.engine,
      internals: preset.internals,
      features: preset.features,
      isNewDesign: true,
    }];
  }
  const vehicleSection: VehicleSection = { models };

  // ── Manufacturing: new factory only if none exist yet ─────────────────────
  const hasFactory = currentFacilities.length > 0;
  const newFacilities = hasFactory
    ? []
    : [{ region: preset.factoryRegion, size: "small" as const }];

  // ── Capacity for production planning ──────────────────────────────────────
  const existingCapacity = currentFacilities.reduce((sum, f) => {
    return sum + (SPACE_COSTS[f.size as keyof typeof SPACE_COSTS]?.capacity ?? 0);
  }, 0);
  const totalCapacity = existingCapacity + (hasFactory ? 0 : SPACE_COSTS.small.capacity);
  const unitTarget = Math.min(preset.unitTarget, totalCapacity);

  // ── R&D: unlock what's new in this round's progression ────────────────────
  const roundIdx = Math.min(roundNumber - 1, 7);
  const wantedUnlocks = RD_PROGRESSION[difficulty][roundIdx] ?? [];
  const newUnlocks = wantedUnlocks.filter((key) => !rdUnlocks.includes(key));
  const unlockCost = newUnlocks.reduce((s, k) => s + (TECH_TREE_COSTS[k] ?? 0), 0);

  const recurringFlags = RECURRING_BY_ROUND[difficulty](roundNumber);
  const recurringCost = Object.entries(recurringFlags).reduce(
    (s, [k, on]) => s + (on ? (RD_RECURRING_COSTS[k] ?? 0) : 0),
    0
  );
  const rdSection: RdSection = {
    recurring: {
      marketingEffectiveness: false,
      partDependability: false,
      pricingResearch: recurringFlags.pricingResearch === true,
      competitorResearch: false,
      marketResearch: recurringFlags.marketResearch === true,
    },
    recurringTargets: {},
    techTreeUnlocks: newUnlocks,
    intelPurchases: [],
  };

  // ── Budget check and scale-down ────────────────────────────────────────────
  const primaryModel = models[0];
  const costPerUnit = unitCost({
    vehicleType: primaryModel.vehicleType,
    engine: primaryModel.engine,
    internals: primaryModel.internals,
    features: primaryModel.features,
  });
  const factoryCost = hasFactory
    ? currentFacilities.reduce((s, f) => s + (SPACE_COSTS[f.size as keyof typeof SPACE_COSTS]?.maintenance ?? 0), 0)
    : SPACE_COSTS.small.buyPrice;

  // Reserve budget for non-COGS items
  const fixedCosts = factoryCost + unlockCost + recurringCost + preset.marketingBudget + preset.lobbySpend;
  const cogsAllowance = Math.max(0, cash * 0.9 - fixedCosts);
  const safeUnits = Math.min(unitTarget, Math.floor(cogsAllowance / costPerUnit));
  const units = Math.max(0, safeUnits);

  const manufacturingSection: ManufacturingSection = {
    newFacilities,
    productionRuns: units > 0 ? [{ modelId: primaryModel.id, units }] : [],
  };

  // ── Production section: price + regional allocation ────────────────────────
  const salePrice = preset.basePrice[primaryModel.vehicleType as keyof typeof preset.basePrice] ?? 100_000;
  const allocation = preset.regionAlloc(primaryModel.vehicleType);

  const productionSection: ProductionSection = {
    models: models.map((m) => ({
      modelId: m.id,
      salePrice,
      inventoryDiscount: 10,
      regionalAllocation: {
        WEST_COAST: allocation.WEST_COAST ?? 20,
        NORTHEAST: allocation.NORTHEAST ?? 20,
        SOUTHEAST: allocation.SOUTHEAST ?? 20,
        MIDWEST: allocation.MIDWEST ?? 20,
        SOUTHWEST: allocation.SOUTHWEST ?? 20,
      },
    })),
  };

  // ── Marketing section ─────────────────────────────────────────────────────
  const marketingSection: MarketingSection = {
    totalBudget: preset.marketingBudget,
    categorySplit: preset.categorySplit,
    tone: "positive",
    channels: preset.channels,
    regionalTargeting: "national",
  };

  // ── Lobbying section ──────────────────────────────────────────────────────
  const lobbyingSection: LobbyingSection = {
    lobbyingSpend: preset.lobbySpend,
  };

  return { vehicleSection, rdSection, manufacturingSection, productionSection, marketingSection, lobbyingSection };
}
