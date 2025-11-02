
-- Add description column and update duration to integer
ALTER TABLE "online_classes" ADD COLUMN "description" text;
ALTER TABLE "online_classes" ALTER COLUMN "instructor" DROP NOT NULL;
ALTER TABLE "online_classes" ALTER COLUMN "duration" TYPE integer USING duration::integer;
