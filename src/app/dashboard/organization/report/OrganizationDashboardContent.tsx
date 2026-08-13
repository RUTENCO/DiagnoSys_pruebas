"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/shadcn-charts/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, PlayCircle, Eye, Calendar, Hash, TrendingUp, Trash2} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmationPopup from "@/app/components/ConfirmationPopup";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ReportStats {
    totalForms: number;
    completedForms: number;
    completionRate: number;
    zoomInCompleted: number;
    zoomOutCompleted: number;
    zoomInTotal: number;
    zoomOutTotal: number;
    categorizationCompleted: boolean;
    prioritizationCompleted: boolean;
}

interface Report {
    id: number;
    name: string;
    version: number;
    isCompleted: boolean;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    stats: ReportStats;
}

interface ApiResponse {
    reports: Report[];
    message: string;
}

export default function OrganizationDashboardContent() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { status } = useSession();
    const organizationId = searchParams.get("organizationId");
    const organizationName = searchParams.get("organizationName");
    const consultantScopedMode = Boolean(organizationId);
    const contextQuery = consultantScopedMode
        ? `?organizationId=${organizationId}&organizationName=${encodeURIComponent(organizationName ?? "")}`
        : "";
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newReportName, setNewReportName] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deletingReportId, setDeletingReportId] = useState<number | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/organization/reports${contextQuery}`);
            if (!response.ok) throw new Error('Failed to fetch reports');
            const data: ApiResponse = await response.json();
            setReports(data.reports);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    }, [contextQuery]);

    useEffect(() => {
        if (status === "authenticated") {
            fetchReports();
        }
    }, [status, fetchReports]);

    const createReport = async () => {
        if (!newReportName.trim()) return;
        try {
            setCreating(true);
            const response = await fetch(`/api/organization/reports${contextQuery}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newReportName.trim() }),
            });
            if (!response.ok) throw new Error('Failed to create report');
            const data = await response.json();
            setReports(prev => [data.report, ...prev]);
            setNewReportName("");
            setDialogOpen(false);
        } catch (error) {
            console.error('Error creating report:', error);
        } finally {
            setCreating(false);
        }
    };

    const startReport = (reportId: number) => {
        router.push(`/dashboard/organization/report/${reportId}/zoom-in${contextQuery}`);
    };

    const viewReport = (reportId: number) => {
        router.push(`/dashboard/organization/report/${reportId}/reports${contextQuery}`);
    };

    const requestDeleteReport = (reportId: number) => {
        setPendingRemoval(reportId);
    };

    const confirmDeleteReport = async () => {
        if (!pendingRemoval) {
            return;
        }

        try {
            setDeletingReportId(pendingRemoval);

            const response = await fetch(`/api/organization/reports/${pendingRemoval}${contextQuery}`, {
                method: "DELETE",
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || "Failed to delete report");
            }

            setReports((prev) => prev.filter((report) => report.id !== pendingRemoval));
        } catch (error) {
            console.error("Error deleting report:", error);
        } finally {
            setDeletingReportId(null);
            setPendingRemoval(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isReportCompleted = (report: Report) => {
        const allFormsCompleted =
            report.stats.totalForms > 0 &&
            report.stats.completedForms >= report.stats.totalForms;

        return (
            report.isCompleted ||
            (allFormsCompleted &&
                report.stats.categorizationCompleted &&
                report.stats.prioritizationCompleted)
        );
    };

    const isReportInProgress = (report: Report) => {
        return (
            report.stats.completedForms > 0 ||
            report.stats.categorizationCompleted ||
            report.stats.prioritizationCompleted
        );
    };

    const getStatusBadge = (report: Report) => {
        if (isReportCompleted(report)) {
            return (
                <Badge
                    variant="outline"
                    className="bg-green-200 text-black border-green-800 whitespace-nowrap"
                >
                    {t("orgDashboard.statusCompleted")}
                </Badge>
            );
        } else if (isReportInProgress(report)) {
            return (
                <Badge
                    variant="outline"
                    className="bg-orange-200 text-black border-orange-800 whitespace-nowrap"
                >
                    {t("orgDashboard.statusInProgress")}
                </Badge>
            );
        } else {
            return (
                <Badge
                    variant="outline"
                    className="bg-yellow-200 text-black border-yellow-500 whitespace-nowrap"
                >
                    {t("orgDashboard.statusNotStarted")}
                </Badge>
            );
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>{t("common.loading")}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary mb-2">
                    {t("reportsPage.title")}
                </h1>
                <p className="text-black mt-5">
                    {t("orgDashboard.subtitle")}
                </p>
            </div>

            <div className="mb-6">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="default">
                            <Plus className="h-4 w-4 mr-2" />
                            {t("orgDashboard.createNew")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="green-interactive ">
                        <DialogHeader>
                            <DialogTitle>{t("orgDashboard.createNew")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="mt-4" htmlFor="reportName">{t("orgDashboard.reportNameLabel")}</Label>
                                <Input
                                    id="reportName"
                                    value={newReportName}
                                    onChange={(e) => setNewReportName(e.target.value)}
                                    placeholder={t("orgDashboard.reportNamePlaceholder")}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex justify-center space-x-2  w-full">
                                <Button
                                    variant="secondary"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={creating}
                                    className="w-auto"
                                >
                                    {t("common.cancel")}
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={createReport}
                                    disabled={creating || !newReportName.trim()}
                                    className="w-auto"
                                >
                                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {t("orgDashboard.createButton")}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {reports.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="text-gray-500 mb-4">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">{t("orgDashboard.noReportsTitle")}</h3>
                            <p>{t("orgDashboard.noReportsDesc")}</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <Card key={report.id} className="green-interactive hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="space-y-3">
                                    <div className="flex justify-end">{getStatusBadge(report)}</div>
                                    <CardTitle className="text-lg text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                                        {report.name}
                                    </CardTitle>
                                    <div className="flex items-center justify-between gap-4 text-sm text-gray-800">
                                        <div className="flex items-center justify-start whitespace-nowrap">
                                            <Hash className="h-4 w-4 mr-1" />
                                            V{report.version}
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 text-gray-800 whitespace-nowrap pl-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{formatDate(report.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-normal">{t("orgDashboard.progressGeneral")}</span>
                                        <span className="font-medium">{report.stats.completionRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-800 h-2 rounded-full"
                                            style={{ width: `${report.stats.completionRate}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-800">Zoom In</div>
                                            <div className="font-medium">
                                                {report.stats.zoomInCompleted}/{report.stats.zoomInTotal}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-800">Zoom Out</div>
                                            <div className="font-medium">
                                                {report.stats.zoomOutCompleted}/{report.stats.zoomOutTotal}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-800">{t("nav.categorization")}</span>
                                            <span className={`font-medium ${report.stats.categorizationCompleted ? "text-green-800" : "text-amber-700"}`}>
                                                {report.stats.categorizationCompleted ? t("orgDashboard.statusCompleted") : t("orgDashboard.pending")}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-800">{t("nav.prioritization")}</span>
                                            <span className={`font-medium ${report.stats.prioritizationCompleted ? "text-green-800" : "text-amber-700"}`}>
                                                {report.stats.prioritizationCompleted ? t("orgDashboard.statusCompleted") : t("orgDashboard.pending")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() => startReport(report.id)}
                                        className="w-full justify-center px-3"
                                        size="sm"
                                    >
                                        <PlayCircle className="h-4 w-4 mr-2 shrink-0" />
                                        <span className="whitespace-nowrap">{t("orgDashboard.start")}</span>
                                    </Button>
                                    {report.stats.completedForms > 0 && (
                                        <Button
                                            onClick={() => viewReport(report.id)}
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-center px-3 hover:bg-green-100 hover:text-green-900 border-gray-400 hover:border-green-900 transition-colors"
                                        >
                                            <Eye className="h-4 w-4 mr-2 shrink-0" />
                                            <span className="whitespace-nowrap">{t("orgDashboard.view")}</span>
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => requestDeleteReport(report.id)}
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-center px-3 border-red-700 text-red-700 hover:bg-red-200 hover:text-red-700"
                                        disabled={deletingReportId === report.id}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                                        <span className="whitespace-nowrap">{deletingReportId === report.id ? t("common.deleting") : t("common.delete")}</span>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ConfirmationPopup
                open={pendingRemoval !== null}
                title={t("consultantReports.deleteReportTitle")}
                message={t("consultantReports.deleteReportMessage")}
                confirmLabel={t("common.delete")}
                cancelLabel={t("common.cancel")}
                confirmTone="destructive"
                onConfirm={confirmDeleteReport}
                onCancel={() => setPendingRemoval(null)}
            />
        </div>
    );
}
