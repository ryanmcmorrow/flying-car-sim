import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { VehicleSection, ManufacturingSection, ProductionSection } from "@/types/decisions";

// POST /api/play/[gameId]/submit — CEO submits the round
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  if (member.role !== "CEO") {
    return NextResponse.json(
      { error: "Only the CEO can submit decisions" },
      { status: 403 }
    );
  }

  // Find the active round
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
      { error: "No decision record found" },
      { status: 404 }
    );
  }

  if (decision.submittedAt) {
    return NextResponse.json(
      { error: "Already submitted" },
      { status: 409 }
    );
  }

  // Basic completeness validation
  const vehicleSection = decision.vehicleSection as unknown as VehicleSection;
  if (!vehicleSection?.models || vehicleSection.models.length === 0) {
    return NextResponse.json(
      { error: "CTO must design at least one vehicle model before submitting" },
      { status: 422 }
    );
  }

  const mfgSection = decision.manufacturingSection as unknown as ManufacturingSection;
  if (!mfgSection?.spaceAction) {
    return NextResponse.json(
      { error: "COO must configure manufacturing space before submitting" },
      { status: 422 }
    );
  }

  const prodSection = decision.productionSection as unknown as ProductionSection;
  if (
    !prodSection?.models ||
    prodSection.models.length === 0 ||
    !prodSection.models.every((m) => m.salePrice > 0)
  ) {
    return NextResponse.json(
      {
        error:
          "CFO must set sale prices for all vehicle models before submitting",
      },
      { status: 422 }
    );
  }

  // Lock the decision
  await db.decision.update({
    where: { id: decision.id },
    data: { submittedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
