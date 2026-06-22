import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FinalStandings, type TeamSummary } from "./FinalStandings";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Shapes we read out of the stored JSON blobs
type StoredTeamResult = {
  newCash?: string;
  priorCash?: string;
  netCashChange?: number;
  brandPerceptionEnd?: number;
  revenue?: { total?: number };
  modelResults?: Array<{ unitsSold?: number }>;
};
type StoredSnapshot = {
  leaderboard?: Array<{ teamId: string; marketShare: number }>;
};

export default async function FinalResultsPage({ params }: PageProps) {
  const { gameId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const isFacilitator = session.user.role === "FACILITATOR";

  const game = await db.game.findUnique({
    where: { id: gameId },
    include: { teams: true },
  });
  if (!game) redirect("/game");

  let myTeamId: string | null = null;
  if (!isFacilitator) {
    const membership = await db.teamMember.findFirst({
      where: { userId, team: { gameId } },
    });
    if (!membership) redirect("/game");
    myTeamId = membership.teamId;
  } else if (game.facilitatorId !== userId) {
    redirect("/game");
  }

  // All resolved round results for the game, with their round number.
  const results = await db.roundResult.findMany({
    where: { round: { gameId } },
    include: { round: { select: { roundNumber: true } } },
  });

  if (results.length === 0) {
    // Nothing resolved yet — send them back to the play screen.
    redirect(isFacilitator ? `/facilitator/${gameId}` : `/play/${gameId}`);
  }

  const roundNumbers = [...new Set(results.map((r) => r.round.roundNumber))].sort(
    (a, b) => a - b
  );
  const latestRound = roundNumbers[roundNumbers.length - 1];

  // Group results by team
  const byTeam = new Map<string, typeof results>();
  for (const r of results) {
    const list = byTeam.get(r.teamId) ?? [];
    list.push(r);
    byTeam.set(r.teamId, list);
  }

  const teams: TeamSummary[] = game.teams.map((team) => {
    const rows = (byTeam.get(team.id) ?? []).sort(
      (a, b) => a.round.roundNumber - b.round.roundNumber
    );

    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let totalNetProfit = 0;
    let finalBrandPerception = 0;
    let finalMarketShare = 0;
    let bestYear = { round: 0, profit: -Infinity };

    // Trajectory: starting cash, then each round's ending cash.
    const cashByRound: number[] = [];
    const firstRow = rows[0]?.teamResult as StoredTeamResult | undefined;
    const startCash = firstRow?.priorCash
      ? parseFloat(firstRow.priorCash)
      : Number(team.cash);
    cashByRound.push(startCash);

    for (const row of rows) {
      const tr = row.teamResult as StoredTeamResult;
      const rn = row.round.roundNumber;

      cashByRound.push(tr.newCash ? parseFloat(tr.newCash) : cashByRound[cashByRound.length - 1]);

      totalRevenue += tr.revenue?.total ?? 0;
      const net = tr.netCashChange ?? 0;
      totalNetProfit += net;
      for (const m of tr.modelResults ?? []) totalUnitsSold += m.unitsSold ?? 0;
      if (net > bestYear.profit) bestYear = { round: rn, profit: net };

      // Latest-round values win (rows are sorted ascending)
      finalBrandPerception = tr.brandPerceptionEnd ?? finalBrandPerception;

      const snap = row.industrySnapshot as StoredSnapshot;
      const entry = snap.leaderboard?.find((e) => e.teamId === team.id);
      if (entry) finalMarketShare = entry.marketShare;
    }

    return {
      teamId: team.id,
      brandName: team.brandName,
      finalCash: Number(team.cash),
      startCash,
      cashByRound,
      totalUnitsSold,
      totalRevenue,
      totalNetProfit,
      finalBrandPerception,
      finalMarketShare,
      bestYear: bestYear.profit === -Infinity ? { round: 0, profit: 0 } : bestYear,
    };
  });

  // Rank by final cash (the authoritative end-of-game value).
  teams.sort((a, b) => b.finalCash - a.finalCash);

  return (
    <FinalStandings
      gameId={gameId}
      teams={teams}
      roundNumbers={roundNumbers}
      latestRound={latestRound}
      isCompleted={game.status === "COMPLETED"}
      isFacilitator={isFacilitator}
      myTeamId={myTeamId}
    />
  );
}
