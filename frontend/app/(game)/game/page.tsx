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
    redirect("/facilitator");
  }

  // Player: find their active team/game and redirect to lobby
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
