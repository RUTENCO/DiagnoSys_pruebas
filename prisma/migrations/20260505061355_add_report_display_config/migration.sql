-- CreateTable
CREATE TABLE "ReportDisplayConfig" (
    "id" SERIAL NOT NULL,
    "organizationUserId" INTEGER NOT NULL,
    "showExecutiveSummary" BOOLEAN NOT NULL DEFAULT true,
    "showRadar" BOOLEAN NOT NULL DEFAULT true,
    "showCategorization" BOOLEAN NOT NULL DEFAULT true,
    "showPrioritization" BOOLEAN NOT NULL DEFAULT true,
    "showActionPlan" BOOLEAN NOT NULL DEFAULT true,
    "showScaleLegend" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#2E6347',
    "secondaryColor" TEXT DEFAULT '#24533b',
    "headerTitle" TEXT DEFAULT 'Reporte de Evaluación Digital',
    "headerSubtitle" TEXT,
    "updatedByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDisplayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportDisplayConfig_organizationUserId_key" ON "ReportDisplayConfig"("organizationUserId");

-- AddForeignKey
ALTER TABLE "ReportDisplayConfig" ADD CONSTRAINT "ReportDisplayConfig_organizationUserId_fkey" FOREIGN KEY ("organizationUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportDisplayConfig" ADD CONSTRAINT "ReportDisplayConfig_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
