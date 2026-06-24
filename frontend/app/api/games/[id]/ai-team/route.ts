import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AiDifficulty } from "@/lib/ai-decision";

const DIFFICULTIES: AiDifficulty[] = ["EASY", "MEDIUM", "HARD"];

// POST /api/games/[id]/ai-team — add an AI-controlled team to the game
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FACILITATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { brandName?: string; difficulty?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { brandName, difficulty } = body;
  if (!brandName || typeof brandName !== "string" || brandName.trim().length < 2 || brandName.trim().length > 30) {
    return NextResponse.json({ error: "Brand name must be 2–30 characters" }, { status: 400 });
  }
  if (!difficulty || !DIFFICULTIES.includes(difficulty as AiDifficulty)) {
    return NextResponse.json({ error: "difficulty must be EASY, MEDIUM, or HARD" }, { status: 400 });
  }

  const game = await db.game.findUnique({ where: { id }, include: { teams: true } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.facilitatorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (game.status !== "LOBBY") return NextResponse.json({ error: "Can only add AI teams during LOBBY" }, { status: 400 });

  const cleanName = brandName.trim();
  if (game.teams.some((t) => t.brandName.toLowerCase() === cleanName.toLowerCase())) {
    return NextResponse.json({ error: "Brand name already taken" }, { status: 409 });
  }

  const team = await db.team.create({
    data: { gameId: id, brandName: cleanName, aiDifficulty: difficulty },
  });

  return NextResponse.json({ teamId: team.id }, { status: 201 });
}
