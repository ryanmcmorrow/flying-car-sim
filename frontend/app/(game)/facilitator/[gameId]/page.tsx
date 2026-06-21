import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FacilitatorLobbyClient } from "./FacilitatorLobbyClient";

interface Props {
  params: Promise<{ gameId: string }>;
}

export default async function FacilitatorGameLobbyPage({ params }: Props) {
  const { gameId } = await params;
  const session = await auth();
  if (!session || session.user.role !== "FACILITATOR") {
    redirect("/login");
  }

  const game = await db.game.findUnique({
    where: { id: gameId },
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
        orderBy: { roundNumber: "asc" },
      },
    },
  });

  if (!game || game.facilitatorId !== session.user.id) {
    redirect("/game/facilitator");
  }

  const gameData = {
    id: game.id,
    code: game.code,
    status: game.status as "LOBBY" | "ACTIVE" | "COMPLETED",
    currentRound: game.currentRound,
    settings: game.settings as Record<string, unknown>,
    teams: game.teams.map((t) => ({
      id: t.id,
      brandName: t.brandName,
      cash: t.cash.toString(),
      members: t.members.map((m) => ({
        id: m.id,
        role: m.role as string,
        userId: m.userId,
        userName: m.user.name,
      })),
    })),
    rounds: game.rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      status: r.status as string,
      worldEvent: r.worldEvent as Record<string, unknown> | null,
      openedAt: r.openedAt?.toISOString() ?? null,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      submittedCount: 0,
    })),
  };

  return <FacilitatorLobbyClient game={gameData} />;
}
