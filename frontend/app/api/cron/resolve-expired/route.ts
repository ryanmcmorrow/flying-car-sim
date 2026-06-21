import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveGameById } from "@/lib/resolve-game";

// GET /api/cron/resolve-expired — called by Vercel Cron every minute
// Resolves any PARTY mode rounds whose expiresAt has passed.
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all PARTY games with an OPEN round that has expired
  const expiredRounds = await db.round.findMany({
    where: {
      status: "OPEN",
      expiresAt: { lte: now },
      game: { mode: "PARTY", status: "ACTIVE" },
    },
    select: { gameId: true },
  });

  const gameIds = [...new Set(expiredRounds.map((r) => r.gameId))];

  const results = await Promise.allSettled(gameIds.map((id) => resolveGameById(id)));

  const resolved: string[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.ok) resolved.push(gameIds[i]);
    else failed.push(gameIds[i]);
  });

  console.log(`[cron/resolve-expired] resolved: ${resolved.length}, failed: ${failed.length}`);
  return NextResponse.json({ resolved, failed });
}
