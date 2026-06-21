import { TeamMemberRole } from "@/app/generated/prisma/client";

// ── Game Code Generation ──────────────────────────────────────────────────────
// Excludes ambiguous chars: 0/O, 1/I/L

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateGameCode(): string {
  return Array.from(
    { length: 6 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
}

// ── World Events ──────────────────────────────────────────────────────────────

export interface WorldEvent {
  id: string;
  title: string;
  headline: string;
  description: string;
  category:
    | "regulatory_pro"
    | "regulatory_anti"
    | "economic"
    | "technological"
    | "competitive"
    | "environmental"
    | "opportunity";
  demandModifier: number;
  policyModifier: number;
  manufacturingCostModifier: number;
  perceptionModifier: number;
  rdCostModifier: number;
  regionalDemandModifiers: Partial<Record<string, number>>;
  typeModifiers: Partial<Record<string, number>>;
  recallRiskBonus: number;
  minPolicyScore: number;
  preferredPolicyScore?: number;
}

export const WORLD_EVENTS: WorldEvent[] = [
  {
    id: "faa_corridors",
    title: "FAA Opens Urban Test Corridors",
    headline: "FAA APPROVES URBAN AIR MOBILITY CORRIDORS IN 12 MAJOR CITIES",
    description:
      "The Federal Aviation Administration has approved a framework for urban flying car corridors, triggering a surge in consumer interest and policy goodwill.",
    category: "regulatory_pro",
    demandModifier: 0.05,
    policyModifier: 2,
    manufacturingCostModifier: 0,
    perceptionModifier: 3,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: 0,
    preferredPolicyScore: 5,
  },
  {
    id: "npc_crash",
    title: "Major Flying Car Crash (NPC Manufacturer)",
    headline: "AERODYNE CORP CRASH RAISES SAFETY CONCERNS INDUSTRY-WIDE",
    description:
      "A high-profile crash by non-player flying car startup AeroDyne Corp has triggered congressional hearings and spooked consumers.",
    category: "regulatory_anti",
    demandModifier: -0.08,
    policyModifier: -2,
    manufacturingCostModifier: 0,
    perceptionModifier: -5,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0.05,
    minPolicyScore: -20,
  },
  {
    id: "rare_earth",
    title: "Rare Earth Shortage",
    headline: "GLOBAL RARE EARTH SHORTAGE SQUEEZES AEROSPACE SUPPLY CHAINS",
    description:
      "Geopolitical tensions have restricted rare earth exports, pushing up prices for premium components.",
    category: "technological",
    demandModifier: 0,
    policyModifier: 0,
    manufacturingCostModifier: 0.12,
    perceptionModifier: 0,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "recession",
    title: "Recession",
    headline: "ECONOMIC SLOWDOWN HITS CONSUMER SPENDING ON BIG TICKET ITEMS",
    description:
      "A broad economic contraction has reduced consumer confidence. Flying car demand drops significantly as buyers delay major purchases.",
    category: "economic",
    demandModifier: -0.15,
    policyModifier: 0,
    manufacturingCostModifier: 0,
    perceptionModifier: -1,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: { SPORTS_CAR: -0.10 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "ev_tax_credit",
    title: "EV Tax Credit Expansion",
    headline: "CONGRESS EXPANDS EV TAX CREDITS TO INCLUDE FLYING VEHICLES",
    description:
      "Newly expanded EV tax credits now cover fully electric flying vehicles, cutting R&D costs for electric drivetrains and boosting demand in price-sensitive segments.",
    category: "regulatory_pro",
    demandModifier: 0.04,
    policyModifier: 2,
    manufacturingCostModifier: 0,
    perceptionModifier: 2,
    rdCostModifier: -0.40,
    regionalDemandModifiers: {},
    typeModifiers: { COMPACT: 0.10 },
    recallRiskBonus: 0,
    minPolicyScore: 5,
    preferredPolicyScore: 10,
  },
  {
    id: "traditional_price_war",
    title: "Traditional Automaker Price War",
    headline: "FORD AND GM SLASH PRICES AS FLYING CAR THREAT LOOMS",
    description:
      "Legacy automakers have launched aggressive price cuts on traditional vehicles to defend market share against flying car adoption.",
    category: "competitive",
    demandModifier: -0.03,
    policyModifier: -1,
    manufacturingCostModifier: 0,
    perceptionModifier: 0,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "northeast_corridor",
    title: "Urban Air Mobility Corridor (Northeast)",
    headline: "NORTHEAST MEGACORRIDOR OPENS: NYC TO BOSTON AERIAL LANES APPROVED",
    description:
      "A regulatory approval specific to the Northeast has created a lucrative new air mobility corridor between major cities.",
    category: "opportunity",
    demandModifier: 0,
    policyModifier: 2,
    manufacturingCostModifier: 0,
    perceptionModifier: 4,
    rdCostModifier: 0,
    regionalDemandModifiers: { NORTHEAST: 0.20 },
    typeModifiers: { COMPACT: 0.10, SEDAN: 0.10 },
    recallRiskBonus: 0,
    minPolicyScore: 10,
    preferredPolicyScore: 15,
  },
  {
    id: "wildlife_regs",
    title: "Wildlife Protection Regulations",
    headline: "EPA MANDATES FLIGHT PATH RESTRICTIONS TO PROTECT MIGRATORY BIRDS",
    description:
      "New environmental regulations restrict flight paths and add compliance costs to manufacturing.",
    category: "environmental",
    demandModifier: -0.02,
    policyModifier: -3,
    manufacturingCostModifier: 0.01,
    perceptionModifier: -1,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "boom_economy",
    title: "Boom Economy",
    headline: "CONSUMER CONFIDENCE SURGES TO 20-YEAR HIGH",
    description:
      "A robust economy with low unemployment and rising wages has consumers eager to spend on premium goods.",
    category: "economic",
    demandModifier: 0.10,
    policyModifier: 0,
    manufacturingCostModifier: 0,
    perceptionModifier: 2,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: { SPORTS_CAR: 0.08 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "insurance_lobby",
    title: "Insurance Lobbies Against Flying Cars",
    headline: "INSURANCE INDUSTRY COALITION LAUNCHES ANTI-FLYING CAR CAMPAIGN",
    description:
      "The insurance industry has launched a well-funded lobbying effort against flying cars, citing liability concerns.",
    category: "regulatory_anti",
    demandModifier: -0.05,
    policyModifier: -3,
    manufacturingCostModifier: 0,
    perceptionModifier: -2,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "battery_breakthrough",
    title: "Battery Breakthrough",
    headline: "MIT ANNOUNCES SOLID-STATE BATTERY WITH 3X ENERGY DENSITY",
    description:
      "A major battery technology breakthrough has reduced R&D costs for battery and electric research paths.",
    category: "technological",
    demandModifier: 0.03,
    policyModifier: 1,
    manufacturingCostModifier: 0,
    perceptionModifier: 3,
    rdCostModifier: -0.20,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "noise_ordinance",
    title: "Noise Ordinance (Urban)",
    headline: "URBAN NOISE ORDINANCES TARGET FLYING VEHICLE FLIGHT PATHS",
    description:
      "Major cities on the coasts have passed noise ordinances restricting low-altitude flying car routes during peak hours.",
    category: "environmental",
    demandModifier: 0,
    policyModifier: -1,
    manufacturingCostModifier: 0,
    perceptionModifier: -2,
    rdCostModifier: 0,
    regionalDemandModifiers: { NORTHEAST: -0.08, WEST_COAST: -0.08 },
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "foreign_entrant",
    title: "Foreign Flying Car Entrant",
    headline: "CHINESE EVERTRANS ENTERS US MARKET WITH BUDGET FLYING SEDAN",
    description:
      "A well-funded foreign flying car manufacturer has entered the US market with competitive pricing.",
    category: "competitive",
    demandModifier: -0.03,
    policyModifier: -1,
    manufacturingCostModifier: 0,
    perceptionModifier: 0,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: { COMPACT: -0.05, SEDAN: -0.05 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "tech_giant_partnership",
    title: "Tech Giant Partnership Auction",
    headline: "AMAZON AIR SEEKS EXCLUSIVE FLYING CAR DELIVERY PARTNER",
    description:
      "Amazon Air has announced a major commercial partnership opportunity. The publicity lifts all boats in the industry.",
    category: "opportunity",
    demandModifier: 0.03,
    policyModifier: 1,
    manufacturingCostModifier: 0,
    perceptionModifier: 3,
    rdCostModifier: -0.10,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: 15,
    preferredPolicyScore: 20,
  },
  {
    id: "safety_report_positive",
    title: "Consumer Safety Report (Positive)",
    headline: "CONSUMER REPORTS: FLYING CARS NOW SAFER THAN MOTORCYCLES",
    description:
      "A widely-read Consumer Reports study has concluded that modern flying cars have excellent safety records.",
    category: "regulatory_pro",
    demandModifier: 0.03,
    policyModifier: 1,
    manufacturingCostModifier: 0,
    perceptionModifier: 5,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -5,
    preferredPolicyScore: 5,
  },
];

export function drawWorldEvent(
  policyScore: number = 0,
  steeringTeams: { category: string; spend: number }[] = []
): WorldEvent {
  // Filter eligible events by policy score
  const eligible = WORLD_EVENTS.filter(
    (e) => policyScore >= e.minPolicyScore
  );

  if (eligible.length === 0) return WORLD_EVENTS[0];

  // Determine steering preference (highest-spend team's category)
  let preferredCategory: string | null = null;
  if (steeringTeams.length > 0) {
    const top = steeringTeams.reduce(
      (best, t) => (t.spend > best.spend ? t : best),
      steeringTeams[0]
    );
    preferredCategory = top.category;
  }

  // Build weighted list
  const weights: number[] = eligible.map((e) => {
    let w = 1;
    if (preferredCategory && e.category === preferredCategory) w *= 3;
    if (
      e.preferredPolicyScore !== undefined &&
      policyScore >= e.preferredPolicyScore
    ) {
      w *= 2;
    }
    return w;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  for (let i = 0; i < eligible.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return eligible[i];
  }

  return eligible[eligible.length - 1];
}

// ── Role Descriptions ─────────────────────────────────────────────────────────

export const ROLE_DESCRIPTIONS: Record<TeamMemberRole, string> = {
  CEO: "THE BOSS — submits final decisions each round",
  CFO: "MONEY WIZARD — manages manufacturing budget & cash",
  CMO: "HYPE MASTER — runs marketing & brand campaigns",
  CTO: "TECH GENIUS — designs vehicles & unlocks R&D",
  COO: "POWER BROKER — handles lobbying & policy",
};

export const ROLE_COLORS: Record<TeamMemberRole, string> = {
  CEO: "#ffbe0b",
  CFO: "#39ff14",
  CMO: "#ff006e",
  CTO: "#00f5ff",
  COO: "#c77dff",
};

export const ALL_ROLES: TeamMemberRole[] = [
  "CEO",
  "CFO",
  "CMO",
  "CTO",
  "COO",
];

// ── Year 1 Market Briefing ────────────────────────────────────────────────────

export interface MarketBriefing {
  totalFlyingCarDemand: number;
  demandByType: {
    compact: number;
    sedan: number;
    suv: number;
    sportscar: number;
    truck: number;
  };
  publicPerception: number;
  policyScore: number;
  economicCondition: string;
  npcLobbyingNote: string;
  generatedAt: string;
}

export function buildYear1Briefing(
  economicCondition: string
): MarketBriefing {
  return {
    totalFlyingCarDemand: 300000,
    demandByType: {
      compact: 90180,
      sedan: 82260,
      suv: 68100,
      sportscar: 31440,
      truck: 28020,
    },
    publicPerception: 30,
    policyScore: 0,
    economicCondition,
    npcLobbyingNote:
      "Traditional car industry lobbies -3 policy points/year automatically.",
    generatedAt: new Date().toISOString(),
  };
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}
