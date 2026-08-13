"use client";

import { Suspense } from "react";
import OrganizationDashboardContent from "./OrganizationDashboardContent";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function LoadingFallback() {
    const { t } = useLanguage();
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>{t("orgDashboard.loadingReports")}</span>
            </div>
        </div>
    );
}

export default function OrganizationDashboard() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <OrganizationDashboardContent />
        </Suspense>
    );
}
