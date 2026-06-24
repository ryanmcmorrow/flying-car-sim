import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAiDecision, type AiDifficulty } from "@/lib/ai-decision";
import { parseFacilities } from "@/lib/engine/financials";
import type { VehicleModel } from "@/types/decisions";

// POST /api/games/[id]/ai-fill — generate and submit decisions for all AI teams in the active round
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FACILITATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const game = await db.game.findUnique({
    where: { id },
    include: {
      teams: true,
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.facilitatorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const round = game.rounds.find((r) => r.status === "OPEN") ?? null;
  if (!round) return NextResponse.json({ error: "No open round" }, { status: 400 });

  const aiTeams = game.teams.filter((t) => t.aiDifficulty !== null);
  if (aiTeams.length === 0) return NextResponse.json({ filled: 0 });

  const teamSpaces = (game.settings as Record<string, unknown>)?.teamSpaces as
    | Record<string, unknown>
    | undefined;

  let filled = 0;

  for (const team of aiTeams) {
    const existing = await db.decision.findUnique({
      where: { roundId_teamId: { roundId: round.id, teamId: team.id } },
    });
    if (existing?.submittedAt) continue;

    const currentFacilities = parseFacilities(teamSpaces?.[team.id]);

    const rdUnlockRows = await db.rdUnlock.findMany({
      where: { teamId: team.id },
      select: { unlockKey: true },
    });
    const rdUnlocks = rdUnlockRows.map((r) => r.unlockKey);

    let previousModels: VehicleModel[] = [];
    if (round.roundNumber > 1) {
      const prevRound = game.rounds.find((r) => r.roundNumber === round.roundNumber - 1);
      if (prevRound) {
        const prevDecision = await db.decision.findUnique({
          where: { roundId_teamId: { roundId: prevRound.id, teamId: team.id } },
        });
        if (prevDecision) {
          const vs = prevDecision.vehicleSection as Record<string, unknown>;
          previousModels = (vs?.models as VehicleModel[]) ?? [];
        }
      }
    }

    const cash = parseFloat(team.cash.toString());
    const sections = generateAiDecision({
      difficulty: team.aiDifficulty as AiDifficulty,
      roundNumber: round.roundNumber,
      teamId: team.id,
      currentFacilities,
      rdUnlocks,
      cash,
      previousModels,
    });

    // Serialize to plain JSON to satisfy Prisma's InputJsonValue type
    const data = JSON.parse(JSON.stringify(sections));

    await db.decision.upsert({
      where: { roundId_teamId: { roundId: round.id, teamId: team.id } },
      update: { ...data, submittedAt: new Date() },
      create: { roundId: round.id, teamId: team.id, ...data, submittedAt: new Date() },
    });

    filled++;
  }

  return NextResponse.json({ filled });
}
