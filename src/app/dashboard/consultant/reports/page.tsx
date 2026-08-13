"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/app/components/shadcn-charts/card";
import ConfirmationPopup from "@/app/components/ConfirmationPopup";
import { Calendar, ChevronRight, Eye, TrendingUp, BarChart3 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ReportSummary {
    id: number;
    name: string;
    version: number;
    isCompleted: boolean;
    completedAt: string | null;
    createdAt: string;
    stats: {
        totalForms: number;
        completedForms: number;
        completionRate: number;
    };
}

interface ApiResponse {
    organizations: Array<{
        id: number;
        name: string;
        userName: string;
        email: string;
        sector: string | null;
        companySize: string | null;
        stats: {
            reportsCount: number;
        };
        reports: ReportSummary[];
    }>;
    message: string;
}

function removeReportFromOrganizations(
    organizations: ApiResponse["organizations"],
    organizationId: number,
    reportId: number
) {
    return organizations
        .map((organization) => {
            if (organization.id !== organizationId) {
                return organization;
            }

            const nextReports = organization.reports.filter((report) => report.id !== reportId);

            return {
                ...organization,
                reports: nextReports,
                stats: {
                    ...organization.stats,
                    reportsCount: nextReports.length,
                },
            };
        })
        .filter((organization) => organization.reports.length > 0 || organization.stats.reportsCount > 0);
}

export default function ReportsPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { status } = useSession();
    const [loading, setLoading] = useState(true);
    const [organizations, setOrganizations] = useState<ApiResponse["organizations"]>([]);
    const [deletingReportId, setDeletingReportId] = useState<number | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<{ organizationId: number; reportId: number } | null>(null);

    useEffect(() => {
        if (status === "authenticated") {
            fetchPersonalizedForms();
        }
    }, [status]);

    const fetchPersonalizedForms = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/consultant/reports');
            
            if (!response.ok) {
                throw new Error('Failed to fetch reports');
            }

            const data: ApiResponse = await response.json();
            setOrganizations(data.organizations || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const summary = useMemo(() => {
        const totalOrganizations = organizations.length;
        const totalReports = organizations.reduce((sum, org) => sum + org.stats.reportsCount, 0);
        const completedReports = organizations.reduce(
            (sum, org) => sum + org.reports.filter((report) => report.isCompleted).length,
            0
        );

        return { totalOrganizations, totalReports, completedReports };
    }, [organizations]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return t("consultantReports.noDate");
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const openReport = (organization: { id: number; name: string }, reportId: number) => {
        router.push(
            `/dashboard/organization/report/${reportId}/reports?organizationId=${organization.id}&organizationName=${encodeURIComponent(organization.name)}`
        );
    };

    const continueReport = (organization: { id: number; name: string }, reportId: number) => {
        router.push(
            `/dashboard/organization/report/${reportId}/zoom-in?organizationId=${organization.id}&organizationName=${encodeURIComponent(organization.name)}`
        );
    };

    const removeReport = async (organizationId: number, reportId: number) => {
        setPendingRemoval({ organizationId, reportId });
    };

    const confirmRemoveReport = async () => {
        if (!pendingRemoval) {
            return;
        }

        const { organizationId, reportId } = pendingRemoval;

        try {
            setDeletingReportId(reportId);

            const response = await fetch(`/api/consultant/reports/${reportId}`, {
                method: "DELETE",
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || t("consultantReports.deleteReportError"));
            }

            setOrganizations((prev) => removeReportFromOrganizations(prev, organizationId, reportId));
        } catch (error) {
            console.error("Error deleting report:", error);
        } finally {
            setDeletingReportId(null);
            setPendingRemoval(null);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="w-full">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {/* Header Skeleton */}
                    <div className="mb-8">
                        <div className="h-9 w-80 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-6 w-96 bg-gray-100 rounded animate-pulse"></div>
                    </div>

                    {/* Overview Stats Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="green-interactive">
                                <CardContent className="pt-6">
                                    <div className="flex items-center space-x-8">
                                        <div className="h-9 w-9 bg-gray-200 rounded animate-pulse"></div>
                                        <div>
                                            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                                            <div className="h-8 w-12 bg-gray-300 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Organizations Skeleton */}
                    <div className="mb-12">
                        <div className="flex items-center mb-6">
                            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse mr-2"></div>
                            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-col gap-6">
                            {[1, 2].map((i) => (
                                <div key={i} className="min-h-[400px] flex">
                                    <Card className="green-interactive w-full">
                                        <CardContent className="pb-0">
                                            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                                            <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-4"></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[1, 2, 3].map((j) => (
                                                    <div key={j} className="rounded-lg border border-gray-100 p-4">
                                                        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                                                        <div className="h-4 w-56 bg-gray-100 rounded animate-pulse mb-3"></div>
                                                        <div className="h-9 w-full bg-gray-200 rounded animate-pulse"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Empty organizations skeleton */}
                    <div className="mb-12">
                        <div className="flex items-center mb-6">
                            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse mr-2"></div>
                            <div className="h-8 w-72 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-col gap-6">
                            <div className="min-h-[220px] flex">
                                <Card className="green-interactive w-full">
                                    <CardContent className="pb-0">
                                        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
                                        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mb-4"></div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#2E6347] mb-2">
                        {t("consultantReports.title")}
                    </h1>
                    <p className="text-black">
                        {t("consultantReports.subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="green">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-8">
                                <TrendingUp className="h-9 w-9 text-emerald-800" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">{t("consultantReports.organizations")}</p>
                                    <p className="text-2xl font-bold">{summary.totalOrganizations}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="green">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-8">
                                <TrendingUp className="h-9 w-9 text-emerald-800" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">{t("consultantReports.reports")}</p>
                                    <p className="text-2xl font-bold">{summary.totalReports}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="green">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-8">
                                <TrendingUp className="h-9 w-9 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">{t("consultantReports.completed")}</p>
                                    <p className="text-2xl font-bold">{summary.completedReports}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {organizations.length === 0 ? (
                    <Card className="green-interactive">
                        <CardContent className="py-12 text-center">
                            <div className="text-[#2E6347]">
                                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-[#2E6347]" />
                                <h3 className="text-lg font-medium mb-2">{t("consultantReports.noReportsTitle")}</h3>
                                <p>{t("consultantReports.noReportsDesc")}</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {organizations.map((organization) => (
                            <Card key={organization.id} className="green-interactive overflow-hidden">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-[#2E6347] mb-2">{organization.name}</h2>
                                            <p className="text-gray-700">
                                                {t("consultantReports.sectorLabel")}: {organization.sector || t("consultantReports.notSpecified")} | {t("consultantReports.sizeLabel")}: {organization.companySize || t("consultantReports.notSpecified")}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {t("consultantReports.userLabel")}: {organization.userName} | {t("consultantReports.emailLabel")}: {organization.email}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-primary/20 bg-white/80 px-4 py-3 text-center min-w-44">
                                            <p className="text-xs uppercase tracking-wide text-gray-500">{t("consultantReports.reports")}</p>
                                            <p className="text-3xl font-bold text-[#2E6347]">{organization.stats.reportsCount}</p>
                                        </div>
                                    </div>

                                    {organization.reports.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-gray-600">
                                            {t("consultantReports.noReportsYet")}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {organization.reports.map((report) => (
                                                <div key={report.id} className="rounded-xl border border-gray-200 bg-secondary p-4 shadow-sm hover:shadow-md transition">
                                                    <div className="flex items-start gap-3">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-[#2E6347]">{report.name}</h3>
                                                            <p className="text-sm text-gray-500">{t("consultantReports.versionLabel")} {report.version}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                                                        <p className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            {t("consultantReports.createdLabel")}: {formatDate(report.createdAt)}
                                                        </p>
                                                        <p>{t("consultantReports.completedFormsLabel")}: {report.stats.completedForms}/{report.stats.totalForms}</p>
                                                        <p>{t("consultantReports.progressLabel")}: {report.stats.completionRate}%</p>
                                                    </div>

                                                    <div className="mt-4 flex flex-col gap-2">
                                                        <Button
                                                            type="button"
                                                            className="w-full bg-[#2E6347] hover:bg-[#265239] text-white"
                                                            onClick={() => openReport(organization, report.id)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {t("consultantReports.viewReport")}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            className="w-full"
                                                            onClick={() => continueReport(organization, report.id)}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                            {t("consultantReports.goToDiagnostic")}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => removeReport(organization.id, report.id)}
                                                            disabled={deletingReportId === report.id}
                                                        >
                                                            {deletingReportId === report.id ? t("consultantReports.deleting") : t("consultantReports.deleteReport")}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmationPopup
                open={pendingRemoval !== null}
                title={t("consultantReports.deleteReportTitle")}
                message={t("consultantReports.deleteReportMessage")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                confirmTone="destructive"
                onConfirm={confirmRemoveReport}
                onCancel={() => setPendingRemoval(null)}
            />
        </div>
    );
}
