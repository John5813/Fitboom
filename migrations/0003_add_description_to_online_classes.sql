
-- Add description and categories columns to online_classes
ALTER TABLE "online_classes" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "online_classes" ADD COLUMN IF NOT EXISTS "categories" text[] DEFAULT ARRAY[]::text[];
