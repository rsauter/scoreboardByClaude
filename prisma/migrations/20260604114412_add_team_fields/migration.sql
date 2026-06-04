-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "abbreviation" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#00d4ff',
ADD COLUMN     "organization" TEXT NOT NULL DEFAULT '';
