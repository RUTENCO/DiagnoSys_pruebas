"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/shadcn-charts/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ZoomIn, ZoomOut, CheckCircle, ArrowLeft, FileText } from "lucide-react";

interface FormStats {
    id: number;
    name: string;
    isCompleted: boolean;
    totalItems: number;
    completedItems: number;
}

interface ReportMenuData {
    id: number;
    name: string;
    version: number;
    isCompleted: boolean;
    zoomInForms: FormStats[];
    zoomOutForms: FormStats[];
    stats: {
        totalForms: number;
        completedForms: number;
        completionRate: number;
    };
}

export default function ReportMenuPage() {
    const router = useRouter();
    const params = useParams();
    const { status } = useSession();
    const [reportData, setReportData] = useState<ReportMenuData | null>(null);
    const [loading, setLoading] = useState(true);

    const reportId = params.reportId as string;

    useEffect(() => {
        if (status === "authenticated" && reportId) {
            fetchReportData();
        }
    }, [status, reportId]);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/organization/reports/${reportId}/menu`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch report data');
            }

            const data = await response.json();
            setReportData(data.report);
        } catch (error) {
            console.error('🚨 Error fetching report data:', error);
            router.push('/dashboard/organization');
        } finally {
            setLoading(false);
        }
    };

    const navigateToZoom = (zoomType: 'zoom-in' | 'zoom-out') => {
        router.push(`/dashboard/organization/report/${reportId}/${zoomType}`);
    };

    const finishReport = async () => {
        try {
            const response = await fetch(`/api/organization/reports/${reportId}/complete`, {
                method: 'POST',
            });

            if (response.ok) {
                router.push('/dashboard/organization');
            }
        } catch (error) {
            console.error('🚨 Error completing report:', error);
        }
    };

    const viewReport = () => {
        router.push(`/dashboard/organization/report/${reportId}/view`);
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
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-500">Reporte no encontrado</p>
                        <Button 
                            className="mt-4" 
                            onClick={() => router.push('/dashboard/organization')}
                        >
                            Volver al panel
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getFormStatusBadge = (form: FormStats) => {
        if (form.isCompleted) {
            return <Badge className="bg-green-100 text-green-800 border-green-300">Completado</Badge>;
        } else if (form.completedItems > 0) {
            return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">En progreso</Badge>;
        } else {
            return <Badge className="bg-gray-100 text-gray-800 border-gray-300">No iniciado</Badge>;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/organization')}
                    className="mb-4"
                    size="sm"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver a Reportes
                </Button>
                
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {reportData.name} v{reportData.version}
                        </h1>
                        <p className="text-gray-600">
                            Elige tu perspectiva de evaluación y completa el diagnóstico
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Progreso general</div>
                        <div className="text-2xl font-bold green-text">
                            {reportData.stats.completionRate}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Overview */}
            <Card className="mb-8">
                <CardContent className="py-6">
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div 
                            className="green-interactive h-3 rounded-full transition-all duration-300" 
                            style={{ width: `${reportData.stats.completionRate}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>{reportData.stats.completedForms} de {reportData.stats.totalForms} formularios completados</span>
                        <span>{reportData.stats.totalForms - reportData.stats.completedForms} restantes</span>
                    </div>
                </CardContent>
            </Card>

            {/* Zoom Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Zoom In */}
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <ZoomIn className="h-6 w-6 mr-3 text-blue-600" />
                            Perspectiva Zoom In
                        </CardTitle>
                        <p className="text-gray-600">
                            Evaluación interna detallada enfocada en capacidades y habilidades específicas
                        </p>
                    </CardHeader>
                    <CardContent>
                        {/* Forms List */}
                        <div className="space-y-2 mb-4">
                            {reportData.zoomInForms.length > 0 ? (
                                reportData.zoomInForms.map((form) => (
                                    <div key={form.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm font-medium">{form.name}</span>
                                        {getFormStatusBadge(form)}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 py-4">Sin formularios Zoom In disponibles</p>
                            )}
                        </div>
                        
                        <Button
                            onClick={() => navigateToZoom('zoom-in')}
                            className="w-full green-interactive text-white"
                            disabled={reportData.zoomInForms.length === 0}
                        >
                            <ZoomIn className="h-4 w-4 mr-2" />
                            Iniciar Evaluación Zoom In
                        </Button>
                    </CardContent>
                </Card>

                {/* Zoom Out */}
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                            <ZoomOut className="h-6 w-6 mr-3 text-purple-600" />
                            Perspectiva Zoom Out
                        </CardTitle>
                        <p className="text-gray-600">
                            Evaluación estratégica de alto nivel enfocada en la madurez organizacional general
                        </p>
                    </CardHeader>
                    <CardContent>
                        {/* Forms List */}
                        <div className="space-y-2 mb-4">
                            {reportData.zoomOutForms.length > 0 ? (
                                reportData.zoomOutForms.map((form) => (
                                    <div key={form.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <span className="text-sm font-medium">{form.name}</span>
                                        {getFormStatusBadge(form)}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 py-4">Sin formularios Zoom Out disponibles</p>
                            )}
                        </div>
                        
                        <Button
                            onClick={() => navigateToZoom('zoom-out')}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            disabled={reportData.zoomOutForms.length === 0}
                        >
                            <ZoomOut className="h-4 w-4 mr-2" />
                            Iniciar Evaluación Zoom Out
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
                {reportData.stats.completedForms > 0 && (
                    <Button
                        onClick={viewReport}
                        variant="outline"
                        className="flex items-center"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Resultados Actuales
                    </Button>
                )}
                
                {reportData.stats.completionRate === 100 && !reportData.isCompleted && (
                    <Button
                        onClick={finishReport}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Finalizar Reporte
                    </Button>
                )}
            </div>
        </div>
    );
}
