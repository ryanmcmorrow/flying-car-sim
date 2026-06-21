import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// /game — redirect to appropriate page based on role
export default async function GameIndexPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "FACILITATOR") {
    // Party host: if they have a team membership in an active PARTY game, go play
    const hostMembership = await db.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: { game: { mode: "PARTY", status: { in: ["LOBBY", "ACTIVE"] } } },
      },
      include: { team: true },
      orderBy: { joinedAt: "desc" },
    });
    if (hostMembership) {
      const gameStatus = await db.game.findUnique({
        where: { id: hostMembership.team.gameId },
        select: { status: true },
      });
      redirect(gameStatus?.status === "ACTIVE" ? `/play/${hostMembership.team.gameId}` : `/lobby/${hostMembership.team.gameId}`);
    }
    redirect("/facilitator");
  }

  // Player: find their active team/game and redirect to lobby or play
  const membership = await db.teamMember.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
    orderBy: { joinedAt: "desc" },
  });

  if (membership) {
    redirect(`/lobby/${membership.team.gameId}`);
  }

  // No game found — redirect to join
  redirect("/join");
}
