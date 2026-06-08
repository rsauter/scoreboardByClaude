-- Add dedicated scheduling timestamp for planned matches.
ALTER TABLE "Match" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- Backfill existing rows from the old planning timestamp column.
UPDATE "Match" SET "scheduledAt" = "playedAt" WHERE "scheduledAt" IS NULL;

ALTER TABLE "Match" ALTER COLUMN "scheduledAt" SET NOT NULL;
ALTER TABLE "Match" ALTER COLUMN "scheduledAt" SET DEFAULT CURRENT_TIMESTAMP;
