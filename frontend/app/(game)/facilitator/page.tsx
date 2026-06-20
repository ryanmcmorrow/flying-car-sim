import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FacilitatorDashboardClient } from "./FacilitatorDashboardClient";

export default async function FacilitatorDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "FACILITATOR") {
    redirect("/login");
  }

  const games = await db.game.findMany({
    where: { facilitatorId: session.user.id },
    include: {
      teams: {
        include: { members: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const gamesData = games.map((g) => ({
    id: g.id,
    code: g.code,
    status: g.status as "LOBBY" | "ACTIVE" | "COMPLETED",
    currentRound: g.currentRound,
    teamCount: g.teams.length,
    createdAt: g.createdAt.toISOString(),
  }));

  return <FacilitatorDashboardClient games={gamesData} facilitatorName={session.user.name} />;
}
