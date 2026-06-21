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

  if (!isFacilitator) {
    // Find team membership
    const membership = await db.teamMember.findFirst({
      where: { userId, team: { gameId } },
      include: { team: true },
    });

    if (!membership) {
      redirect("/game");
    }

    teamId = membership.teamId;
    brandName = membership.team.brandName;
    myRole = membership.role;
  } else {
    if (game.facilitatorId !== userId) {
      redirect("/game");
    }
  }

  // Load round result
  let teamResult = null;
  let industrySnapshot = null;
  let allTeamResults: Array<{
    teamId: string;
    brandName: string;
    teamResult: unknown;
  }> = [];

  if (isFacilitator) {
    const anyResult = await db.roundResult.findFirst({
      where: { roundId: round.id },
    });
    if (anyResult) {
      industrySnapshot = anyResult.industrySnapshot;
    }

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
      brandName={brandName ?? "FACILITATOR VIEW"}
      myRole={myRole}
      isFacilitator={isFacilitator}
      teamResult={teamResult as Record<string, unknown> | null}
      industrySnapshot={industrySnapshot as Record<string, unknown>}
      allTeamResults={
        isFacilitator ? allTeamResults : undefined
      }
    />
  );
}
