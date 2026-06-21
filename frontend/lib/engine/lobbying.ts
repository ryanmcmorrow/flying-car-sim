// ── Lobbying & Policy Score ───────────────────────────────────────────────────

import {
  LOBBYING_TIER1_MAX,
  LOBBYING_TIER1_PER_PT,
  LOBBYING_TIER2_PER_PT,
  NPC_LOBBYING_DRAIN,
  ALL_ELECTRIC_POLICY_BONUS,
} from "./constants";
import type { TeamInput } from "./types";

// ── Convert lobbying spend to policy points ───────────────────────────────────

export function lobbyingSpendToPoints(spend: number): number {
  if (spend <= 0) return 0;
  if (spend <= LOBBYING_TIER1_MAX) {
    return spend / LOBBYING_TIER1_PER_PT;
  }
  // $5M → 5 pts + rest at $2M per pt
  return 5 + (spend - LOBBYING_TIER1_MAX) / LOBBYING_TIER2_PER_PT;
}

// ── Compute new policy score ──────────────────────────────────────────────────

export function computePolicyScoreUpdate(
  teams: TeamInput[],
  currentPolicyScore: number,
  perceptionPolicyBonusPending: number,
  newAllElectricTeams: string[] // team IDs that just unlocked all_electric THIS round
): { newPolicyScore: number; totalPlayerPts: number; netPolicyChange: number } {
  let totalPlayerPts = 0;

  for (const team of teams) {
    const spend = team.lobbyingSection.lobbyingSpend ?? 0;
    totalPlayerPts += lobbyingSpendToPoints(spend);
  }

  // all_electric one-time bonus
  const allElectricBonus = newAllElectricTeams.length > 0
    ? ALL_ELECTRIC_POLICY_BONUS
    : 0;

  // Perception bonus from prior round
  const perceptionBonus = perceptionPolicyBonusPending;

  const netPolicyChange =
    totalPlayerPts - NPC_LOBBYING_DRAIN + allElectricBonus + perceptionBonus;
  const newPolicyScore = Math.max(
    -20,
    Math.min(20, currentPolicyScore + netPolicyChange)
  );

  return {
    newPolicyScore,
    totalPlayerPts,
    netPolicyChange,
  };
}
