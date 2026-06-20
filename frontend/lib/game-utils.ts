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

// ── World Events (Sprint 3 Stub) ─────────────────────────────────────────────

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  effect: string;
}

export const STUB_EVENTS: WorldEvent[] = [
  {
    id: "stable_launch",
    title: "Market Opens Quietly",
    description:
      "No major disruptions. Teams enter a stable environment.",
    effect: "none",
  },
  {
    id: "faa_corridors",
    title: "FAA Opens Urban Test Corridors",
    description:
      "Early airspace approvals boost market excitement.",
    effect: "demand_plus_5pct",
  },
  {
    id: "rare_earth",
    title: "Rare Earth Shortage Warning",
    description:
      "Analysts warn of potential supply chain tightening.",
    effect: "manufacturing_cost_plus_10pct",
  },
  {
    id: "boom_economy",
    title: "Boom Economy",
    description:
      "Strong consumer confidence; premium segments up.",
    effect: "demand_plus_10pct",
  },
  {
    id: "npc_fud",
    title: "Traditional Auto Lobby Doubles Down",
    description:
      "Legacy automakers run anti-flying-car campaign.",
    effect: "policy_minus_2",
  },
];

export function drawWorldEvent(): WorldEvent {
  return STUB_EVENTS[Math.floor(Math.random() * STUB_EVENTS.length)];
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
