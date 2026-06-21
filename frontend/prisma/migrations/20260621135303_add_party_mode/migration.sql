-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('CLASSROOM', 'PARTY');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "mode" "GameMode" NOT NULL DEFAULT 'CLASSROOM',
ADD COLUMN     "roundDurationSeconds" INTEGER;

-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "expiresAt" TIMESTAMP(3);
