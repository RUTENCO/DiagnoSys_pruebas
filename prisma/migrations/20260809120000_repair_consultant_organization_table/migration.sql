CREATE TABLE IF NOT EXISTS "ConsultantOrganization" (
    "id" SERIAL NOT NULL,
    "consultantId" INTEGER NOT NULL,
    "linkedUserId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sector" TEXT,
    "companySize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultantOrganization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsultantOrganization_consultantId_email_key"
ON "ConsultantOrganization"("consultantId", "email");

CREATE INDEX IF NOT EXISTS "ConsultantOrganization_email_idx"
ON "ConsultantOrganization"("email");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ConsultantOrganization_consultantId_fkey'
    ) THEN
        ALTER TABLE "ConsultantOrganization"
        ADD CONSTRAINT "ConsultantOrganization_consultantId_fkey"
        FOREIGN KEY ("consultantId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ConsultantOrganization_linkedUserId_fkey'
    ) THEN
        ALTER TABLE "ConsultantOrganization"
        ADD CONSTRAINT "ConsultantOrganization_linkedUserId_fkey"
        FOREIGN KEY ("linkedUserId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

INSERT INTO "ConsultantOrganization" (
    "consultantId",
    "linkedUserId",
    "name",
    "email",
    "sector",
    "companySize",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT
    a."consultantId",
    u."id",
    u."name",
    u."email",
    u."sector",
    u."companySize",
    NOW(),
    NOW()
FROM "User" u
INNER JOIN "Audit" a
    ON a."organizationUserId" = u."id"
WHERE a."description" = 'Auto-created when organization was registered by consultant'
ON CONFLICT ("consultantId", "email") DO UPDATE
SET
    "linkedUserId" = COALESCE("ConsultantOrganization"."linkedUserId", EXCLUDED."linkedUserId"),
    "name" = CASE
        WHEN "ConsultantOrganization"."name" = '' THEN EXCLUDED."name"
        ELSE "ConsultantOrganization"."name"
    END,
    "sector" = COALESCE("ConsultantOrganization"."sector", EXCLUDED."sector"),
    "companySize" = COALESCE("ConsultantOrganization"."companySize", EXCLUDED."companySize"),
    "updatedAt" = NOW();