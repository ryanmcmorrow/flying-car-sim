import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Wiping all data...");
  // Delete in dependency order
  await db.rdUnlock.deleteMany();
  await db.installedBase.deleteMany();
  await db.roundResult.deleteMany();
  await db.decision.deleteMany();
  await db.round.deleteMany();
  await db.teamMember.deleteMany();
  await db.team.deleteMany();
  await db.game.deleteMany();
  await db.user.deleteMany();
  console.log("✓ All tables cleared.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => db.$disconnect());
