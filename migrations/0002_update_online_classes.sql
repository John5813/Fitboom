
-- Add description column and update duration to integer
ALTER TABLE "online_classes" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "online_classes" ALTER COLUMN "instructor" DROP NOT NULL;
ALTER TABLE "online_classes" ALTER COLUMN "duration" TYPE integer USING CASE 
  WHEN duration IS NULL THEN 0 
  ELSE duration::integer 
END;
