// ── Decision Section Types ────────────────────────────────────────────────────

export interface VehicleModel {
  id: string;
  name: string;
  vehicleType: "COMPACT" | "SEDAN" | "SUV" | "TRUCK" | "SPORTS_CAR";
  engine: "high_performance" | "reliable" | "cheap";
  internals: "triple_tested" | "mass_produced" | "low_grade";
  features: Array<
    | "touchscreen"
    | "lane_assist"
    | "cameras"
    | "speakers"
    | "leather"
    | "phone_integration"
    | "virtual_assistant"
    | "entertainment"
  >;
  isNewDesign: boolean;
}

export interface VehicleSection {
  models: VehicleModel[];
}

export interface RdSection {
  recurring: {
    marketingEffectiveness: boolean; // $3M
    partDependability: boolean; // $5M
    pricingResearch: boolean; // $1M
    competitorResearch: boolean; // $2M
    marketResearch: boolean; // $1.5M
  };
  /** Targeted focus for recurring subscriptions (which competitor/segment/region to analyze) */
  recurringTargets: {
    competitorResearch?: string; // teamId of rival to track
    pricingResearch?: string;    // vehicle type to price-analyze: COMPACT | SEDAN | SUV | SPORTS_CAR | TRUCK
    marketResearch?: string;     // region to focus: WEST_COAST | NORTHEAST | etc.
  };
  techTreeUnlocks: string[];
  /** One-time market intel purchases: e.g. "intel_region_WEST_COAST", "intel_type_COMPACT" */
  intelPurchases: string[];
}

export type SpaceSize = "small" | "medium" | "large";
export type FacilityRegion = "WEST_COAST" | "NORTHEAST" | "SOUTHEAST" | "MIDWEST" | "SOUTHWEST";

export interface Facility {
  region: FacilityRegion;
  size: SpaceSize;
}

export interface ManufacturingSection {
  /** New facilities built this round — paid upfront, owned permanently */
  newFacilities: Facility[];
  productionRuns: Array<{
    modelId: string;
    units: number;
  }>;
}

export interface ProductionSection {
  models: Array<{
    modelId: string;
    salePrice: number;
    inventoryDiscount: number;
    regionalAllocation: {
      WEST_COAST: number;
      NORTHEAST: number;
      SOUTHEAST: number;
      MIDWEST: number;
      SOUTHWEST: number;
    };
  }>;
}

export interface MarketingSection {
  totalBudget: number;
  categorySplit: number; // 0–100: % of totalBudget going to category (market growth); remainder is brand
  tone: "positive" | "attack";
  attackTargetTeamId?: string;
  channels: {
    tv_online: number;
    radio: number;
    print: number;
    paid_search: number;
  };
  regionalTargeting: "national" | "targeted";
  regionalBudgetSplit?: {
    WEST_COAST: number;
    NORTHEAST: number;
    SOUTHEAST: number;
    MIDWEST: number;
    SOUTHWEST: number;
  };
}

export interface LobbyingSection {
  lobbyingSpend: number;
  steeringCategory?:
    | "regulatory_pro"
    | "regulatory_anti"
    | "economic"
    | "technological"
    | "competitive"
    | "environmental"
    | "opportunity";
}

export type SectionKey =
  | "vehicleSection"
  | "rdSection"
  | "manufacturingSection"
  | "productionSection"
  | "marketingSection"
  | "lobbyingSection";
