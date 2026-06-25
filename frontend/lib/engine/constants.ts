// ── Engine Constants ──────────────────────────────────────────────────────────
// All tunable numbers live here. Change here, change everywhere.

export const REGIONS = [
  "WEST_COAST",
  "NORTHEAST",
  "SOUTHEAST",
  "MIDWEST",
  "SOUTHWEST",
] as const;
export type Region = (typeof REGIONS)[number];

export const VEHICLE_TYPES = [
  "COMPACT",
  "SEDAN",
  "SUV",
  "TRUCK",
  "SPORTS_CAR",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

// ── Year 1 initial demand ──────────────────────────────────────────────────────
export const YEAR1_TOTAL_FLYING = 300_000;
export const YEAR1_TOTAL_TRADITIONAL = 18_000_000;
export const YEAR1_TOTAL_VEHICLE_MARKET = 18_300_000;
export const VEHICLE_MARKET_GROWTH_RATE = 0.008;

export const YEAR1_DEMAND_BY_TYPE_BY_REGION: Record<
  VehicleType,
  Record<Region, number>
> = {
  COMPACT: {
    WEST_COAST: 27300,
    NORTHEAST: 26400,
    SOUTHEAST: 14520,
    MIDWEST: 11880,
    SOUTHWEST: 10080,
  },
  SEDAN: {
    WEST_COAST: 21840,
    NORTHEAST: 19800,
    SOUTHEAST: 16500,
    MIDWEST: 15120,
    SOUTHWEST: 9000,
  },
  SUV: {
    WEST_COAST: 15600,
    NORTHEAST: 11880,
    SOUTHEAST: 16500,
    MIDWEST: 15120,
    SOUTHWEST: 9000,
  },
  SPORTS_CAR: {
    WEST_COAST: 10920,
    NORTHEAST: 6600,
    SOUTHEAST: 5280,
    MIDWEST: 4320,
    SOUTHWEST: 4320,
  },
  TRUCK: {
    WEST_COAST: 2340,
    NORTHEAST: 1320,
    SOUTHEAST: 13200,
    MIDWEST: 7560,
    SOUTHWEST: 3600,
  },
};

export const YEAR1_DEMAND_BY_TYPE: Record<VehicleType, number> = {
  COMPACT: 90180,
  SEDAN: 82260,
  SUV: 68100,
  SPORTS_CAR: 31440,
  TRUCK: 28020,
};

// ── Type growth modifiers by round bracket ────────────────────────────────────
export const TYPE_GROWTH_MODIFIERS: Record<
  "1-3" | "4-6" | "7-8",
  Record<VehicleType, number>
> = {
  "1-3": {
    COMPACT: 1.2,
    SEDAN: 1.0,
    SUV: 0.9,
    SPORTS_CAR: 1.3,
    TRUCK: 0.7,
  },
  "4-6": {
    COMPACT: 1.0,
    SEDAN: 1.0,
    SUV: 1.1,
    SPORTS_CAR: 1.0,
    TRUCK: 1.0,
  },
  "7-8": {
    COMPACT: 0.9,
    SEDAN: 1.0,
    SUV: 1.2,
    SPORTS_CAR: 0.8,
    TRUCK: 1.4,
  },
};

export function getTypeGrowthModifiers(
  roundNumber: number
): Record<VehicleType, number> {
  if (roundNumber <= 3) return TYPE_GROWTH_MODIFIERS["1-3"];
  if (roundNumber <= 6) return TYPE_GROWTH_MODIFIERS["4-6"];
  return TYPE_GROWTH_MODIFIERS["7-8"];
}

// ── Price elasticity ──────────────────────────────────────────────────────────
export const PRICE_ELASTICITY: Record<VehicleType, number> = {
  COMPACT: 1.5,
  SEDAN: 1.0,
  SUV: 0.7,
  TRUCK: 0.5,
  SPORTS_CAR: 0, // prestige pricing — handled separately
};

// ── Absolute demand price curve ───────────────────────────────────────────────
// Total market pool shrinks when industry avg price deviates from this range.
// Below low: up to +15% boost. Above high: linear decline toward 0.25× floor.
export const VEHICLE_PRICE_RANGE: Record<VehicleType, { low: number; high: number }> = {
  COMPACT:    { low: 60_000,  high: 110_000 },
  SEDAN:      { low: 75_000,  high: 140_000 },
  SUV:        { low: 95_000,  high: 175_000 },
  TRUCK:      { low: 85_000,  high: 160_000 },
  SPORTS_CAR: { low: 110_000, high: 270_000 }, // wider band — prestige pricing expected
};

// ── Brand perception divisors and floors ──────────────────────────────────────
export const BRAND_PERCEPTION_PARAMS: Record<
  VehicleType,
  { divisor: number; floor: number }
> = {
  COMPACT: { divisor: 250, floor: 0.6 },
  SEDAN: { divisor: 200, floor: 0.5 },
  SUV: { divisor: 175, floor: 0.43 },
  TRUCK: { divisor: 200, floor: 0.5 },
  SPORTS_CAR: { divisor: 100, floor: 0.1 },
};

// ── Marketing channel effectiveness ──────────────────────────────────────────
export const MARKETING_CHANNEL_EFFECTIVENESS: Record<
  "tv_online" | "radio" | "print" | "paid_search",
  Record<VehicleType, number>
> = {
  tv_online: {
    COMPACT: 1.0,
    SEDAN: 1.0,
    SUV: 1.0,
    TRUCK: 1.0,
    SPORTS_CAR: 1.5,
  },
  radio: {
    COMPACT: 1.0,
    SEDAN: 1.0,
    SUV: 0.9,
    TRUCK: 1.1,
    SPORTS_CAR: 0.7,
  },
  print: {
    COMPACT: 0.8,
    SEDAN: 1.0,
    SUV: 1.1,
    TRUCK: 0.9,
    SPORTS_CAR: 1.5,
  },
  paid_search: {
    COMPACT: 1.2,
    SEDAN: 1.1,
    SUV: 1.0,
    TRUCK: 1.0,
    SPORTS_CAR: 0.5,
  },
};

// ── Parts reliability ─────────────────────────────────────────────────────────
export const PARTS_BASE_RELIABILITY: Record<string, number> = {
  triple_tested: 2.0,
  mass_produced: 1.0,
  low_grade: 0.5,
};

export const ENGINE_RELIABILITY_MOD: Record<string, number> = {
  high_performance: 0.9,
  reliable: 1.2,
  cheap: 0.7,
};

// ── Base repair rates ─────────────────────────────────────────────────────────
export const BASE_REPAIR_RATE: Record<VehicleType, number> = {
  COMPACT: 0.07,
  SEDAN: 0.08,
  SUV: 0.09,
  SPORTS_CAR: 0.08,
  TRUCK: 0.12,
};

export const AVG_REPAIR_VALUE = 2_400;

/** Extra COGS per unit sold in a region with no local production facility */
export const SHIPPING_COST_PER_UNIT = 1_500;

// ── Manufacturing space costs ─────────────────────────────────────────────────
export const SPACE_COSTS: Record<
  "small" | "medium" | "large",
  { capacity: number; buyPrice: number; maintenance: number }
> = {
  small: {
    capacity: 5_000,
    buyPrice: 70_000_000,
    maintenance: 6_000_000,
  },
  medium: {
    capacity: 20_000,
    buyPrice: 200_000_000,
    maintenance: 15_000_000,
  },
  large: {
    capacity: 50_000,
    buyPrice: 500_000_000,
    maintenance: 40_000_000,
  },
};

// ── Inventory carrying costs ──────────────────────────────────────────────────
export const INVENTORY_CARRYING_COST: Record<VehicleType, number> = {
  COMPACT: 600,
  SEDAN: 800,
  SUV: 1100,
  TRUCK: 1200,
  SPORTS_CAR: 1500,
};

// ── Lobbying conversion ───────────────────────────────────────────────────────
export const LOBBYING_TIER1_MAX = 5_000_000;
export const LOBBYING_TIER1_PER_PT = 1_000_000;
export const LOBBYING_TIER2_PER_PT = 2_000_000;
export const NPC_LOBBYING_DRAIN = 3; // pts per round

// ── Supply chain scarcity ─────────────────────────────────────────────────────
export const SCARCITY_TRIPLE_TESTED_TIER1_UNITS = 6_000;
export const SCARCITY_TRIPLE_TESTED_TIER1_COST = 2_000;
export const SCARCITY_TRIPLE_TESTED_TIER2_UNITS = 12_000;
export const SCARCITY_TRIPLE_TESTED_TIER2_COST = 5_000;
export const SCARCITY_MASS_PRODUCED_TIER1_UNITS = 30_000;
export const SCARCITY_MASS_PRODUCED_TIER1_COST = 800;

// ── Segment crowding ──────────────────────────────────────────────────────────
export const CROWDING_3_TEAMS_MKT_PENALTY = 0.85;
export const CROWDING_4PLUS_TEAMS_MKT_PENALTY = 0.70;
export const CROWDING_4PLUS_PRICE_REDUCTION = 0.08; // 8% forced down

// ── Regional glut ─────────────────────────────────────────────────────────────
export const GLUT_DISCOUNT_COEFFICIENT = 0.40;

// ── Talent war ────────────────────────────────────────────────────────────────
export const TALENT_WAR_THRESHOLD = 25_000_000;
export const TALENT_WAR_PENALTY_RATE = 0.20; // per $25M excess
export const TALENT_WAR_PENALTY_CAP = 0.30;

// ── R&D manufacturing efficiency multipliers ──────────────────────────────────
export const RD_MFG_EFFICIENCY_MULTIPLIERS: Record<string, number> = {
  mfg_efficiency_1: 0.92,
  mfg_efficiency_2: 0.88,
  mfg_efficiency_3: 0.90,
  mfg_mastery: 0.88,
};
export const MFG_COST_HARD_CAP_REDUCTION = 0.35; // max 35% cost reduction

// ── R&D quality bonuses (demand multiplier on quality_score) ──────────────────
export const RD_QUALITY_BONUSES: Record<string, number> = {
  advanced_aerodynamics: 0.10,
  fly_by_wire: 0.05,
  battery_research: 0.05,
};

// ── R&D conversion bonuses (applied to traditional→flying conversion) ─────────
export const RD_CONVERSION_BONUSES: Record<string, number> = {
  autonomous_flight: 0.0004,
  fuel_efficiency: 0.0003,
  all_electric: 0.0004,
  full_autonomy: 0.0006,
};

// ── R&D demand multipliers ────────────────────────────────────────────────────
export const RD_DEMAND_MULTIPLIERS: Record<string, number> = {
  full_autonomy: 1.10,
};

// ── Feature demand bonuses ────────────────────────────────────────────────────
export const FEATURE_DEMAND_BONUS: Record<string, number> = {
  touchscreen:       0.012, // +1.2%
  lane_assist:       0.020, // +2.0%
  cameras:           0.010, // +1.0%
  speakers:          0.010, // +1.0%
  leather:           0.022, // +2.2%
  phone_integration: 0.014, // +1.4%
  virtual_assistant: 0.025, // +2.5%
  entertainment:     0.018, // +1.8%
};

// ── Policy score demand multipliers ──────────────────────────────────────────
export const POLICY_DEMAND_BREAKPOINTS: Array<{
  score: number;
  factor: number;
}> = [
  { score: -20, factor: 0.0 },
  { score: -15, factor: 0.75 },
  { score: -10, factor: 0.85 },
  { score: -5, factor: 0.93 },
  { score: 0, factor: 1.0 },
  { score: 5, factor: 1.05 },
  { score: 10, factor: 1.12 },
  { score: 15, factor: 1.20 },
  { score: 20, factor: 1.30 },
];

// ── Demand growth constants ───────────────────────────────────────────────────
export const ORGANIC_GROWTH_RATE = 0.03;
export const CONVERSION_BASE_RATE = 0.001;
export const DEMAND_GROWTH_CAP_EXPONENT = 0.15; // Math.E ** 0.15 - 1 ≈ 0.1618

// ── Public perception ─────────────────────────────────────────────────────────
export const PUBLIC_PERCEPTION_START_FLYING = 30;
export const PUBLIC_PERCEPTION_START_TRADITIONAL = 0;

// ── Brand perception thresholds ───────────────────────────────────────────────
export const BRAND_RECALL_THRESHOLDS = {
  CRITICAL: 0.20, // >20%: -15 brand, -2 public
  MAJOR: 0.16, // 16-20%: -10 brand
  MINOR: 0.11, // 11-15%: -5 brand
};

export const BRAND_RECALL_PENALTIES = {
  CRITICAL: -15,
  MAJOR: -10,
  MINOR: -5,
  NONE: 0,
};

// ── Marketing – no-spend floor ─────────────────────────────────────────────────
export const MARKETING_ZERO_SPEND_FLOOR = 0.1;
export const REGIONAL_TARGETING_BONUS = 0.20; // +20% efficiency for targeted

// ── R&D recurring costs ───────────────────────────────────────────────────────
export const RD_RECURRING_COSTS: Record<string, number> = {
  marketingEffectiveness: 3_000_000,
  partDependability: 5_000_000,
  pricingResearch: 1_000_000,
  competitorResearch: 2_000_000,
  marketResearch: 1_500_000,
};

// ── Tech tree costs ───────────────────────────────────────────────────────────
export const TECH_TREE_COSTS: Record<string, number> = {
  mfg_efficiency_1: 4_000_000,
  advanced_aerodynamics: 4_000_000,
  battery_research: 5_000_000,
  market_analytics: 3_000_000,
  mfg_efficiency_2: 5_000_000,
  fly_by_wire: 8_000_000,
  fuel_cell_research: 6_000_000,
  competitive_intel: 4_000_000,
  mfg_efficiency_3: 6_000_000,
  autonomous_flight: 12_000_000,
  fuel_efficiency: 7_000_000,
  demand_forecasting_ai: 6_000_000,
  mfg_mastery: 8_000_000,
  all_electric: 14_000_000,
  full_autonomy: 18_000_000,
  market_dominance: 10_000_000,
};

// ── all_electric policy bonus ──────────────────────────────────────────────────
export const ALL_ELECTRIC_POLICY_BONUS = 3;
