/*
  Warnings:

  - Added the required column `savedAt` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "currentPeriod" TEXT NOT NULL DEFAULT '1',
ADD COLUMN     "gameMode" TEXT NOT NULL DEFAULT '3x20',
ADD COLUMN     "penalties" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "phase" TEXT NOT NULL DEFAULT 'pregame',
ADD COLUMN     "running" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "savedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timeRemaining" DOUBLE PRECISION NOT NULL DEFAULT 1200;
