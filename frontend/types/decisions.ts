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
  techTreeUnlocks: string[];
}

export type SpaceSize = "small" | "medium" | "large";
export type SpaceOwnership = "rent" | "buy";

export interface ManufacturingSection {
  spaceAction: "keep" | "new" | "upgrade" | "sell";
  spaceSize?: SpaceSize;
  spaceOwnership?: SpaceOwnership;
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
  messagingType: "category" | "brand";
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
