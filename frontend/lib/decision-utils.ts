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
    recurringTargets: {},
    techTreeUnlocks: [],
    intelPurchases: [],
  };
}

export function getEmptyManufacturingSection(): ManufacturingSection {
  return { newFacilities: [], productionRuns: [] };
}

export function getEmptyProductionSection(): ProductionSection {
  return { models: [] };
}

export function getEmptyMarketingSection(): MarketingSection {
  return {
    totalBudget: 0,
    categorySplit: 0,
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
  touchscreen:       800,   // +1.2% demand  → 1.5% per $1K
  lane_assist:       1_200, // +2.0% demand  → 1.7% per $1K
  cameras:           700,   // +1.0% demand  → 1.4% per $1K
  speakers:          600,   // +1.0% demand  → 1.7% per $1K
  leather:           1_500, // +2.2% demand  → 1.5% per $1K
  phone_integration: 1_000, // +1.4% demand  → 1.4% per $1K
  virtual_assistant: 2_000, // +2.5% demand  → 1.25% per $1K
  entertainment:     1_300, // +1.8% demand  → 1.4% per $1K
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
      const runs = d.productionRuns;
      return Array.isArray(runs) && runs.length > 0;
    }
    case "productionSection": {
      const models = d.models;
      if (!Array.isArray(models) || models.length === 0) return false;
      return models.every((m: Record<string, unknown>) => {
        if (Number(m.salePrice) <= 0) return false;
        const alloc = m.regionalAllocation as Record<string, number> | undefined;
        const total = alloc ? Object.values(alloc).reduce((s, v) => s + (v ?? 0), 0) : 0;
        return Math.abs(total - 100) <= 1;
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

export type TechTree = "mfg" | "aero" | "power" | "market";

export interface TechNode {
  key: string;
  name: string;
  desc: string;
  cost: number;
  tier: number;
  tree: TechTree;
  prereqs: string[];
  available: boolean;
}

const TECH_TREE_DEF: Omit<TechNode, "available">[] = [
  // Tier 1
  {
    key: "mfg_efficiency_1", name: "Mfg Efficiency I", tree: "mfg", tier: 1, cost: 4_000_000, prereqs: [],
    desc: "Streamline your production line. Reduces manufacturing cost per unit by ~8%. Invest here early — every unit you produce from here on costs less, compounding across the whole game.",
  },
  {
    key: "advanced_aerodynamics", name: "Advanced Aerodynamics", tree: "aero", tier: 1, cost: 4_000_000, prereqs: [],
    desc: "Proprietary airframe design that dramatically improves your quality score (+10%). Buyers notice — aerodynamically superior vehicles command higher prices and generate stronger word-of-mouth.",
  },
  {
    key: "battery_research", name: "Battery Research", tree: "power", tier: 1, cost: 5_000_000, prereqs: [],
    desc: "Next-gen energy density research that improves your quality score (+5%) and unlocks the power technology path. Required for Fuel Cell and All Electric. Foundational if you plan a clean energy strategy.",
  },
  {
    key: "market_analytics", name: "Market Analytics", tree: "market", tier: 1, cost: 3_000_000, prereqs: [],
    desc: "Data infrastructure that reveals market intel. Unlocks the ability to purchase region and segment demand reports. Also opens the competitive intelligence and forecasting tree. Cheapest Tier 1 — high ROI.",
  },
  // Tier 2
  {
    key: "mfg_efficiency_2", name: "Mfg Efficiency II", tree: "mfg", tier: 2, cost: 5_000_000, prereqs: ["mfg_efficiency_1"],
    desc: "Advanced lean manufacturing cuts unit cost by a further ~12% on top of Efficiency I. Stack this with I for serious cost advantages — particularly powerful for high-volume Compact and Sedan strategies.",
  },
  {
    key: "fly_by_wire", name: "Fly-By-Wire", tree: "aero", tier: 2, cost: 8_000_000, prereqs: ["advanced_aerodynamics"],
    desc: "Electronic flight control system. Improves safety scores and quality (+5%), and is a prerequisite for Autonomous Flight. Shows buyers your vehicle meets professional aviation standards — strong in safety-conscious markets.",
  },
  {
    key: "fuel_cell_research", name: "Fuel Cell Research", tree: "power", tier: 2, cost: 6_000_000, prereqs: ["battery_research"],
    desc: "Hydrogen fuel cell technology improves range and lowers operating cost perception. Prerequisite for Fuel Efficiency and All Electric. A necessary waypoint on the path to the Full Autonomy endgame.",
  },
  {
    key: "competitive_intel", name: "Competitive Intel", tree: "market", tier: 2, cost: 4_000_000, prereqs: ["market_analytics"],
    desc: "Visibility into rival pricing and positioning. Each round you'll see a summary of competitor decisions before you finalise yours — a real strategic edge. Also unlocks the Demand Forecasting AI path.",
  },
  // Tier 3
  {
    key: "mfg_efficiency_3", name: "Mfg Efficiency III", tree: "mfg", tier: 3, cost: 6_000_000, prereqs: ["mfg_efficiency_2"],
    desc: "Precision robotics and supplier renegotiation cuts cost another ~10%. By Tier 3 you have the lowest unit cost in the industry — critical for outlasting rivals in price-sensitive segments like Compact.",
  },
  {
    key: "autonomous_flight", name: "Autonomous Flight", tree: "aero", tier: 3, cost: 12_000_000, prereqs: ["fly_by_wire"],
    desc: "Pilot-optional autopilot dramatically boosts quality score and public perception. Broad demand multiplier applies across all your models. Prerequisite for Full Autonomy — the most powerful Tier 4 node.",
  },
  {
    key: "fuel_efficiency", name: "Fuel Efficiency", tree: "power", tier: 3, cost: 7_000_000, prereqs: ["fuel_cell_research"],
    desc: "Optimised energy management cuts operating costs and improves quality perception. Buyers increasingly care about running costs — this widens your addressable market and improves policy standing.",
  },
  {
    key: "demand_forecasting_ai", name: "Demand Forecasting AI", tree: "market", tier: 3, cost: 6_000_000, prereqs: ["competitive_intel"],
    desc: "Machine-learning demand models give you early-round visibility into which segments will grow next year. Make production and pricing decisions with a forecast others are flying blind on. Prerequisite for Market Dominance.",
  },
  // Tier 4
  {
    key: "mfg_mastery", name: "Manufacturing Mastery", tree: "mfg", tier: 4, cost: 8_000_000, prereqs: ["mfg_efficiency_3"],
    desc: "Pinnacle of production excellence. Further ~12% unit cost reduction, plus your factories run at peak capacity. Combined with Efficiency I–III, your total manufacturing cost advantage versus rivals becomes decisive.",
  },
  {
    key: "all_electric", name: "All Electric", tree: "power", tier: 4, cost: 14_000_000, prereqs: ["fuel_efficiency"],
    desc: "Fully electric powertrain across your fleet. Generates a major policy score bonus each round — regulators love it. Also significantly boosts quality and public perception. Required for Full Autonomy.",
  },
  {
    key: "full_autonomy", name: "Full Autonomy", tree: "aero", tier: 4, cost: 18_000_000, prereqs: ["autonomous_flight", "all_electric"],
    desc: "Level 5 autonomous flying vehicles. The most powerful tech node in the game — broad quality multiplier, demand surge, and makes your vehicles the definitive premium product. Requires both Autonomous Flight and All Electric.",
  },
  {
    key: "market_dominance", name: "Market Dominance", tree: "market", tier: 4, cost: 10_000_000, prereqs: ["demand_forecasting_ai", "competitive_intel"],
    desc: "Total market intelligence supremacy. You see full competitor pricing, regional demand shifts, and segment saturation before each round closes. Combine with Demand Forecasting AI to always be a step ahead.",
  },
];

/**
 * Returns the full tech tree with `available` flag set based on:
 * - existing: RdUnlock keys the team already owns
 * - selectedThisRound: keys already chosen in rdSection.techTreeUnlocks this round
 *
 * A node is available if:
 *   - Not already owned
 *   - Not already selected this round
 *   - All prereqs are satisfied by OWNED unlocks only
 *
 * Prereqs are NOT satisfied by same-round selections: you may buy at most one tier
 * per tree per round, so you can never chain two tiers of the same tree in one round.
 */
export function getTechTreeUnlocks(
  existing: string[],
  selectedThisRound: string[] = []
): TechNode[] {
  const owned = new Set(existing);
  const selected = new Set(selectedThisRound);

  return TECH_TREE_DEF.map((node) => {
    const alreadyOwned = owned.has(node.key);
    const alreadySelected = selected.has(node.key);
    const prereqsMet = node.prereqs.every((p) => owned.has(p));

    const available = !alreadyOwned && !alreadySelected && prereqsMet;

    return { ...node, available };
  });
}

export { TECH_TREE_DEF };
