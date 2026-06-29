// Self-check for Competitor Research payoff: intel is attached only to
// teams that paid + named a target, and points at the right rival.
//
// Run: npx tsx lib/engine/__tests__/research-intel.test.ts

import assert from "node:assert";
import { resolveRound } from "../resolve-round";
import { YEAR1_TOTAL_FLYING, YEAR1_TOTAL_TRADITIONAL, YEAR1_DEMAND_BY_TYPE_BY_REGION } from "../constants";
import {
  getEmptyVehicleSection, getEmptyRdSection, getEmptyManufacturingSection,
  getEmptyProductionSection, getEmptyMarketingSection, getEmptyLobbyingSection,
} from "../../decision-utils";
import type { TeamInput, WorldEventInput } from "../types";

const stableEvent: WorldEventInput = {
  id: "stable", title: "Stable", headline: "Stable", description: "", category: "economic",
  demandModifier: 0, policyModifier: 0, manufacturingCostModifier: 0, perceptionModifier: 0,
  rdCostModifier: 0, regionalDemandModifiers: {}, typeModifiers: {}, recallRiskBonus: 0,
};

function team(id: string, brand: string): TeamInput {
  return {
    teamId: id, brandName: brand, cash: "100000000",
    vehicleSection: getEmptyVehicleSection(), rdSection: getEmptyRdSection(),
    manufacturingSection: getEmptyManufacturingSection(), productionSection: getEmptyProductionSection(),
    marketingSection: getEmptyMarketingSection(), lobbyingSection: getEmptyLobbyingSection(),
    installedBase: { COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0 },
    existingRdUnlocks: [],
    priorInventory: { COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0 },
    currentFacilities: [],
  };
}

const alpha = team("A", "Alpha");
const beta = team("B", "Beta");

// Alpha buys competitor research targeting Beta.
alpha.rdSection.recurring.competitorResearch = true;
alpha.rdSection.recurringTargets = { competitorResearch: "B" };

const out = resolveRound({
  roundNumber: 1, gameId: "g", teams: [alpha, beta], worldEvent: stableEvent,
  priorFlyingDemand: YEAR1_TOTAL_FLYING, priorTraditionalDemand: YEAR1_TOTAL_TRADITIONAL,
  priorDemandByTypeByRegion: YEAR1_DEMAND_BY_TYPE_BY_REGION,
  policyScore: 0, publicPerception: 30, teamBrandPerceptions: {}, teamSpaces: {},
  perceptionPolicyBonusPending: 0,
});

const a = out.teamResults["A"].decisions;
const b = out.teamResults["B"].decisions;

// Alpha paid → gets intel pointed at the right rival.
assert(a.competitorIntel, "Alpha should have competitor intel");
assert.equal(a.competitorIntel!.brandName, "Beta", "intel names the tracked rival");
assert.equal(typeof a.competitorIntel!.marketShare, "number");

// Beta paid for nothing → no intel leaks to it.
assert.equal(b.competitorIntel, undefined, "unpaid team gets no competitor intel");

console.log("research-intel self-check: OK");
