
-- Add description and categories columns to online_classes
ALTER TABLE "online_classes" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "online_classes" ADD COLUMN IF NOT EXISTS "categories" text[] DEFAULT ARRAY[]::text[];
ALTER TABLE "online_classes" ALTER COLUMN "instructor" DROP NOT NULL;
ALTER TABLE "online_classes" ALTER COLUMN "duration" TYPE integer USING CASE 
  WHEN duration IS NULL THEN 0 
  WHEN duration ~ '^\d+$' THEN duration::integer
  ELSE 0
END;
