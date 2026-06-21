import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveGameById } from "@/lib/resolve-game";

// POST /api/games/[id]/resolve — resolve the current round (FACILITATOR only)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "FACILITATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const game = await db.game.findUnique({ where: { id }, select: { facilitatorId: true } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.facilitatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await resolveGameById(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    ok: true,
    roundNumber: result.roundNumber,
    nextRound: result.nextRound,
    gameComplete: result.gameComplete,
    leaderboard: result.leaderboard,
  });
}
