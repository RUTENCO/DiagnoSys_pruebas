"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/shadcn-charts/card";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    ArrowLeft, 
    TrendingUp, 
    BarChart3, 
    Calendar, 
    Hash,
    CheckCircle,
    Clock,
    Target
} from "lucide-react";
import { FormRadarChart, ModuleRadarChart } from "@/app/components/shadcn-charts/radar-chart/form-radar-chart";

interface CategoryData {
    name: string;
    score: number;
    maxScore: number;
    itemCount: number;
    totalScore: number;
}

interface FormData {
    id: number;
    name: string;
    module: string;
    isCompleted: boolean;
    completedAt: string | null;
    categoryData: CategoryData[];
    stats: {
        totalItems: number;
        totalScore: number;
        avgScore: number;
        maxPossibleScore: number;
        completionPercentage: number;
    };
}

interface ReportStats {
    totalForms: number;
    completedForms: number;
    completionRate: number;
    zoomInForms: number;
    zoomOutForms: number;
    zoomInCompleted: number;
    zoomOutCompleted: number;
}

interface ReportViewData {
    id: number;
    name: string;
    version: number;
    isCompleted: boolean;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    stats: ReportStats;
    zoomInData: FormData[];
    zoomOutData: FormData[];
}

interface ApiResponse {
    reportData: ReportViewData;
    message: string;
}

export default function ReportViewPage() {
    const router = useRouter();
    const params = useParams();
    const { status } = useSession();
    const [reportData, setReportData] = useState<ReportViewData | null>(null);
    const [loading, setLoading] = useState(true);

    const reportId = params.reportId as string;

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/organization/reports/${reportId}/view`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch report data');
                }

                const data: ApiResponse = await response.json();
                setReportData(data.reportData);
            } catch (error) {
                console.error('🚨 Error fetching report data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (status === "authenticated" && reportId) {
            fetchReportData();
        }
    }, [status, reportId]);

    const goBack = () => {
        router.push('/dashboard/organization');
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

    const getScoreColor = (percentage: number) => {
        if (percentage >= 80) return "text-green-600";
        if (percentage >= 60) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreBadge = (percentage: number) => {
        if (percentage >= 80) {
            return <Badge className="bg-green-100 text-green-800 border-green-300">Excelente</Badge>;
        } else if (percentage >= 60) {
            return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Bueno</Badge>;
        } else if (percentage >= 40) {
            return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Regular</Badge>;
        } else {
            return <Badge className="bg-red-100 text-red-800 border-red-300">Necesita Mejora</Badge>;
        }
    };

    // Process data for module overview charts
    const processModuleData = (forms: FormData[]) => {
        const moduleMap = new Map();
        
        forms.forEach(form => {
            if (!moduleMap.has(form.module)) {
                moduleMap.set(form.module, {
                    name: form.module,
                    totalScore: 0,
                    maxScore: 0,
                    formsCount: 0,
                    completedForms: 0
                });
            }
            
            const moduleData = moduleMap.get(form.module);
            moduleData.totalScore += form.stats.totalScore;
            moduleData.maxScore += form.stats.maxPossibleScore;
            moduleData.formsCount += 1;
            if (form.isCompleted) moduleData.completedForms += 1;
        });

        return Array.from(moduleMap.values()).map(moduleItem => ({
            name: moduleItem.name,
            avgScore: moduleItem.maxScore > 0 ? Math.round((moduleItem.totalScore / moduleItem.maxScore) * 5 * 100) / 100 : 0,
            completionPercentage: moduleItem.formsCount > 0 ? Math.round((moduleItem.completedForms / moduleItem.formsCount) * 100) : 0,
            formsCount: moduleItem.formsCount
        }));
    };

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Cargando reporte...</span>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Reporte no encontrado</h1>
                    <Button onClick={goBack} variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver al panel
                    </Button>
                </div>
            </div>
        );
    }

    const zoomInModules = processModuleData(reportData.zoomInData);
    const zoomOutModules = processModuleData(reportData.zoomOutData);

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <Button onClick={goBack} variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{reportData.name}</h1>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                                <Hash className="h-3 w-3 mr-1" />
                                Versión {reportData.version}
                            </div>
                            <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                Creado {formatDate(reportData.createdAt)}
                            </div>
                            {reportData.completedAt && (
                                <div className="flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                    Completado {formatDate(reportData.completedAt)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    {reportData.isCompleted ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completado
                        </Badge>
                    ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            <Clock className="h-3 w-3 mr-1" />
                            En Progreso
                        </Badge>
                    )}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Target className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Progreso General</p>
                                <p className="text-2xl font-bold">{reportData.stats.completionRate}%</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Formularios Completados</p>
                                <p className="text-2xl font-bold">
                                    {reportData.stats.completedForms}/{reportData.stats.totalForms}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-purple-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Zoom In</p>
                                <p className="text-2xl font-bold">
                                    {reportData.stats.zoomInCompleted}/{reportData.stats.zoomInForms}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-orange-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Zoom Out</p>
                                <p className="text-2xl font-bold">
                                    {reportData.stats.zoomOutCompleted}/{reportData.stats.zoomOutForms}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Module Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {zoomInModules.length > 0 && (
                    <ModuleRadarChart
                        title="Vista General Zoom In"
                        description="Resumen de evaluación de habilidades y capacidades"
                        modules={zoomInModules}
                    />
                )}
                
                {zoomOutModules.length > 0 && (
                    <ModuleRadarChart
                        title="Vista General Zoom Out"
                        description="Resumen de evaluación de capacidades estratégicas"
                        modules={zoomOutModules}
                    />
                )}
            </div>

            {/* Detailed Forms Analysis */}
            
            {/* Zoom In Forms */}
            {reportData.zoomInData.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Zoom In - Análisis Detallado</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {reportData.zoomInData.map((form) => (
                            <div key={form.id} className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{form.name}</CardTitle>
                                            {getScoreBadge(form.stats.completionPercentage)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <span>Módulo: {form.module}</span>
                                            <span className={getScoreColor(form.stats.completionPercentage)}>
                                                {form.stats.avgScore}/5.0 prom
                                            </span>
                                        </div>
                                    </CardHeader>
                                </Card>
                                
                                <FormRadarChart
                                    title={`${form.name} - Categorías`}
                                    description={`Puntuaciones promedio por categoría (${form.stats.totalItems} ítems)`}
                                    data={form.categoryData}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Zoom Out Forms */}
            {reportData.zoomOutData.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Zoom Out - Análisis Detallado</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {reportData.zoomOutData.map((form) => (
                            <div key={form.id} className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{form.name}</CardTitle>
                                            {getScoreBadge(form.stats.completionPercentage)}
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <span>Módulo: {form.module}</span>
                                            <span className={getScoreColor(form.stats.completionPercentage)}>
                                                {form.stats.avgScore}/5.0 prom
                                            </span>
                                        </div>
                                    </CardHeader>
                                </Card>
                                
                                <FormRadarChart
                                    title={`${form.name} - Categorías`}
                                    description={`Puntuaciones promedio por categoría (${form.stats.totalItems} ítems)`}
                                    data={form.categoryData}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {reportData.zoomInData.length === 0 && reportData.zoomOutData.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="text-gray-500">
                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">Sin Datos Disponibles</h3>
                            <p>Completa algunos formularios para ver el análisis detallado y las gráficas</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
