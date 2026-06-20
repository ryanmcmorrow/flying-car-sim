import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const db = new PrismaClient({ adapter });

async function main() {
  // ── Facilitator account ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const facilitator = await db.user.upsert({
    where: { email: "facilitator@example.com" },
    update: {},
    create: {
      email: "facilitator@example.com",
      passwordHash,
      name: "Game Facilitator",
      role: "FACILITATOR",
    },
  });
  console.log(`✓ Facilitator: ${facilitator.email} (id: ${facilitator.id})`);

  // ── Sample game ───────────────────────────────────────────────────────────
  const game = await db.game.upsert({
    where: { code: "DEMO01" },
    update: {},
    create: {
      code: "DEMO01",
      status: "LOBBY",
      currentRound: 1,
      facilitatorId: facilitator.id,
      settings: {},
    },
  });
  console.log(`✓ Game: code=${game.code} (id: ${game.id})`);

  // ── Sample teams ──────────────────────────────────────────────────────────
  const teamNames = ["AeroVenture", "SkyForge"];

  for (const brandName of teamNames) {
    const existing = await db.team.findFirst({
      where: { gameId: game.id, brandName },
    });

    if (existing) {
      console.log(`- Team "${brandName}" already exists (id: ${existing.id}), skipping.`);
    } else {
      const team = await db.team.create({
        data: {
          gameId: game.id,
          brandName,
          cash: 100000000,
        },
      });
      console.log(`✓ Team: "${team.brandName}" (id: ${team.id})`);
    }
  }

  console.log("\nSeed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
