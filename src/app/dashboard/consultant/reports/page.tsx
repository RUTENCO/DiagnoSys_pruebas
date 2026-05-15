"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/app/components/shadcn-charts/card";
import { Calendar, ChevronRight, Eye, Loader2, TrendingUp, BarChart3 } from "lucide-react";

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
        description: string | null;
        userName: string;
        email: string;
        stats: {
            reportsCount: number;
        };
        reports: ReportSummary[];
    }>;
    message: string;
}

export default function ReportsPage() {
    const router = useRouter();
    const { status } = useSession();
    const [loading, setLoading] = useState(true);
    const [organizations, setOrganizations] = useState<ApiResponse["organizations"]>([]);

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
        if (!dateString) return "Sin fecha";
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

    const getStatusBadge = (report: ReportSummary) => {
        if (report.isCompleted) {
            return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Completado</Badge>;
        }

        if (report.stats.completedForms > 0) {
            return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100">Pendiente</Badge>;
        }

        return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100">No iniciado</Badge>;
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
                        Reportes por Organización
                    </h1>
                    <p className="text-black">
                        Revisa los reportes de cada organización que gestionas desde una sola vista.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="green">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-8">
                                <TrendingUp className="h-9 w-9 text-emerald-800" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">Organizaciones</p>
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
                                    <p className="text-2xl font-medium text-[#2E6347]">Reportes</p>
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
                                    <p className="text-2xl font-medium text-[#2E6347]">Completados</p>
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
                                <h3 className="text-lg font-medium mb-2">Sin reportes disponibles</h3>
                                <p>Cuando una organización genere reportes, aparecerán aquí agrupados por organización.</p>
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
                                            <p className="text-gray-700">{organization.description || "Sin descripción"}</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Usuario: {organization.userName} | Email: {organization.email}
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-primary/20 bg-white/80 px-4 py-3 text-center min-w-44">
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Reportes</p>
                                            <p className="text-3xl font-bold text-[#2E6347]">{organization.stats.reportsCount}</p>
                                        </div>
                                    </div>

                                    {organization.reports.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-gray-300 p-5 text-gray-600">
                                            Aún no tiene reportes creados.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {organization.reports.map((report) => (
                                                <div key={report.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                                                    <div className="flex items-start gap-3">
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-[#2E6347]">{report.name}</h3>
                                                            <p className="text-sm text-gray-500">Versión {report.version}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                                                        <p className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" />
                                                            Creado: {formatDate(report.createdAt)}
                                                        </p>
                                                        <p>Completados: {report.stats.completedForms}/{report.stats.totalForms}</p>
                                                        <p>Progreso: {report.stats.completionRate}%</p>
                                                    </div>

                                                    <div className="mt-4 flex flex-col gap-2">
                                                        <Button
                                                            type="button"
                                                            className="w-full bg-[#2E6347] hover:bg-[#265239] text-white"
                                                            onClick={() => openReport(organization, report.id)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            Ver reporte
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            className="w-full"
                                                            onClick={() => continueReport(organization, report.id)}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                            Continuar diagnóstico
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
        </div>
    );
}
