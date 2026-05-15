-- Add optional profile fields for user settings in Edit Profile
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "sector" TEXT,
ADD COLUMN IF NOT EXISTS "companySize" TEXT;
