-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "reportId" INTEGER;
ALTER TABLE "Need" ADD COLUMN "reportId" INTEGER;
ALTER TABLE "Problem" ADD COLUMN "reportId" INTEGER;
ALTER TABLE "HighPriority" ADD COLUMN "reportId" INTEGER;
ALTER TABLE "MediumPriority" ADD COLUMN "reportId" INTEGER;
ALTER TABLE "LowPriority" ADD COLUMN "reportId" INTEGER;
ALTER TABLE "MediumPriority2" ADD COLUMN "reportId" INTEGER;

-- CreateIndex
CREATE INDEX "Opportunity_userId_reportId_createdAt_idx" ON "Opportunity"("userId", "reportId", "createdAt");
CREATE INDEX "Need_userId_reportId_createdAt_idx" ON "Need"("userId", "reportId", "createdAt");
CREATE INDEX "Problem_userId_reportId_createdAt_idx" ON "Problem"("userId", "reportId", "createdAt");
CREATE INDEX "HighPriority_userId_reportId_createdAt_idx" ON "HighPriority"("userId", "reportId", "createdAt");
CREATE INDEX "MediumPriority_userId_reportId_createdAt_idx" ON "MediumPriority"("userId", "reportId", "createdAt");
CREATE INDEX "LowPriority_userId_reportId_createdAt_idx" ON "LowPriority"("userId", "reportId", "createdAt");
CREATE INDEX "MediumPriority2_userId_reportId_createdAt_idx" ON "MediumPriority2"("userId", "reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Need" ADD CONSTRAINT "Need_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HighPriority" ADD CONSTRAINT "HighPriority_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediumPriority" ADD CONSTRAINT "MediumPriority_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LowPriority" ADD CONSTRAINT "LowPriority_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediumPriority2" ADD CONSTRAINT "MediumPriority2_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;
