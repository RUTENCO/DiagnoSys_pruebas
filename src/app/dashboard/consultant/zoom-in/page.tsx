"use client";

import { Suspense } from "react";
import PreviewForms from "@/app/components/preview-forms/preview-forms";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function ZoomInContent() {
    const { t } = useLanguage();
    const searchParams = useSearchParams();
    const organizationId = searchParams.get("organizationId");

    return (
        <div className="max-h-screen w-full">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#2E6347]">Zoom In</h1>
                    <p className="mt-2 text-lg  text-black">
                        {t("zoomInPage.consultantDesc")}
                    </p>
                    {organizationId ? (
                        <p className="mt-2 text-sm text-gray-600">
                            {t("zoomPage.diagnosingOrg")} {organizationId}
                        </p>
                    ) : null}
                </div>

                <PreviewForms moduleName="Zoom In" />
            </div>
        </div>
    );
}

export default function ZoomInPage() {
    const { t } = useLanguage();
    return (
        <Suspense fallback={<div className="max-w-7xl mx-auto py-8 px-4 text-gray-500">{t("common.loading")}</div>}>
            <ZoomInContent />
        </Suspense>
    );
}
