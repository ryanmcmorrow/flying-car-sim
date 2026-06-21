import type {
  VehicleModel,
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
  SectionKey,
} from "@/types/decisions";

// ── Empty Section Defaults ───────────────────────────────────────────────────

export function getEmptyVehicleSection(): VehicleSection {
  return { models: [] };
}

export function getEmptyRdSection(): RdSection {
  return {
    recurring: {
      marketingEffectiveness: false,
      partDependability: false,
      pricingResearch: false,
      competitorResearch: false,
      marketResearch: false,
    },
    techTreeUnlocks: [],
  };
}

export function getEmptyManufacturingSection(): ManufacturingSection {
  return {
    spaceAction: "keep",
    spaceSize: undefined,
    spaceOwnership: undefined,
    productionRuns: [],
  };
}

export function getEmptyProductionSection(): ProductionSection {
  return { models: [] };
}

export function getEmptyMarketingSection(): MarketingSection {
  return {
    totalBudget: 0,
    messagingType: "category",
    tone: "positive",
    channels: {
      tv_online: 0,
      radio: 0,
      print: 0,
      paid_search: 0,
    },
    regionalTargeting: "national",
  };
}

export function getEmptyLobbyingSection(): LobbyingSection {
  return { lobbyingSpend: 0 };
}

// ── Vehicle Cost Computations ────────────────────────────────────────────────

const BASE_COSTS: Record<string, number> = {
  COMPACT: 42000,
  SEDAN: 52000,
  SUV: 68000,
  TRUCK: 72000,
  SPORTS_CAR: 85000,
};

const ENGINE_ADDERS: Record<string, number> = {
  high_performance: 9000,
  reliable: 3500,
  cheap: 0,
};

const INTERNALS_ADDERS: Record<string, number> = {
  triple_tested: 5500,
  mass_produced: 1200,
  low_grade: 0,
};

const FEATURE_COSTS: Record<string, number> = {
  touchscreen: 600,
  lane_assist: 900,
  cameras: 500,
  speakers: 700,
  leather: 1400,
  phone_integration: 400,
  virtual_assistant: 1800,
  entertainment: 1100,
};

const ENGINEERING_FEES: Record<string, number> = {
  COMPACT: 3_000_000,
  SEDAN: 4_000_000,
  SUV: 5_000_000,
  TRUCK: 5_000_000,
  SPORTS_CAR: 6_000_000,
};

export function computeModelUnitCost(model: VehicleModel): number {
  const base = BASE_COSTS[model.vehicleType] ?? 0;
  const engine = ENGINE_ADDERS[model.engine] ?? 0;
  const internals = INTERNALS_ADDERS[model.internals] ?? 0;
  const features = model.features.reduce(
    (sum, f) => sum + (FEATURE_COSTS[f] ?? 0),
    0
  );
  return base + engine + internals + features;
}

export function computeEngineeringFee(vehicleType: string): number {
  return ENGINEERING_FEES[vehicleType] ?? 0;
}

// ── Section Completeness ─────────────────────────────────────────────────────

export function isSectionComplete(section: SectionKey, data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  switch (section) {
    case "vehicleSection": {
      const models = d.models;
      return Array.isArray(models) && models.length > 0;
    }
    case "rdSection":
      // Always considered complete (no mandatory investment)
      return true;
    case "manufacturingSection": {
      const spaceAction = d.spaceAction;
      const runs = d.productionRuns;
      return (
        typeof spaceAction === "string" &&
        spaceAction !== "" &&
        Array.isArray(runs) &&
        runs.length > 0
      );
    }
    case "productionSection": {
      const models = d.models;
      if (!Array.isArray(models) || models.length === 0) return false;
      return models.every((m: Record<string, unknown>) => {
        const price = Number(m.salePrice);
        return price > 0;
      });
    }
    case "marketingSection": {
      const budget = Number(d.totalBudget);
      return budget > 0;
    }
    case "lobbyingSection":
      // CEO always sets this; 0 is valid (no lobbying)
      return true;
    default:
      return false;
  }
}

