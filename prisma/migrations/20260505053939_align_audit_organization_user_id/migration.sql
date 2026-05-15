/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Audit` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[consultantId,organizationUserId,name]` on the table `Audit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationUserId` to the `Audit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Audit" DROP CONSTRAINT "Audit_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropIndex
DROP INDEX "Audit_consultantId_organizationId_name_key";

-- DropIndex
DROP INDEX "HighPriority_userId_reportId_createdAt_idx";

-- DropIndex
DROP INDEX "LowPriority_userId_reportId_createdAt_idx";

-- DropIndex
DROP INDEX "MediumPriority_userId_reportId_createdAt_idx";

-- DropIndex
DROP INDEX "MediumPriority2_userId_reportId_createdAt_idx";

-- DropIndex
DROP INDEX "Need_userId_reportId_createdAt_idx";

-- DropIndex
DROP INDEX "Opportunity_userId_reportId_createdAt_idx";

-- DropIndex
DROP INDEX "Problem_userId_reportId_createdAt_idx";

-- AlterTable
ALTER TABLE "Audit" DROP COLUMN "organizationId",
ADD COLUMN     "organizationUserId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "organizationId";

-- DropTable
DROP TABLE "Organization";

-- CreateIndex
CREATE UNIQUE INDEX "Audit_consultantId_organizationUserId_name_key" ON "Audit"("consultantId", "organizationUserId", "name");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_organizationUserId_fkey" FOREIGN KEY ("organizationUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
