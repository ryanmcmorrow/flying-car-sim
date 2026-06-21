import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { resolveRound } from "@/lib/engine/resolve-round";
import { drawWorldEvent } from "@/lib/game-utils";
import type { ResolveRoundInput, TeamInput } from "@/lib/engine/types";
import type {
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
} from "@/types/decisions";
import type { VehicleType, Region } from "@/lib/engine/constants";
import {
  getEmptyVehicleSection,
  getEmptyRdSection,
  getEmptyManufacturingSection,
  getEmptyProductionSection,
  getEmptyMarketingSection,
  getEmptyLobbyingSection,
} from "@/lib/decision-utils";
import {
  YEAR1_TOTAL_FLYING,
  YEAR1_TOTAL_TRADITIONAL,
  YEAR1_DEMAND_BY_TYPE_BY_REGION,
} from "@/lib/engine/constants";

export type ResolveResult =
  | { ok: true; roundNumber: number; nextRound: number | null; gameComplete: boolean; leaderboard: unknown[] }
  | { ok: false; error: string; status: number };

export async function resolveGameById(gameId: string): Promise<ResolveResult> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      teams: {
        include: {
          members: true,
          decisions: true,
          rdUnlocks: true,
          installedBases: true,
          roundResults: {
            orderBy: { round: { roundNumber: "desc" } },
            take: 1,
            include: { round: true },
          },
        },
      },
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });

  if (!game) return { ok: false, error: "Game not found", status: 404 };
  if (game.status !== "ACTIVE") return { ok: false, error: "Game is not ACTIVE", status: 400 };

  const currentRound = game.rounds.find((r) => r.roundNumber === game.currentRound);
  if (!currentRound) return { ok: false, error: "No open round", status: 400 };
  if (currentRound.status === "RESOLVED") return { ok: false, error: "Round already resolved", status: 400 };

  const roundNumber = currentRound.roundNumber;
  const settings = (game.settings ?? {}) as Record<string, unknown>;

  const priorFlyingDemand = (settings.totalFlyingCarDemand as number) ?? YEAR1_TOTAL_FLYING;
  const priorTraditionalDemand = (settings.totalTraditionalDemand as number) ?? YEAR1_TOTAL_TRADITIONAL;
  const policyScore = (settings.policyScore as number) ?? 0;
  const publicPerception = (settings.publicPerception as number) ?? 30;
  const teamBrandPerceptions = (settings.teamBrandPerceptions as Record<string, number>) ?? {};
  const teamSpaces = (settings.teamSpaces as Record<string, { size: string; ownership: string } | null>) ?? {};
  const perceptionPolicyBonusPending = (settings.perceptionPolicyBonusPending as number) ?? 0;
  const priorDemandByTypeByRegion =
    (settings.demandByTypeByRegion as Record<VehicleType, Record<Region, number>>) ??
    YEAR1_DEMAND_BY_TYPE_BY_REGION;

  const rawWorldEvent = currentRound.worldEvent as Record<string, unknown>;
  const worldEvent = {
    id: (rawWorldEvent?.id as string) ?? "stable",
    title: (rawWorldEvent?.title as string) ?? "Stable Market",
    headline: (rawWorldEvent?.headline as string) ?? "MARKET STABLE",
    description: (rawWorldEvent?.description as string) ?? "No major events.",
    category: (rawWorldEvent?.category as string) ?? "economic",
    demandModifier: (rawWorldEvent?.demandModifier as number) ?? 0,
    policyModifier: (rawWorldEvent?.policyModifier as number) ?? 0,
    manufacturingCostModifier: (rawWorldEvent?.manufacturingCostModifier as number) ?? 0,
    perceptionModifier: (rawWorldEvent?.perceptionModifier as number) ?? 0,
    rdCostModifier: (rawWorldEvent?.rdCostModifier as number) ?? 0,
    regionalDemandModifiers: (rawWorldEvent?.regionalDemandModifiers as Record<string, number>) ?? {},
    typeModifiers: (rawWorldEvent?.typeModifiers as Record<string, number>) ?? {},
    recallRiskBonus: (rawWorldEvent?.recallRiskBonus as number) ?? 0,
    minPolicyScore: (rawWorldEvent?.minPolicyScore as number) ?? -20,
  };

  const teamInputs: TeamInput[] = [];

  for (const team of game.teams) {
    const decision = team.decisions.find((d) => d.roundId === currentRound.id);

    const vehicleSection = decision?.vehicleSection
      ? (decision.vehicleSection as unknown as VehicleSection)
      : getEmptyVehicleSection();
    const rdSection = decision?.rdSection
      ? (decision.rdSection as unknown as RdSection)
      : getEmptyRdSection();
    const manufacturingSection = decision?.manufacturingSection
      ? (decision.manufacturingSection as unknown as ManufacturingSection)
      : getEmptyManufacturingSection();
    const productionSection = decision?.productionSection
      ? (decision.productionSection as unknown as ProductionSection)
      : getEmptyProductionSection();
    const marketingSection = decision?.marketingSection
      ? (decision.marketingSection as unknown as MarketingSection)
      : getEmptyMarketingSection();
    const lobbyingSection = decision?.lobbyingSection
      ? (decision.lobbyingSection as unknown as LobbyingSection)
      : getEmptyLobbyingSection();

    const existingRdUnlocks = team.rdUnlocks.map((u) => u.unlockKey);

    const installedBase: Record<VehicleType, number> = {
      COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0,
    };
    for (const ib of team.installedBases) {
      installedBase[ib.vehicleType as VehicleType] = ib.units;
    }

    const priorInventory: Record<VehicleType, number> = {
      COMPACT: 0, SEDAN: 0, SUV: 0, TRUCK: 0, SPORTS_CAR: 0,
    };
    if (team.roundResults.length > 0 && roundNumber > 1) {
      const lastResult = team.roundResults[0];
      if (lastResult.round.roundNumber === roundNumber - 1) {
        const tr = lastResult.teamResult as Record<string, unknown>;
        const modelResults = tr.modelResults as Array<{ vehicleType: string; unitsLeftInInventory: number }>;
        if (Array.isArray(modelResults)) {
          for (const mr of modelResults) {
            const vt = mr.vehicleType as VehicleType;
            priorInventory[vt] = (priorInventory[vt] ?? 0) + (mr.unitsLeftInInventory ?? 0);
          }
        }
      }
    }

    const currentSpaceData = teamSpaces[team.id];
    const currentSpace =
      currentSpaceData?.ownership === "buy"
        ? { size: currentSpaceData.size as "small" | "medium" | "large", ownership: "buy" as const }
        : null;

    teamInputs.push({
      teamId: team.id,
      brandName: team.brandName,
      cash: team.cash.toString(),
      vehicleSection,
      rdSection,
      manufacturingSection,
      productionSection,
      marketingSection,
      lobbyingSection,
      existingRdUnlocks,
      installedBase,
      priorInventory,
      currentSpace,
    });
  }

  const resolveInput: ResolveRoundInput = {
    roundNumber,
    gameId: game.id,
    teams: teamInputs,
    worldEvent,
    priorFlyingDemand,
    priorTraditionalDemand,
    priorDemandByTypeByRegion,
    policyScore,
    publicPerception,
    teamBrandPerceptions,
    teamSpaces,
    perceptionPolicyBonusPending,
  };

  const output = resolveRound(resolveInput);

  const isLastRound = roundNumber >= 8;
  let nextWorldEvent: Record<string, unknown> | null = null;
  if (!isLastRound) {
    const steeringTeams = teamInputs
      .filter((t) => t.lobbyingSection.steeringCategory)
      .map((t) => ({ category: t.lobbyingSection.steeringCategory!, spend: t.lobbyingSection.lobbyingSpend ?? 0 }));
    const nextEvent = drawWorldEvent(output.nextRoundSettings.policyScore, steeringTeams);
    nextWorldEvent = structuredClone(nextEvent) as unknown as Record<string, unknown>;
  }

  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [];

  for (const team of game.teams) {
    const teamResult = output.teamResults[team.id];
    const industrySnapshot = output.industrySnapshot;
    if (teamResult) {
      ops.push(
        db.roundResult.upsert({
          where: { roundId_teamId: { roundId: currentRound.id, teamId: team.id } },
          create: {
            roundId: currentRound.id,
            teamId: team.id,
            teamResult: structuredClone(teamResult) as unknown as Prisma.InputJsonValue,
            industrySnapshot: structuredClone(industrySnapshot) as unknown as Prisma.InputJsonValue,
          },
          update: {
            teamResult: structuredClone(teamResult) as unknown as Prisma.InputJsonValue,
            industrySnapshot: structuredClone(industrySnapshot) as unknown as Prisma.InputJsonValue,
          },
        })
      );
    }
    const newCash = output.newCashByTeam[team.id];
    if (newCash !== undefined) {
      ops.push(db.team.update({ where: { id: team.id }, data: { cash: newCash } }));
    }
  }

  for (const update of output.installedBaseUpdates) {
    ops.push(
      db.installedBase.upsert({
        where: { teamId_vehicleType: { teamId: update.teamId, vehicleType: update.vehicleType } },
        create: { teamId: update.teamId, vehicleType: update.vehicleType, units: update.unitsToAdd },
        update: { units: { increment: update.unitsToAdd } },
      })
    );
  }

  for (const unlock of output.newRdUnlocks) {
    ops.push(
      db.rdUnlock.upsert({
        where: { teamId_unlockKey: { teamId: unlock.teamId, unlockKey: unlock.unlockKey } },
        create: {
          teamId: unlock.teamId,
          unlockKey: unlock.unlockKey,
          unlockedInRound: unlock.unlockedInRound,
          exclusiveUntilRound: unlock.exclusiveUntilRound ?? undefined,
        },
        update: {},
      })
    );
  }

  ops.push(db.round.update({ where: { id: currentRound.id }, data: { status: "RESOLVED", resolvedAt: now } }));

  const newSettings = structuredClone({ ...settings, ...output.nextRoundSettings }) as Prisma.InputJsonValue;

  if (!isLastRound) {
    ops.push(db.game.update({ where: { id: game.id }, data: { currentRound: roundNumber + 1, settings: newSettings } }));
  } else {
    ops.push(db.game.update({ where: { id: game.id }, data: { status: "COMPLETED", settings: newSettings } }));
  }

  await db.$transaction(ops);

  if (!isLastRound) {
    const nextRound = await db.round.create({
      data: {
        gameId: game.id,
        roundNumber: roundNumber + 1,
        status: "OPEN",
        worldEvent: nextWorldEvent as Prisma.InputJsonValue,
        openedAt: now,
        // Party mode: set expiry on the new round
        ...(game.roundDurationSeconds
          ? { expiresAt: new Date(now.getTime() + game.roundDurationSeconds * 1000) }
          : {}),
      },
    });
    await db.decision.createMany({
      data: game.teams.map((team) => ({ roundId: nextRound.id, teamId: team.id })),
      skipDuplicates: true,
    });
  }

  return {
    ok: true,
    roundNumber,
    nextRound: isLastRound ? null : roundNumber + 1,
    gameComplete: isLastRound,
    leaderboard: output.industrySnapshot.leaderboard,
  };
}
