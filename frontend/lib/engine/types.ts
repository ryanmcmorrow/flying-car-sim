// ── Engine Internal Types ─────────────────────────────────────────────────────
// These are used only by the simulation engine. They are NOT Prisma types.

import type {
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
} from "@/types/decisions";
import type { Region, VehicleType } from "./constants";

// ── Input to resolveRound ─────────────────────────────────────────────────────

export interface TeamInput {
  teamId: string;
  brandName: string;
  cash: string; // Decimal as string
  vehicleSection: VehicleSection;
  rdSection: RdSection;
  manufacturingSection: ManufacturingSection;
  productionSection: ProductionSection;
  marketingSection: MarketingSection;
  lobbyingSection: LobbyingSection;
  // Prior round's installed base by type
  installedBase: Record<VehicleType, number>;
  // Keys the team ALREADY owns (from prior rounds), not including this round
  existingRdUnlocks: string[];
  // Inventory left over from prior round by type
  priorInventory: Record<VehicleType, number>;
  /** Facilities owned from prior rounds (auto-persist, pay maintenance) */
  currentFacilities: Array<{ region: string; size: "small" | "medium" | "large" }>;
}

export interface WorldEventInput {
  id: string;
  title: string;
  headline: string;
  description: string;
  category: string;
  demandModifier: number;
  policyModifier: number;
  manufacturingCostModifier: number;
  perceptionModifier: number;
  rdCostModifier: number;
  regionalDemandModifiers: Partial<Record<Region, number>>;
  typeModifiers: Partial<Record<VehicleType, number>>;
  recallRiskBonus: number;
}

export interface ResolveRoundInput {
  roundNumber: number;
  gameId: string;
  teams: TeamInput[];
  worldEvent: WorldEventInput;
  priorFlyingDemand: number;
  priorTraditionalDemand: number;
  priorDemandByTypeByRegion: Record<VehicleType, Record<Region, number>>;
  policyScore: number;
  publicPerception: number;
  teamBrandPerceptions: Record<string, number>;
  teamSpaces: Record<string, Array<{ region: string; size: string }>>;
  // perception policy bonus pending from last round
  perceptionPolicyBonusPending: number;
  // how many consecutive rounds each segment has been crowded (≥2 brands)
  segmentCrowdingRounds?: Record<string, number>;
}

// ── Output from resolveRound ──────────────────────────────────────────────────

export interface ModelResult {
  modelId: string;
  modelName: string;
  vehicleType: VehicleType;
  unitCost: number;
  salePrice: number;
  unitsProduced: number;
  unitsSold: number;
  unitsDemanded: number;
  unitsLeftInInventory: number;
  revenue: number;
  cogs: number;
  shippingCosts: number;
  repairRevenue: number;
  reliabilityScore: number;
  fleetRepairRate: number;
  recallTier: "none" | "minor" | "major" | "critical";
  unmetDemand: number;
  unmetDemandGrossProfit: number;
  byRegion: Array<{
    region: Region;
    allocated: number;
    demanded: number;
    sold: number;
    effectivePrice: number;
    glutDiscount: number;
    hasFactory: boolean;
    shippingCostHere: number;
    /** Price that would have cleared exactly your allocated supply. 0 = demand-limited regardless. */
    clearingPrice: number;
  }>;
}

export interface TeamRoundResult {
  decisions: {
    totalRdSpend: number;
    totalMarketingSpend: number;
    totalLobbyingSpend: number;
    rdUnlocksPurchased: string[];
    spaceSizeUsed: string;
    spaceOwnership: string;
    spaceAnnualCost: number;
    /** Vehicle type the team subscribed to Pricing Research for this round */
    pricingResearchSegment?: string;
    /** Tracked rival's detail — present only if Competitor Research was bought with a target */
    competitorIntel?: {
      brandName: string;
      marketShare: number;
      models: Array<{
        modelName: string;
        vehicleType: string;
        salePrice: number;
        unitsSold: number;
        unitsProduced: number;
      }>;
    };
    /** Exact region demand — present only if Market Research was bought with a target region */
    marketIntel?: {
      region: string;
      demandByType: Record<string, number>;
    };
  };
  revenue: {
    sales: number;
    repairs: number;
    total: number;
  };
  costs: {
    cogs: number;
    shipping: number;
    engineeringFees: number;
    spaceCost: number;
    rdSpend: number;
    marketingSpend: number;
    lobbyingSpend: number;
    inventoryCarrying: number;
    total: number;
  };
  netCashChange: number;
  priorCash: string;
  newCash: string;
  brandPerceptionStart: number;
  brandPerceptionEnd: number;
  brandPerceptionDelta: {
    marketingEffect: number;
    qualityEffect: number;
    recallPenalty: number;
    innovationEffect: number;
    industrySpillover: number;
    eventEffect: number;
    total: number;
  };
  modelResults: ModelResult[];
  scarcityImpacts: {
    supplyChainPenalty: number;
    crowdingApplied: string[];
    talentWarPenalty: number;
    glutByRegion: Record<string, number>;
  };
  marketShareByType: Record<string, number>;
}

export interface IndustrySnapshot {
  roundNumber: number;
  worldEvent: WorldEventInput;
  policyScore: number;
  publicPerception: number;
  totalFlyingCarDemand: number;
  totalTraditionalDemand: number;
  demandByType: Record<string, number>;
  demandByTypeByRegion: Record<string, Record<string, number>>;
  leaderboard: Array<{
    teamId: string;
    brandName: string;
    revenue: number;
    unitsSold: number;
    marketShare: number;
    cashBalance: string;
    brandPerception: number;
    rank: number;
  }>;
  segmentCrowding: Record<string, number>;
  averagePricesByType: Record<string, number>;
  publicRdAchievements: Array<{
    teamId: string;
    brandName: string;
    unlockKey: string;
    unlockDisplayName: string;
  }>;
  recalls: Array<{
    teamId: string;
    brandName: string;
    vehicleType: string;
    tier: string;
  }>;
  scarcityEvents: string[];
}

export interface NewRdUnlock {
  teamId: string;
  unlockKey: string;
  unlockedInRound: number;
  exclusiveUntilRound: number | null;
}

export interface InstalledBaseUpdate {
  teamId: string;
  vehicleType: VehicleType;
  unitsToAdd: number;
}

export interface ResolveRoundOutput {
  teamResults: Record<string, TeamRoundResult>;
  industrySnapshot: IndustrySnapshot;
  newRdUnlocks: NewRdUnlock[];
  installedBaseUpdates: InstalledBaseUpdate[];
  nextRoundSettings: {
    policyScore: number;
    publicPerception: number;
    teamBrandPerceptions: Record<string, number>;
    teamSpaces: Record<string, Array<{ region: string; size: string }>>;
    totalFlyingCarDemand: number;
    totalTraditionalDemand: number;
    demandByType: Record<string, number>;
    demandByTypeByRegion: Record<string, Record<string, number>>;
    perceptionPolicyBonusPending: number;
    segmentCrowdingRounds: Record<string, number>;
  };
  newCashByTeam: Record<string, string>;
}
