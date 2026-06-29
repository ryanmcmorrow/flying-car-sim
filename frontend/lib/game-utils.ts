import { TeamMemberRole } from "@/app/generated/prisma/client";
import { YEAR1_TOTAL_FLYING, YEAR1_DEMAND_BY_TYPE } from "@/lib/engine/constants";

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
    headline: "FAA Approves Urban Air Mobility Corridors in 12 Major Cities",
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
    headline: "AeroDyne Corp Crash Raises Safety Concerns Industry-Wide",
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
    headline: "Global Rare Earth Shortage Squeezes Aerospace Supply Chains",
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
    headline: "Economic Slowdown Hits Consumer Spending on Big-Ticket Items",
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
    headline: "Congress Expands EV Tax Credits to Include Flying Vehicles",
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
    headline: "Ford and GM Slash Prices as Flying Car Threat Looms",
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
    headline: "Northeast Megacorridor Opens: NYC to Boston Aerial Lanes Approved",
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
    headline: "EPA Mandates Flight Path Restrictions to Protect Migratory Birds",
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
    headline: "Consumer Confidence Surges to 20-Year High",
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
    headline: "Insurance Industry Coalition Launches Anti-Flying Car Campaign",
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
    headline: "MIT Announces Solid-State Battery with 3x Energy Density",
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
    headline: "Urban Noise Ordinances Target Flying Vehicle Flight Paths",
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
    headline: "Chinese EverTrans Enters US Market with Budget Flying Sedan",
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
    headline: "Amazon Air Seeks Exclusive Flying Car Delivery Partner",
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
    headline: "Consumer Reports: Flying Cars Now Safer Than Motorcycles",
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
  // ── Additional events (Sprint 10 pool expansion) ───────────────────────────
  {
    id: "senate_commuter_act",
    title: "Air Commuter Mobility Act",
    headline: "Senate Passes Air Commuter Mobility Act; Flying Car Sales Tax Credit Signed into Law",
    description:
      "A bipartisan bill creates a federal tax credit for flying car purchases and directs the FAA to fast-track commuter corridor approvals. Analysts expect a significant demand tailwind over the next two years.",
    category: "regulatory_pro",
    demandModifier: 0.07,
    policyModifier: 3,
    manufacturingCostModifier: 0,
    perceptionModifier: 4,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: { COMPACT: 0.08, SEDAN: 0.05 },
    recallRiskBonus: 0,
    minPolicyScore: 5,
    preferredPolicyScore: 12,
  },
  {
    id: "mandatory_safety_inspection",
    title: "Mandatory Safety Inspection Program",
    headline: "NHTSA Mandates Annual Flying Car Safety Inspections; Compliance Costs Rise",
    description:
      "New federal regulations require all flying car owners to pass annual airworthiness inspections. The certification cost is passed through to buyers, damping demand and raising effective per-unit compliance burdens for manufacturers.",
    category: "regulatory_anti",
    demandModifier: -0.04,
    policyModifier: -2,
    manufacturingCostModifier: 0.05,
    perceptionModifier: -1,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "tech_sector_boom",
    title: "Tech Sector Boom",
    headline: "Silicon Valley Wealth Effect Drives Surge in Premium Flying Car Demand",
    description:
      "A wave of tech IPOs and soaring equity markets has created a new generation of wealthy buyers. Premium and sports segments see disproportionate gains as newly minted millionaires shop for status symbols.",
    category: "economic",
    demandModifier: 0.06,
    policyModifier: 0,
    manufacturingCostModifier: 0,
    perceptionModifier: 2,
    rdCostModifier: 0,
    regionalDemandModifiers: { WEST_COAST: 0.12, NORTHEAST: 0.08 },
    typeModifiers: { SPORTS_CAR: 0.15, SUV: 0.07 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "supply_chain_normalize",
    title: "Supply Chain Normalization",
    headline: "Global Aerospace Supply Chains Return to Pre-Shortage Levels",
    description:
      "After two years of disruption, semiconductor and rare earth supply chains have normalized. Manufacturing costs fall across the board as component availability improves and freight rates drop.",
    category: "technological",
    demandModifier: 0.02,
    policyModifier: 0,
    manufacturingCostModifier: -0.08,
    perceptionModifier: 1,
    rdCostModifier: -0.10,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "real_estate_slump",
    title: "Real Estate Slump",
    headline: "Housing Market Correction Rattles Consumer Confidence; Big-Ticket Purchases Deferred",
    description:
      "A sharp decline in home values has reduced household wealth and squeezed discretionary spending. Flying car purchases — already a significant financial commitment — are being deferred by middle-income buyers.",
    category: "economic",
    demandModifier: -0.08,
    policyModifier: 0,
    manufacturingCostModifier: 0,
    perceptionModifier: -1,
    rdCostModifier: 0,
    regionalDemandModifiers: { WEST_COAST: -0.10, NORTHEAST: -0.07 },
    typeModifiers: { COMPACT: -0.05 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "carbon_tax_fuel",
    title: "Carbon Tax on Fuel-Burning Aircraft",
    headline: "EPA Implements Carbon Levy on Combustion-Engine Flying Vehicles",
    description:
      "A new carbon tax applies a per-mile levy to all fuel-burning flying cars, increasing effective ownership costs. Electric and hybrid models are exempt, accelerating the shift toward all-electric drivetrains.",
    category: "environmental",
    demandModifier: -0.03,
    policyModifier: -1,
    manufacturingCostModifier: 0,
    perceptionModifier: 1,
    rdCostModifier: -0.15,
    regionalDemandModifiers: { WEST_COAST: 0.05, NORTHEAST: 0.04 },
    typeModifiers: { COMPACT: 0.04 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "green_infrastructure_bill",
    title: "Federal Aerial Infrastructure Bill",
    headline: "Congress Passes $40B Aerial Infrastructure Investment Package",
    description:
      "A landmark spending bill funds vertiport construction, urban air traffic management systems, and pilot training programs. The visible public investment significantly boosts consumer confidence in flying cars as a practical transportation solution.",
    category: "regulatory_pro",
    demandModifier: 0.06,
    policyModifier: 4,
    manufacturingCostModifier: 0,
    perceptionModifier: 6,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: 8,
    preferredPolicyScore: 15,
  },
  {
    id: "airline_opposition",
    title: "Airlines Mount Legal Challenge",
    headline: "Major Airlines File Federal Lawsuit to Block Urban Air Mobility Expansion",
    description:
      "A coalition of legacy airlines has filed a federal lawsuit challenging FAA airspace allocation for flying cars, arguing urban corridors create safety conflicts with commercial flight paths. Legal uncertainty dampens near-term investment.",
    category: "competitive",
    demandModifier: -0.05,
    policyModifier: -3,
    manufacturingCostModifier: 0,
    perceptionModifier: -3,
    rdCostModifier: 0,
    regionalDemandModifiers: { NORTHEAST: -0.06, WEST_COAST: -0.05 },
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "military_tech_transfer",
    title: "Military Aviation Technology Declassification",
    headline: "DoD Declassifies Advanced Propulsion Research; Aerospace Firms Rush to License",
    description:
      "The Department of Defense has declassified a tranche of advanced propulsion and autonomy research originally developed for unmanned aerial vehicles. Commercial flying car manufacturers gain access to decades of publicly-funded aeronautics R&D at dramatically reduced development cost.",
    category: "opportunity",
    demandModifier: 0.02,
    policyModifier: 2,
    manufacturingCostModifier: 0,
    perceptionModifier: 2,
    rdCostModifier: -0.25,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: 0,
    preferredPolicyScore: 8,
  },
  {
    id: "npc_autonomous_milestone",
    title: "NPC Startup Achieves Limited Autonomy",
    headline: "AeroDyne Spinoff Demonstrates Level-3 Autonomous Flying Car in Las Vegas Trial",
    description:
      "A non-player startup has demonstrated limited autonomous flight capability in a controlled trial. While not yet production-ready, the milestone raises public interest and sets competitive expectations for the industry's technology roadmap.",
    category: "technological",
    demandModifier: 0.04,
    policyModifier: 1,
    manufacturingCostModifier: 0,
    perceptionModifier: 4,
    rdCostModifier: 0.10,
    regionalDemandModifiers: {},
    typeModifiers: { COMPACT: 0.06 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "npc_mass_recall",
    title: "NPC Competitor Mass Recall",
    headline: "SkyCruise Corp Issues Emergency Recall of 12,000 Vehicles; Shares Collapse",
    description:
      "Non-player manufacturer SkyCruise Corp has issued a sweeping recall after a software fault caused in-flight guidance failures. The incident raises industry-wide safety scrutiny and briefly benefits established player brands whose reliability records are unimpeached.",
    category: "competitive",
    demandModifier: -0.04,
    policyModifier: -1,
    manufacturingCostModifier: 0,
    perceptionModifier: -4,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: {},
    recallRiskBonus: 0.03,
    minPolicyScore: -20,
  },
  {
    id: "urban_gridlock_crisis",
    title: "Urban Gridlock Crisis",
    headline: "Record Traffic Congestion in 10 U.S. Cities Reignites Flying Car Demand",
    description:
      "A summer of record-breaking traffic jams — averaging 72 minutes of daily commute delay in major metros — has driven a surge of consumer interest in aerial alternatives. Flying car test drive requests double across all regions.",
    category: "regulatory_pro",
    demandModifier: 0.08,
    policyModifier: 2,
    manufacturingCostModifier: 0,
    perceptionModifier: 5,
    rdCostModifier: 0,
    regionalDemandModifiers: { NORTHEAST: 0.10, WEST_COAST: 0.10 },
    typeModifiers: { COMPACT: 0.10, SEDAN: 0.06 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "midwest_west_corridor",
    title: "Midwest–West Coast Corridor Approval",
    headline: "FAA Greenlights Midwest–West Coast High-Speed Air Corridor",
    description:
      "A new approved air corridor connecting major Midwest cities to West Coast metros has opened a significant new commuter and freight market. Analysts expect a sustained demand shift in both regions.",
    category: "opportunity",
    demandModifier: 0.02,
    policyModifier: 3,
    manufacturingCostModifier: 0,
    perceptionModifier: 3,
    rdCostModifier: 0,
    regionalDemandModifiers: { MIDWEST: 0.15, WEST_COAST: 0.12 },
    typeModifiers: { SEDAN: 0.08, SUV: 0.06 },
    recallRiskBonus: 0,
    minPolicyScore: 5,
    preferredPolicyScore: 10,
  },
  {
    id: "inflation_shock",
    title: "Inflation Shock",
    headline: "Surprise CPI Spike Forces Fed Rate Hike; Auto Financing Costs Surge",
    description:
      "Unexpectedly high inflation data triggered an emergency Fed rate increase, pushing vehicle financing rates to multi-decade highs. Flying car monthly payments jump sharply, softening demand across all segments — price-sensitive buyers most affected.",
    category: "economic",
    demandModifier: -0.10,
    policyModifier: 0,
    manufacturingCostModifier: 0.04,
    perceptionModifier: -2,
    rdCostModifier: 0,
    regionalDemandModifiers: {},
    typeModifiers: { COMPACT: -0.08, SEDAN: -0.06 },
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "positive_emissions_study",
    title: "Lifecycle Emissions Study",
    headline: "Stanford Study: Flying Cars Reduce Net Carbon Emissions by 34% vs. Ground Transport",
    description:
      "A landmark lifecycle analysis from Stanford University finds that flying cars, when electrified, produce significantly fewer net emissions than traditional ground vehicles over a 10-year ownership period. The study becomes widely cited and shifts the environmental narrative in the industry's favor.",
    category: "environmental",
    demandModifier: 0.03,
    policyModifier: 2,
    manufacturingCostModifier: 0,
    perceptionModifier: 5,
    rdCostModifier: -0.10,
    regionalDemandModifiers: { WEST_COAST: 0.06 },
    typeModifiers: {},
    recallRiskBonus: 0,
    minPolicyScore: -20,
  },
  {
    id: "government_fleet_contract",
    title: "Federal Government Fleet Electrification",
    headline: "GSA Solicits Bids for 2,000-Unit Federal Flying Car Fleet",
    description:
      "The General Services Administration has issued a solicitation for up to 2,000 flying cars for federal agency fleets. The contract signals government legitimacy for the category and generates positive press coverage, lifting civilian demand alongside the procurement opportunity.",
    category: "opportunity",
    demandModifier: 0.03,
    policyModifier: 3,
    manufacturingCostModifier: 0,
    perceptionModifier: 4,
    rdCostModifier: 0,
    regionalDemandModifiers: { MIDWEST: 0.06, SOUTHEAST: 0.05 },
    typeModifiers: { SEDAN: 0.08, COMPACT: 0.06 },
    recallRiskBonus: 0,
    minPolicyScore: 10,
    preferredPolicyScore: 15,
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
  economicCondition: string,
  teamCount: number = 4
): MarketBriefing {
  const scale = Math.max(1, teamCount) / 4;
  return {
    totalFlyingCarDemand: Math.round(YEAR1_TOTAL_FLYING * scale),
    demandByType: {
      compact:   Math.round(YEAR1_DEMAND_BY_TYPE.COMPACT * scale),
      sedan:     Math.round(YEAR1_DEMAND_BY_TYPE.SEDAN * scale),
      suv:       Math.round(YEAR1_DEMAND_BY_TYPE.SUV * scale),
      sportscar: Math.round(YEAR1_DEMAND_BY_TYPE.SPORTS_CAR * scale),
      truck:     Math.round(YEAR1_DEMAND_BY_TYPE.TRUCK * scale),
    },
    publicPerception: 30,
    policyScore: 0,
    economicCondition,
    npcLobbyingNote:
      "Traditional car industry lobbies -3 policy points/year automatically.",
    generatedAt: new Date().toISOString(),
  };
}

