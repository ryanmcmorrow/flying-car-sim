import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import type { SectionKey } from "@/types/decisions";
import type { TeamMemberRole } from "@/app/generated/prisma/client";

// Role → allowed sections mapping
const ROLE_SECTIONS: Record<TeamMemberRole, SectionKey[]> = {
  CTO: ["vehicleSection", "rdSection"],
  CFO: ["productionSection"],
  CMO: ["marketingSection"],
  COO: ["manufacturingSection"],
  CEO: ["lobbyingSection"],
};

const ALL_SECTIONS: SectionKey[] = [
  "vehicleSection",
  "rdSection",
  "manufacturingSection",
  "productionSection",
  "marketingSection",
  "lobbyingSection",
];

// PATCH /api/play/[gameId]/decision — save a section
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { section: SectionKey; data: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { section, data } = body;

  if (!section || !ALL_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  // Find the user's team membership
  const member = await db.teamMember.findFirst({
    where: { userId: session.user.id, team: { gameId } },
    include: { team: true },
  });

  if (!member) {
    return NextResponse.json(
      { error: "Not a member of this game" },
      { status: 403 }
    );
  }

  // Check role can edit this section
  // CEO can always edit any section (small team rule)
  const allowedSections =
    member.role === "CEO" ? ALL_SECTIONS : ROLE_SECTIONS[member.role] ?? [];

  if (!allowedSections.includes(section)) {
    return NextResponse.json(
      { error: `Your role (${member.role}) cannot edit ${section}` },
      { status: 403 }
    );
  }

  // Find the current active round
  const game = await db.game.findUnique({
    where: { id: gameId },
    include: { rounds: { orderBy: { roundNumber: "asc" } } },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const round =
    game.rounds.find((r) => r.status === "OPEN") ??
    game.rounds.find((r) => r.roundNumber === game.currentRound) ??
    null;

  if (!round) {
    return NextResponse.json({ error: "No active round" }, { status: 400 });
  }

  // Find decision
  const decision = await db.decision.findUnique({
    where: {
      roundId_teamId: { roundId: round.id, teamId: member.teamId },
    },
  });

  if (!decision) {
    return NextResponse.json(
      { error: "Decision record not found" },
      { status: 404 }
    );
  }

  if (decision.submittedAt) {
    return NextResponse.json(
      { error: "Decision already submitted" },
      { status: 409 }
    );
  }

  // Update the section
  await db.decision.update({
    where: { id: decision.id },
    data: { [section]: data as Prisma.InputJsonValue },
  });

  return NextResponse.json({
    ok: true,
    savedAt: new Date().toISOString(),
  });
}
