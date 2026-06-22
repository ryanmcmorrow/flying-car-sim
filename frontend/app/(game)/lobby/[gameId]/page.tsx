import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlayerLobbyClient } from "./PlayerLobbyClient";

interface Props {
  params: Promise<{ gameId: string }>;
}

export default async function PlayerLobbyPage({ params }: Props) {
  const { gameId } = await params;
  const session = await auth();
  if (!session) {
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
      },
    },
  });

  if (!game) {
    redirect("/login");
  }

  // Find the player's team
  let myTeam = null;
  let myRole = null;
  for (const team of game.teams) {
    const membership = team.members.find((m) => m.userId === session.user.id);
    if (membership) {
      myTeam = team;
      myRole = membership.role;
      break;
    }
  }

  if (!myTeam || !myRole) {
    // Player not in this game
    redirect("/login");
  }

  const isHost = game.facilitatorId === session.user.id;

  const gameData = {
    id: game.id,
    code: game.code,
    status: game.status as "LOBBY" | "ACTIVE" | "COMPLETED",
    currentRound: game.currentRound,
    mode: game.mode as string,
    roundDurationSeconds: game.roundDurationSeconds,
    isHost,
    settings: game.settings as Record<string, unknown>,
    allTeams: game.teams.map((t) => ({
      id: t.id,
      brandName: t.brandName,
      members: t.members.map((m) => ({ id: m.id, role: m.role as string, userName: m.user.name })),
    })),
    myTeam: {
      id: myTeam.id,
      brandName: myTeam.brandName,
      members: myTeam.members.map((m) => ({
        id: m.id,
        role: m.role as string,
        userId: m.userId,
        userName: m.user.name,
      })),
    },
    myRole: myRole as string,
    playerName: session.user.name,
  };

  return <PlayerLobbyClient gameData={gameData} />;
}
