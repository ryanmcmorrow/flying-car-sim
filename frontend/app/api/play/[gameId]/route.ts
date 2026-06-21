import { NextRequest, NextResponse } from "next/server";
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

// GET /api/play/[gameId] — load decision page data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the user's team membership in this game
  const member = await db.teamMember.findFirst({
    where: { userId: session.user.id, team: { gameId } },
    include: { team: true },
  });

  if (!member) {
    return NextResponse.json(
      { error: "You are not a member of a team in this game" },
      { status: 403 }
    );
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
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Find the current open round
  const round =
    game.rounds.find((r) => r.status === "OPEN") ??
    game.rounds.find((r) => r.roundNumber === game.currentRound) ??
    null;

  if (!round) {
    return NextResponse.json(
      { error: "No active round found" },
      { status: 400 }
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
          (game.settings as Record<string, string>)?.economicCondition ??
            "stable"
        )
      : null;

  // Only expose public settings fields — internal demand curves and competitor
  // brand perceptions are facilitator-only data.
  const rawSettings = (game.settings ?? {}) as Record<string, unknown>;
  const publicSettings = {
    economicCondition: rawSettings.economicCondition,
    policyScore: rawSettings.policyScore,
    publicPerception: rawSettings.publicPerception,
    totalFlyingCarDemand: rawSettings.totalFlyingCarDemand,
  };

  return NextResponse.json({
    game: {
      id: game.id,
      code: game.code,
      currentRound: game.currentRound,
      status: game.status,
      settings: publicSettings,
    },
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      worldEvent: round.worldEvent,
      expiresAt: round.expiresAt?.toISOString() ?? null,
    },
    team: {
      id: team.id,
      brandName: team.brandName,
      cash: team.cash.toString(),
    },
    myRole: member.role,
    decision: {
      id: decision.id,
      vehicleSection: decision.vehicleSection,
      rdSection: decision.rdSection,
      manufacturingSection: decision.manufacturingSection,
      productionSection: decision.productionSection,
      marketingSection: decision.marketingSection,
      lobbyingSection: decision.lobbyingSection,
      submittedAt: decision.submittedAt?.toISOString() ?? null,
    },
    rdUnlocks,
    competitors,
    briefing,
  });
}
