import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateGameCode } from "@/lib/game-utils";

// GET /api/games — list games for the authenticated facilitator
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "FACILITATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const games = await db.game.findMany({
    where: { facilitatorId: session.user.id },
    include: {
      teams: {
        include: { members: true },
      },
      rounds: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const result = games.map((g) => ({
    id: g.id,
    code: g.code,
    status: g.status,
    currentRound: g.currentRound,
    teamCount: g.teams.length,
    createdAt: g.createdAt.toISOString(),
  }));

  return NextResponse.json(result);
}

// POST /api/games — create a new game
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "FACILITATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { economicCondition?: string; mode?: string; roundDurationSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { economicCondition, mode = "CLASSROOM", roundDurationSeconds } = body;
  if (!["stable", "growth", "recession"].includes(economicCondition ?? "")) {
    return NextResponse.json(
      { error: "economicCondition must be stable | growth | recession" },
      { status: 400 }
    );
  }
  if (!["CLASSROOM", "PARTY"].includes(mode)) {
    return NextResponse.json({ error: "mode must be CLASSROOM | PARTY" }, { status: 400 });
  }
  if (mode === "PARTY" && (!roundDurationSeconds || roundDurationSeconds < 60)) {
    return NextResponse.json({ error: "PARTY mode requires roundDurationSeconds >= 60" }, { status: 400 });
  }

  // Generate unique game code (retry on collision)
  let code: string;
  let attempts = 0;
  do {
    code = generateGameCode();
    const existing = await db.game.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return NextResponse.json(
      { error: "Could not generate unique code" },
      { status: 500 }
    );
  }

  const game = await db.game.create({
    data: {
      code,
      facilitatorId: session.user.id,
      mode: mode as "CLASSROOM" | "PARTY",
      roundDurationSeconds: mode === "PARTY" ? roundDurationSeconds : null,
      settings: {
        economicCondition,
        createdAt: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({ id: game.id, code: game.code, mode: game.mode }, { status: 201 });
}
