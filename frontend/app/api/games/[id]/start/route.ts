import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { drawWorldEvent, buildYear1Briefing } from "@/lib/game-utils";

// POST /api/games/[id]/start — start a game (facilitator only)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "FACILITATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const game = await db.game.findUnique({
    where: { id },
    include: {
      teams: {
        include: { members: true },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  if (game.facilitatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (game.status !== "LOBBY") {
    return NextResponse.json(
      { error: "Game is not in LOBBY status" },
      { status: 400 }
    );
  }

  // Must have at least 1 team with a CEO
  const hasCEO = game.teams.some((t) =>
    t.members.some((m) => m.role === "CEO")
  );
  if (!hasCEO) {
    return NextResponse.json(
      { error: "AT LEAST ONE TEAM MUST HAVE A CEO ASSIGNED" },
      { status: 400 }
    );
  }

  const worldEvent = drawWorldEvent();
  const settings = game.settings as Record<string, unknown>;
  const economicCondition = (settings.economicCondition as string) ?? "stable";
  const briefing = buildYear1Briefing(economicCondition);

  // Serialize through JSON to get a plain Prisma-compatible InputJsonValue
  const worldEventJson = JSON.parse(
    JSON.stringify(worldEvent)
  ) as Prisma.InputJsonValue;
  const newSettings = JSON.parse(
    JSON.stringify({ ...settings, year1Briefing: briefing })
  ) as Prisma.InputJsonValue;

  // Create round 1 and update game atomically
  const [round] = await db.$transaction([
    db.round.create({
      data: {
        gameId: game.id,
        roundNumber: 1,
        status: "OPEN",
        worldEvent: worldEventJson,
        openedAt: new Date(),
      },
    }),
    db.game.update({
      where: { id: game.id },
      data: {
        status: "ACTIVE",
        currentRound: 1,
        settings: newSettings,
      },
    }),
  ]);

  return NextResponse.json(
    {
      success: true,
      roundId: round.id,
      worldEvent,
      briefing,
    },
    { status: 200 }
  );
}
