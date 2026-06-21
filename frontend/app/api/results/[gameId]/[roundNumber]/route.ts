import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/results/[gameId]/[roundNumber] — fetch round results for a team/facilitator
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string; roundNumber: string }> }
) {
  const { gameId, roundNumber: roundNumberStr } = await params;
  const roundNumber = parseInt(roundNumberStr, 10);

  if (isNaN(roundNumber)) {
    return NextResponse.json({ error: "Invalid round number" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const isFacilitator = session.user.role === "FACILITATOR";

  // Load the game
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      teams: {
        include: { members: true },
      },
      rounds: { where: { roundNumber } },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const round = game.rounds[0];
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (isFacilitator && game.facilitatorId === userId) {
    // Facilitator: return all teams' industry snapshot (from any team's result)
    const anyResult = await db.roundResult.findFirst({
      where: { roundId: round.id },
    });

    if (!anyResult) {
      return NextResponse.json(
        { error: "Results not yet available" },
        { status: 404 }
      );
    }

    // Return all team leaderboard data
    const allResults = await db.roundResult.findMany({
      where: { roundId: round.id },
      include: { team: true },
    });

    // Strip private financial data from each team's result — only expose
    // what would appear in the public leaderboard per the GDD.
    const sanitizedResults = allResults.map((r: { teamId: string; team: { brandName: string }; teamResult: unknown }) => {
      const tr = (r.teamResult ?? {}) as Record<string, unknown>;
      return {
        teamId: r.teamId,
        brandName: r.team.brandName,
        revenue: (tr.revenue as Record<string, number>)?.total ?? 0,
        unitsSold: tr.unitsSoldTotal ?? 0,
        netCashChange: tr.netCashChange ?? 0,
        newCash: tr.newCash ?? "0",
        brandPerceptionEnd: tr.brandPerceptionEnd ?? 0,
        marketShareByType: tr.marketShareByType ?? {},
        recallsThisRound: (tr.modelResults as Array<Record<string, unknown>>)
          ?.filter((m) => m.recallTier !== "none")
          .map((m) => ({ vehicleType: m.vehicleType, tier: m.recallTier })) ?? [],
      };
    });

    return NextResponse.json({
      role: "FACILITATOR",
      roundNumber,
      industrySnapshot: anyResult.industrySnapshot,
      allTeamResults: sanitizedResults,
    });
  }

  // Player: find their team
  const membership = await db.teamMember.findFirst({
    where: { userId, team: { gameId } },
    include: { team: true },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this game" },
      { status: 403 }
    );
  }

  const teamId = membership.teamId;

  const result = await db.roundResult.findUnique({
    where: {
      roundId_teamId: { roundId: round.id, teamId },
    },
  });

  if (!result) {
    return NextResponse.json(
      { error: "Results not yet available" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    role: membership.role,
    teamId,
    brandName: membership.team.brandName,
    roundNumber,
    teamResult: result.teamResult,
    industrySnapshot: result.industrySnapshot,
  });
}
