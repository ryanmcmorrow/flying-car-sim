import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { MarketBriefing } from "@/lib/game-utils";
import {
  getEmptyVehicleSection,
  getEmptyRdSection,
  getEmptyManufacturingSection,
  getEmptyProductionSection,
  getEmptyMarketingSection,
  getEmptyLobbyingSection,
} from "@/lib/decision-utils";
import { Prisma } from "@/app/generated/prisma/client";
import { DecisionRoom } from "./DecisionRoom";
import type {
  VehicleSection,
  RdSection,
  ManufacturingSection,
  ProductionSection,
  MarketingSection,
  LobbyingSection,
} from "@/types/decisions";

interface PageProps {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function PlayPage({ params, searchParams }: PageProps) {
  const { gameId } = await params;
  const { from } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Find the user's team membership in this game
  const member = await db.teamMember.findFirst({
    where: { userId: session.user.id, team: { gameId } },
    include: { team: true },
  });

  if (!member) {
    redirect("/game");
  }

  const team = member.team;

  // Load the game
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: { orderBy: { roundNumber: "asc" } },
      teams: { select: { id: true, brandName: true, aiDifficulty: true } },
    },
  });

  if (!game) {
    redirect("/game");
  }

  // Find the current open round
  const round =
    game.rounds.find((r) => r.status === "OPEN") ??
    game.rounds.find((r) => r.roundNumber === game.currentRound) ??
    null;

  if (!round) {
    return (
      <div className="game-screen flex items-center justify-center min-h-screen">
        <div className="pixel-card text-center">
          <p className="pixel-heading text-base mb-2">No active round</p>
          <p className="font-[var(--font-pixel-body)] text-lg" style={{ color: "var(--px-gray)" }}>
            Waiting for facilitator to open a round.
          </p>
        </div>
      </div>
    );
  }

  // If the previous round just resolved and this team hasn't started round N yet,
  // send them to the results page so they don't skip the round report.
  // Skip this redirect when navigating here from the results page itself (?from=results),
  // otherwise the "CONTINUE TO NEXT ROUND" button creates an infinite redirect loop.
  if (round.roundNumber > 1 && from !== "results") {
    const prevRound = game.rounds.find((r) => r.roundNumber === round.roundNumber - 1);
    if (prevRound) {
      const [prevResult, existingDecision] = await Promise.all([
        db.roundResult.findFirst({ where: { roundId: prevRound.id, teamId: team.id }, select: { id: true } }),
        db.decision.findUnique({ where: { roundId_teamId: { roundId: round.id, teamId: team.id } }, select: { submittedAt: true, vehicleSection: true } }),
      ]);
      const hasStartedCurrentRound =
        existingDecision &&
        ((existingDecision.vehicleSection as { models?: unknown[] } | null)?.models?.length ?? 0) > 0;
      if (prevResult && !hasStartedCurrentRound) {
        redirect(`/results/${gameId}/${prevRound.roundNumber}`);
      }
    }
  }

  // Upsert decision record with empty defaults
  const decision = await db.decision.upsert({
    where: { roundId_teamId: { roundId: round.id, teamId: team.id } },
    create: {
      roundId: round.id,
      teamId: team.id,
      vehicleSection: getEmptyVehicleSection() as unknown as Prisma.InputJsonValue,
      rdSection: getEmptyRdSection() as unknown as Prisma.InputJsonValue,
      manufacturingSection: getEmptyManufacturingSection() as unknown as Prisma.InputJsonValue,
      productionSection: getEmptyProductionSection() as unknown as Prisma.InputJsonValue,
      marketingSection: getEmptyMarketingSection() as unknown as Prisma.InputJsonValue,
      lobbyingSection: getEmptyLobbyingSection() as unknown as Prisma.InputJsonValue,
    },
    update: {},
  });

  // Load R&D unlocks for this team (with exclusivity windows)
  const rdUnlockRows = await db.rdUnlock.findMany({
    where: { teamId: team.id },
    select: { unlockKey: true, exclusiveUntilRound: true },
  });
  const rdUnlocks = rdUnlockRows.map((r) => r.unlockKey);
  const ownedExclusives: Record<string, number> = {};
  for (const row of rdUnlockRows) {
    if (row.exclusiveUntilRound !== null && row.exclusiveUntilRound >= game.currentRound) {
      ownedExclusives[row.unlockKey] = row.exclusiveUntilRound;
    }
  }

  // Competitor active exclusivities (other teams in this game holding an exclusive window)
  const compExclusiveRows = await db.rdUnlock.findMany({
    where: {
      team: { gameId: game.id },
      teamId: { not: team.id },
      exclusiveUntilRound: { gte: game.currentRound },
    },
    select: { unlockKey: true, exclusiveUntilRound: true },
  });
  const competitorExclusives: Record<string, number> = {};
  for (const row of compExclusiveRows) {
    if (row.exclusiveUntilRound !== null) {
      competitorExclusives[row.unlockKey] = row.exclusiveUntilRound;
    }
  }

  // Competitors (other teams)
  const competitors = game.teams
    .filter((t) => t.id !== team.id)
    .map((t) => ({ teamId: t.id, brandName: t.brandName }));

  const totalFlyingDemand = (game.settings as Record<string, unknown>).totalFlyingCarDemand as number | undefined;

  // Market briefing — read from settings (written at game start, scaled by team count)
  const briefing =
    round.roundNumber === 1
      ? ((game.settings as Record<string, unknown>).year1Briefing as MarketBriefing | null) ?? null
      : null;

  // Which teams haven't submitted yet for the current round
  const roundDecisions = await db.decision.findMany({
    where: { roundId: round.id },
    select: { teamId: true, submittedAt: true },
  });
  const submittedTeamIds = new Set(roundDecisions.filter((d) => d.submittedAt).map((d) => d.teamId));
  const allTeams = game.teams.map((t) => ({
    id: t.id,
    brandName: t.brandName,
    isAi: t.aiDifficulty !== null,
    submitted: submittedTeamIds.has(t.id),
  }));

  // Inventory items from previous round (round 2+ only)
  type InventoryItem = {
    modelName: string;
    vehicleType: string;
    unitCost: number;
    salePrice: number;
    unitsLeftInInventory: number;
    fromRound: number;
  };
  let inventoryItems: InventoryItem[] | null = null;
  if (round.roundNumber > 1) {
    const prevRound = game.rounds.find((r) => r.roundNumber === round.roundNumber - 1);
    if (prevRound) {
      const prevResult = await db.roundResult.findFirst({
        where: { roundId: prevRound.id, teamId: team.id },
        select: { teamResult: true },
      });
      if (prevResult) {
        type MR = { modelName: string; vehicleType: string; unitCost: number; salePrice: number; unitsLeftInInventory: number };
        const modelResults = ((prevResult.teamResult as Record<string, unknown>)?.modelResults as MR[] | undefined) ?? [];
        const items = modelResults
          .filter((mr) => mr.unitsLeftInInventory > 0)
          .map((mr) => ({ ...mr, fromRound: prevRound.roundNumber }));
        inventoryItems = items.length > 0 ? items : [];
      }
    }
  }

  // Flying car price medians from previous round (round 2+ only)
  let flyingMedians: Record<string, number> | null = null;
  if (round.roundNumber > 1) {
    const prevRound = game.rounds.find((r) => r.roundNumber === round.roundNumber - 1);
    if (prevRound) {
      const prevDecisions = await db.decision.findMany({
        where: { roundId: prevRound.id },
        select: { vehicleSection: true, productionSection: true },
      });
      const pricesByType: Record<string, number[]> = {};
      for (const dec of prevDecisions) {
        const vs = dec.vehicleSection as { models?: { id: string; vehicleType: string }[] } | null;
        const ps = dec.productionSection as { models?: { modelId: string; salePrice: number }[] } | null;
        if (!vs?.models || !ps?.models) continue;
        for (const pm of ps.models) {
          if (!pm.salePrice) continue;
          const vm = vs.models.find((m) => m.id === pm.modelId);
          if (!vm) continue;
          (pricesByType[vm.vehicleType] ??= []).push(pm.salePrice);
        }
      }
      const medians: Record<string, number> = {};
      for (const [type, prices] of Object.entries(pricesByType)) {
        const sorted = [...prices].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medians[type] = sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : sorted[mid];
      }
      if (Object.keys(medians).length > 0) flyingMedians = medians;
    }
  }

  // Load existing owned facilities from game settings
  const rawTeamSpaces = (game.settings as Record<string, unknown>)?.teamSpaces as Record<string, unknown> | undefined;
  const rawFacilities = rawTeamSpaces?.[team.id];
  let currentFacilities: Array<{ region: string; size: string }> = [];
  if (Array.isArray(rawFacilities)) {
    currentFacilities = rawFacilities as Array<{ region: string; size: string }>;
  } else if (rawFacilities && typeof rawFacilities === "object" && (rawFacilities as { ownership?: string }).ownership === "buy") {
    currentFacilities = [{ region: "MIDWEST", size: (rawFacilities as { size: string }).size }];
  }

  const isFacilitator = session.user.role === "FACILITATOR" && game.facilitatorId === session.user.id;

  return (
    <DecisionRoom
      gameId={gameId}
      isFacilitator={isFacilitator}
      game={{
        id: game.id,
        code: game.code,
        currentRound: game.currentRound,
        status: game.status,
        mode: game.mode,
        allTeams,
      }}
      round={{
        id: round.id,
        roundNumber: round.roundNumber,
        status: round.status,
        worldEvent: round.worldEvent as { title: string; description: string } | null,
        expiresAt: round.expiresAt?.toISOString() ?? null,
      }}
      team={{
        id: team.id,
        brandName: team.brandName,
        cash: team.cash.toString(),
      }}
      myRole={member.role}
      decision={{
        id: decision.id,
        vehicleSection: decision.vehicleSection as unknown as VehicleSection,
        rdSection: decision.rdSection as unknown as RdSection,
        manufacturingSection: decision.manufacturingSection as unknown as ManufacturingSection,
        productionSection: decision.productionSection as unknown as ProductionSection,
        marketingSection: decision.marketingSection as unknown as MarketingSection,
        lobbyingSection: decision.lobbyingSection as unknown as LobbyingSection,
        submittedAt: decision.submittedAt?.toISOString() ?? null,
      }}
      rdUnlocks={rdUnlocks}
      ownedExclusives={ownedExclusives}
      competitorExclusives={competitorExclusives}
      competitors={competitors}
      briefing={briefing}
      totalFlyingDemand={totalFlyingDemand}
      flyingMedians={flyingMedians}
      inventoryItems={inventoryItems}
      currentFacilities={currentFacilities}
    />
  );
}
