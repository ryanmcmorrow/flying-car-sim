import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/games/[id]/kick?teamId=... — remove a team (and all members) from the lobby
// Or DELETE /api/games/[id]/kick?memberId=... — remove a single member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await db.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (game.facilitatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (game.status !== "LOBBY") {
    return NextResponse.json({ error: "Can only kick during LOBBY" }, { status: 400 });
  }

  const teamId = req.nextUrl.searchParams.get("teamId");
  const memberId = req.nextUrl.searchParams.get("memberId");

  if (teamId) {
    // Delete entire team (cascades to members via Prisma)
    await db.team.delete({ where: { id: teamId, gameId: id } });
    return NextResponse.json({ ok: true, removed: "team", teamId });
  }

  if (memberId) {
    const member = await db.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    });
    if (!member || member.team.gameId !== id) {
      return NextResponse.json({ error: "Member not in this game" }, { status: 404 });
    }
    await db.teamMember.delete({ where: { id: memberId } });
    // Clean up empty team
    const remaining = await db.teamMember.count({ where: { teamId: member.teamId } });
    if (remaining === 0) await db.team.delete({ where: { id: member.teamId } });
    return NextResponse.json({ ok: true, removed: "member", memberId });
  }

  return NextResponse.json({ error: "Provide teamId or memberId" }, { status: 400 });
}
