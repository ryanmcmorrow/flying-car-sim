import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/games/lookup?code=ABCDEF — public endpoint to look up a game by code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code || code.length !== 6) {
    return NextResponse.json(
      { error: "Invalid game code" },
      { status: 400 }
    );
  }

  const game = await db.game.findUnique({
    where: { code },
    include: {
      teams: {
        include: {
          members: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "GAME NOT FOUND" }, { status: 404 });
  }

  if (game.status !== "LOBBY") {
    return NextResponse.json(
      { error: "GAME IS NOT IN LOBBY — CANNOT JOIN" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: game.id,
    code: game.code,
    status: game.status,
    teams: game.teams.map((t) => ({
      id: t.id,
      brandName: t.brandName,
      members: t.members.map((m) => ({
        role: m.role,
        userName: m.user.name,
      })),
    })),
  });
}
