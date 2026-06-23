import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RoundReport } from "./RoundReport";

interface PageProps {
  params: Promise<{ gameId: string; roundNumber: string }>;
}

export default async function ResultsPage({ params }: PageProps) {
  const { gameId, roundNumber: roundNumberStr } = await params;
  const roundNumber = parseInt(roundNumberStr, 10);

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const isFacilitator = session.user.role === "FACILITATOR";

  // Load game
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: { where: { roundNumber } },
      teams: {
        include: { members: true },
      },
    },
  });

  if (!game) {
    redirect("/game");
  }

  const round = game.rounds[0];
  if (!round) {
    redirect(`/play/${gameId}`);
  }

  let teamId: string | null = null;
  let brandName: string | null = null;
  let myRole: string | null = null;
  let rdUnlocks: string[] = [];

  // A facilitator who has joined as a player sees the player view — no unfair advantage.
  const playerMembership = await db.teamMember.findFirst({
    where: { userId, team: { gameId } },
    include: { team: true },
  });
  const isPlayingFacilitator = isFacilitator && playerMembership !== null;
  const showFacilitatorView = isFacilitator && !isPlayingFacilitator;

  if (!isFacilitator && !playerMembership) {
    redirect("/game");
  }

  if (isFacilitator && !playerMembership && game.facilitatorId !== userId) {
    redirect("/game");
  }

  if (playerMembership) {
    teamId = playerMembership.teamId;
    brandName = playerMembership.team.brandName;
    myRole = playerMembership.role;
    const unlockRows = await db.rdUnlock.findMany({ where: { teamId }, select: { unlockKey: true } });
    rdUnlocks = unlockRows.map((r) => r.unlockKey);
  }

  // Load round result
  let teamResult = null;
  let industrySnapshot = null;
  let allTeamResults: Array<{
    teamId: string;
    brandName: string;
    teamResult: unknown;
  }> = [];

  if (showFacilitatorView) {
    const anyResult = await db.roundResult.findFirst({ where: { roundId: round.id } });
    if (anyResult) industrySnapshot = anyResult.industrySnapshot;

    const allResults = await db.roundResult.findMany({
      where: { roundId: round.id },
      include: { team: true },
    });
    allTeamResults = allResults.map((r: { teamId: string; team: { brandName: string }; teamResult: unknown }) => ({
      teamId: r.teamId,
      brandName: r.team.brandName,
      teamResult: r.teamResult,
    }));
  } else if (teamId) {
    const result = await db.roundResult.findUnique({
      where: { roundId_teamId: { roundId: round.id, teamId } },
    });
    if (result) {
      teamResult = result.teamResult;
      industrySnapshot = result.industrySnapshot;
    }
  }

  if (!industrySnapshot) {
    // Results not ready yet
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          className="text-center"
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          <p className="text-yellow-400 text-xs mb-4">
            RESULTS NOT YET AVAILABLE
          </p>
          <p className="text-gray-400 text-xs">
            Waiting for facilitator to resolve round {roundNumber}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoundReport
      gameId={gameId}
      roundNumber={roundNumber}
      totalRounds={8}
      latestRound={game.currentRound}
      brandName={brandName ?? "FACILITATOR VIEW"}
      myRole={myRole}
      isFacilitator={showFacilitatorView}
      teamResult={teamResult as Record<string, unknown> | null}
      industrySnapshot={industrySnapshot as Record<string, unknown>}
      allTeamResults={showFacilitatorView ? allTeamResults : undefined}
      rdUnlocks={rdUnlocks}
    />
  );
}