// ── Tech Tree ─────────────────────────────────────────────────────────────────

export interface TechNode {
  key: string;
  name: string;
  cost: number;
  tier: number;
  prereqs: string[];
  available: boolean;
}

const TECH_TREE_DEF: Omit<TechNode, "available">[] = [
  // Tier 1
  { key: "mfg_efficiency_1", name: "Mfg Efficiency I", cost: 4_000_000, tier: 1, prereqs: [] },
  { key: "advanced_aerodynamics", name: "Advanced Aerodynamics", cost: 4_000_000, tier: 1, prereqs: [] },
  { key: "battery_research", name: "Battery Research", cost: 5_000_000, tier: 1, prereqs: [] },
  { key: "market_analytics", name: "Market Analytics", cost: 3_000_000, tier: 1, prereqs: [] },
  // Tier 2
  { key: "mfg_efficiency_2", name: "Mfg Efficiency II", cost: 5_000_000, tier: 2, prereqs: ["mfg_efficiency_1"] },
  { key: "fly_by_wire", name: "Fly-By-Wire", cost: 8_000_000, tier: 2, prereqs: ["advanced_aerodynamics"] },
  { key: "fuel_cell_research", name: "Fuel Cell Research", cost: 6_000_000, tier: 2, prereqs: ["battery_research"] },
  { key: "competitive_intel", name: "Competitive Intel", cost: 4_000_000, tier: 2, prereqs: ["market_analytics"] },
  // Tier 3
  { key: "mfg_efficiency_3", name: "Mfg Efficiency III", cost: 6_000_000, tier: 3, prereqs: ["mfg_efficiency_2"] },
  { key: "autonomous_flight", name: "Autonomous Flight", cost: 12_000_000, tier: 3, prereqs: ["fly_by_wire"] },
  { key: "fuel_efficiency", name: "Fuel Efficiency", cost: 7_000_000, tier: 3, prereqs: ["fuel_cell_research"] },
  { key: "demand_forecasting_ai", name: "Demand Forecasting AI", cost: 6_000_000, tier: 3, prereqs: ["competitive_intel"] },
  // Tier 4
  { key: "mfg_mastery", name: "Manufacturing Mastery", cost: 8_000_000, tier: 4, prereqs: ["mfg_efficiency_3"] },
  { key: "all_electric", name: "All Electric", cost: 14_000_000, tier: 4, prereqs: ["fuel_efficiency"] },
  { key: "full_autonomy", name: "Full Autonomy", cost: 18_000_000, tier: 4, prereqs: ["autonomous_flight", "all_electric"] },
  { key: "market_dominance", name: "Market Dominance", cost: 10_000_000, tier: 4, prereqs: ["demand_forecasting_ai", "competitive_intel"] },
];

/**
 * Returns the full tech tree with `available` flag set based on:
 * - existing: RdUnlock keys the team already owns
 * - selectedThisRound: keys already chosen in rdSection.techTreeUnlocks this round
 *
 * A node is available if:
 *   - Not already owned
 *   - Not already selected this round
 *   - All prereqs are satisfied (owned OR selected this round)
 */
export function getTechTreeUnlocks(
  existing: string[],
  selectedThisRound: string[] = []
): TechNode[] {
  const owned = new Set(existing);
  const selected = new Set(selectedThisRound);
  const effective = new Set([...owned, ...selected]);

  return TECH_TREE_DEF.map((node) => {
    const alreadyOwned = owned.has(node.key);
    const alreadySelected = selected.has(node.key);
    const prereqsMet = node.prereqs.every((p) => effective.has(p));

    const available = !alreadyOwned && !alreadySelected && prereqsMet;

    return { ...node, available };
  });
}

export { TECH_TREE_DEF };
