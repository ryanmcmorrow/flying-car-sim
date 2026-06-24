import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/games/[id] — full game state (teams, members, rounds)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await db.game.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          members: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      rounds: {
        include: { decisions: { select: { submittedAt: true } } },
        orderBy: { roundNumber: "asc" },
        // expiresAt is a scalar — returned automatically
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Verify access: must be facilitator of this game or a member of a team in this game
  const isFacilitator =
    session.user.role === "FACILITATOR" && game.facilitatorId === session.user.id;

  const isPlayer = game.teams.some((t) =>
    t.members.some((m) => m.userId === session.user.id)
  );

  if (!isFacilitator && !isPlayer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: game.id,
    code: game.code,
    status: game.status,
    currentRound: game.currentRound,
    mode: game.mode,
    roundDurationSeconds: game.roundDurationSeconds,
    settings: game.settings,
    createdAt: game.createdAt.toISOString(),
    teams: game.teams.map((t) => ({
      id: t.id,
      brandName: t.brandName,
      cash: t.cash.toString(),
      aiDifficulty: t.aiDifficulty ?? null,
      createdAt: t.createdAt.toISOString(),
      members: t.members.map((m) => ({
        id: m.id,
        role: m.role,
        userId: m.userId,
        userName: m.user.name,
        joinedAt: m.joinedAt.toISOString(),
      })),
    })),
    rounds: game.rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      status: r.status,
      worldEvent: r.worldEvent,
      openedAt: r.openedAt?.toISOString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      submittedCount: r.decisions.filter((d) => d.submittedAt !== null).length,
    })),
  });
}
