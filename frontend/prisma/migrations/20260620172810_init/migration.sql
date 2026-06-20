-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FACILITATOR', 'PLAYER');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('LOBBY', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('CEO', 'CFO', 'CMO', 'CTO', 'COO');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('COMPACT', 'SEDAN', 'SUV', 'TRUCK', 'SPORTS_CAR');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('WEST_COAST', 'NORTHEAST', 'SOUTHEAST', 'MIDWEST', 'SOUTHWEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" CHAR(6) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'LOBBY',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "facilitatorId" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "brandName" VARCHAR(30) NOT NULL,
    "cash" DECIMAL(18,2) NOT NULL DEFAULT 100000000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "worldEvent" JSONB,
    "openedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "manufacturingSection" JSONB NOT NULL DEFAULT '{}',
    "vehicleSection" JSONB NOT NULL DEFAULT '{}',
    "rdSection" JSONB NOT NULL DEFAULT '{}',
    "lobbyingSection" JSONB NOT NULL DEFAULT '{}',
    "marketingSection" JSONB NOT NULL DEFAULT '{}',
    "productionSection" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamResult" JSONB NOT NULL,
    "industrySnapshot" JSONB NOT NULL,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RdUnlock" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "unlockKey" TEXT NOT NULL,
    "unlockedInRound" INTEGER NOT NULL,
    "exclusiveUntilRound" INTEGER,

    CONSTRAINT "RdUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstalledBase" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstalledBase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_role_key" ON "TeamMember"("teamId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_gameId_roundNumber_key" ON "Round"("gameId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_roundId_teamId_key" ON "Decision"("roundId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_roundId_teamId_key" ON "RoundResult"("roundId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "RdUnlock_teamId_unlockKey_key" ON "RdUnlock"("teamId", "unlockKey");

-- CreateIndex
CREATE UNIQUE INDEX "InstalledBase_teamId_vehicleType_key" ON "InstalledBase"("teamId", "vehicleType");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RdUnlock" ADD CONSTRAINT "RdUnlock_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstalledBase" ADD CONSTRAINT "InstalledBase_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
