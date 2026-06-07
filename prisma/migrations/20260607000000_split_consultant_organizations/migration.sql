-- Create separate storage for consultant-managed organizations.
CREATE TABLE "ConsultantOrganization" (
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

CREATE UNIQUE INDEX "ConsultantOrganization_consultantId_email_key" ON "ConsultantOrganization"("consultantId", "email");
CREATE INDEX "ConsultantOrganization_email_idx" ON "ConsultantOrganization"("email");

ALTER TABLE "ConsultantOrganization"
ADD CONSTRAINT "ConsultantOrganization_consultantId_fkey"
FOREIGN KEY ("consultantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultantOrganization"
ADD CONSTRAINT "ConsultantOrganization_linkedUserId_fkey"
FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill legacy consultant-created organizations from the existing User table.
-- Keep the original organization data accessible, but move the consultant-managed
-- directory entry out of the login namespace by archiving the legacy email.
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
ON CONFLICT ("consultantId", "email") DO NOTHING;

UPDATE "User" u
SET "email" = CONCAT('legacy-org-', u."id", '@archived.local')
WHERE EXISTS (
    SELECT 1
    FROM "Audit" a
    WHERE a."organizationUserId" = u."id"
      AND a."description" = 'Auto-created when organization was registered by consultant'
)
AND u."email" NOT LIKE 'legacy-org-%@archived.local';
