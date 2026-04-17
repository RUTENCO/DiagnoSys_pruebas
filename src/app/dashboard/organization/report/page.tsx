"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/shadcn-charts/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, PlayCircle, Eye, Calendar, Hash, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function OrganizationDashboard() {
    const router = useRouter();
    const { status } = useSession();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newReportName, setNewReportName] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            fetchReports();
        }
    }, [status]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/organization/reports');
            if (!response.ok) throw new Error('Failed to fetch reports');
            const data: ApiResponse = await response.json();
            setReports(data.reports);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const createReport = async () => {
        if (!newReportName.trim()) return;
        try {
            setCreating(true);
            const response = await fetch('/api/organization/reports', {
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
        router.push(`/dashboard/organization/report/${reportId}/zoom-in`);
    };

    const viewReport = (reportId: number) => {
        router.push(`/dashboard/organization/report/${reportId}/reports`);
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
                    className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100 cursor-default"
                >
                    Completado
                </Badge>
            );
        } else if (isReportInProgress(report)) {
            return (
                <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100 cursor-default"
                >
                    En progreso
                </Badge>
            );
        } else {
            return (
                <Badge
                    variant="outline"
                    className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100 cursor-default"
                >
                    No iniciado
                </Badge>
            );
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Cargando reportes...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Reportes de Evaluación Digital
                </h1>
                <p className="text-gray-600">
                    Crea y gestiona tus reportes de evaluación de madurez digital
                </p>
            </div>

            <div className="mb-6">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="default">
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Nuevo Reporte
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="green-interactive ">
                        <DialogHeader>
                            <DialogTitle>Crear Nuevo Reporte</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="mt-4" htmlFor="reportName">Nombre del reporte</Label>
                                <Input
                                    id="reportName"
                                    value={newReportName}
                                    onChange={(e) => setNewReportName(e.target.value)}
                                    placeholder="Ingresa el nombre del reporte..."
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
                                    Cancelar
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={createReport}
                                    disabled={creating || !newReportName.trim()}
                                    className="w-auto"
                                >
                                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Crear Reporte
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
                            <h3 className="text-lg font-medium mb-2">Sin reportes aún</h3>
                            <p>Crea tu primer reporte de evaluación de madurez digital para comenzar</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map((report) => (
                        <Card key={report.id} className="green-interactive hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg mb-2">{report.name}</CardTitle>
                                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Hash className="h-3 w-3 mr-1" />
                                                v{report.version}
                                            </div>
                                            <div className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {formatDate(report.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    {getStatusBadge(report)}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Progreso general</span>
                                        <span className="font-medium">{report.stats.completionRate}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="green-interactive h-2 rounded-full"
                                            style={{ width: `${report.stats.completionRate}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <div className="text-gray-600">Zoom In</div>
                                            <div className="font-medium">
                                                {report.stats.zoomInCompleted}/{report.stats.zoomInTotal}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-600">Zoom Out</div>
                                            <div className="font-medium">
                                                {report.stats.zoomOutCompleted}/{report.stats.zoomOutTotal}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Categorización</span>
                                            <span className={`font-medium ${report.stats.categorizationCompleted ? "text-green-700" : "text-amber-700"}`}>
                                                {report.stats.categorizationCompleted ? "Completado" : "Pendiente"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600">Priorización</span>
                                            <span className={`font-medium ${report.stats.prioritizationCompleted ? "text-green-700" : "text-amber-700"}`}>
                                                {report.stats.prioritizationCompleted ? "Completado" : "Pendiente"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                    <Button
                                        onClick={() => startReport(report.id)}
                                            className="w-full sm:flex-1"
                                        size="sm"
                                    >
                                        <PlayCircle className="h-4 w-4 mr-2" />
                                        Iniciar Reporte
                                    </Button>
                                    {report.stats.completedForms > 0 && (
                                        <Button
                                            onClick={() => viewReport(report.id)}
                                            variant="outline"
                                            size="sm"
                                                className="w-full sm:flex-1 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors"
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
