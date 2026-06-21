import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildYear1Briefing } from "@/lib/game-utils";
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
}

export default async function PlayPage({ params }: PageProps) {
  const { gameId } = await params;

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
      teams: { select: { id: true, brandName: true } },
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
          <p className="pixel-heading text-base mb-2">NO ACTIVE ROUND</p>
          <p className="font-[var(--font-pixel-body)] text-lg" style={{ color: "var(--px-gray)" }}>
            Waiting for facilitator to open a round.
          </p>
        </div>
      </div>
    );
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

  // Load R&D unlocks for this team
  const rdUnlockRows = await db.rdUnlock.findMany({
    where: { teamId: team.id },
    select: { unlockKey: true },
  });
  const rdUnlocks = rdUnlockRows.map((r) => r.unlockKey);

  // Competitors (other teams)
  const competitors = game.teams
    .filter((t) => t.id !== team.id)
    .map((t) => ({ teamId: t.id, brandName: t.brandName }));

  // Market briefing (round 1 only)
  const briefing =
    round.roundNumber === 1
      ? buildYear1Briefing(
          (game.settings as Record<string, string>)?.economicCondition ?? "stable"
        )
      : null;

  return (
    <DecisionRoom
      gameId={gameId}
      game={{
        id: game.id,
        code: game.code,
        currentRound: game.currentRound,
        status: game.status,
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
      competitors={competitors}
      briefing={briefing}
    />
  );
}
