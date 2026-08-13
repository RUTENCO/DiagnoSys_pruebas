"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function ConsultantDiagnosticsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const organizationName = searchParams.get("organizationName");

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[#2E6347] mb-2">{t("diagnostics.title")}</h1>
      <p className="text-gray-700 mb-6">{t("diagnostics.emptySection")}</p>

      {organizationId ? (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">{t("diagnostics.selectedOrganization")}</p>
          <p className="text-xl font-semibold text-primary">
            {organizationName || `${t("diagnostics.organizationHash")}${organizationId}`}
          </p>
          <Link
            href="/dashboard/consultant/organizations"
            className="inline-block mt-4 text-blue-700 hover:underline"
          >
            {t("diagnostics.backToOrganizations")}
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-4">
          <p className="text-gray-700">{t("diagnostics.selectOrgFirst")}</p>
          <Link
            href="/dashboard/consultant/organizations"
            className="inline-block mt-3 text-blue-700 hover:underline"
          >
            {t("diagnostics.goToOrganizations")}
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ConsultantDiagnosticsPage() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto py-8 px-4 text-gray-500">{t("common.loading")}</div>}>
      <ConsultantDiagnosticsContent />
    </Suspense>
  );
}
