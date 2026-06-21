import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALL_ROLES } from "@/lib/game-utils";
import type { TeamMemberRole } from "@/app/generated/prisma/client";

// POST /api/games/[id]/host-join — facilitator joins their own PARTY game as a player
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "FACILITATOR") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { brandName?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { brandName, role } = body;
  if (!brandName || typeof brandName !== "string" || brandName.trim().length < 2 || brandName.trim().length > 30) {
    return NextResponse.json({ error: "Brand name must be 2–30 characters" }, { status: 400 });
  }
  if (!role || !ALL_ROLES.includes(role as TeamMemberRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const game = await db.game.findUnique({
    where: { id },
    include: { teams: { include: { members: true } } },
  });

  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.facilitatorId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (game.mode !== "PARTY") return NextResponse.json({ error: "Only PARTY games support host-join" }, { status: 400 });
  if (game.status !== "LOBBY") return NextResponse.json({ error: "Game is not in LOBBY" }, { status: 400 });

  const cleanBrand = brandName.trim();
  const chosenRole = role as TeamMemberRole;

  // Check if host is already a member
  const alreadyMember = game.teams.some((t) => t.members.some((m) => m.userId === session.user.id));
  if (alreadyMember) return NextResponse.json({ error: "Already joined" }, { status: 409 });

  // Find or create team
  let team = game.teams.find((t) => t.brandName.toLowerCase() === cleanBrand.toLowerCase());
  if (team) {
    const roleTaken = team.members.some((m) => m.role === chosenRole);
    if (roleTaken) return NextResponse.json({ error: `Role ${chosenRole} is already taken` }, { status: 400 });
  } else {
    team = await db.team.create({
      data: { gameId: game.id, brandName: cleanBrand },
      include: { members: true },
    });
  }

  await db.teamMember.create({
    data: { teamId: team.id, userId: session.user.id, role: chosenRole },
  });

  return NextResponse.json({ teamId: team.id, gameId: game.id, redirectTo: `/lobby/${game.id}` }, { status: 201 });
}
