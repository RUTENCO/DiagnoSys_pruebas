"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp, BarChart3, Radar} from "lucide-react";
import { FormRadarChart } from "@/app/components/shadcn-charts/radar-chart/form-radar-chart";
import { Card, CardContent, CardHeader } from "@/app/components/shadcn-charts/card";

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
    user: {
        name: string;
        email: string;
        organization: string;
    };
    categoryData: CategoryData[];
    stats: {
        totalItems: number;
        totalScore: number;
        avgScore: number;
        maxPossibleScore: number;
        completionPercentage: number;
    };
}

interface ApiResponse {
    zoomInForms: FormData[];
    zoomOutForms: FormData[];
    message: string;
}

export default function ReportsPage() {
    const { status } = useSession();
    const [loading, setLoading] = useState(true);
    const [zoomInForms, setZoomInForms] = useState<FormData[]>([]);
    const [zoomOutForms, setZoomOutForms] = useState<FormData[]>([]);

    useEffect(() => {
        if (status === "authenticated") {
            fetchPersonalizedForms();
        }
    }, [status]);

    const fetchPersonalizedForms = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/reports/radar-data');
            
            if (!response.ok) {
                throw new Error('Failed to fetch personalized forms');
            }

            const data: ApiResponse = await response.json();
            console.log('🎯 Admin Frontend received data:', data);
            console.log('🎯 ZoomIn forms:', data.zoomInForms);
            console.log('🎯 ZoomOut forms:', data.zoomOutForms);
            
            setZoomInForms(data.zoomInForms || []);
            setZoomOutForms(data.zoomOutForms || []);
        } catch (error) {
            console.error('🚨 Error fetching personalized forms:', error);
        } finally {
            setLoading(false);
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

                    {/* Zoom In Forms Section Skeleton */}
                    <div className="mb-12">
                        <div className="flex items-center mb-6">
                            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse mr-2"></div>
                            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-col gap-6">
                            {[1, 2].map((i) => (
                                <div key={i} className="min-h-[400px] flex">
                                    <Card className="green-interactive w-full">
                                        <CardHeader className="items-center pb-4">
                                            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                                            <div className="h-5 w-64 bg-gray-100 rounded animate-pulse"></div>
                                        </CardHeader>
                                        <CardContent className="pb-0">
                                            <div className="flex flex-col items-center">
                                                {/* Radar Chart Skeleton */}
                                                <div className="mx-auto min-h-[400px] w-full max-w-2xl flex items-center justify-center">
                                                    <div className="relative w-80 h-80">
                                                        {/* Animated pulse radar */}
                                                        <div className="absolute inset-0 rounded-full border-4 border-gray-200 animate-pulse"></div>
                                                        <div className="absolute inset-4 rounded-full border-2 border-gray-150 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                        <div className="absolute inset-8 rounded-full border-2 border-gray-100 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                                        <div className="absolute inset-12 rounded-full border-2 border-gray-50 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                                        
                                                        {/* Skeleton labels */}
                                                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                                                        </div>
                                                        <div className="absolute top-1/4 right-0 transform translate-x-2">
                                                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                                        </div>
                                                        <div className="absolute bottom-1/4 right-0 transform translate-x-2">
                                                            <div className="h-3 w-18 bg-gray-200 rounded animate-pulse"></div>
                                                        </div>
                                                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                                                        </div>
                                                        <div className="absolute top-1/4 left-0 transform -translate-x-2">
                                                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Statistics Skeleton */}
                                            <div className="mt-6 pt-4 border-t border-gray-200">
                                                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[1, 2, 3, 4].map((j) => (
                                                        <div key={j} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
                                                            <div className="flex-1">
                                                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
                                                                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                                                            </div>
                                                            <div className="text-right ml-3">
                                                                <div className="h-5 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                                <div className="h-4 w-10 bg-gray-100 rounded-full animate-pulse"></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Zoom Out Forms Section Skeleton */}
                    <div className="mb-12">
                        <div className="flex items-center mb-6">
                            <div className="h-6 w-6 bg-gray-200 rounded animate-pulse mr-2"></div>
                            <div className="h-8 w-72 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-col gap-6">
                            <div className="min-h-[400px] flex">
                                <Card className="green-interactive w-full">
                                    <CardHeader className="items-center pb-4">
                                        <div className="h-7 w-56 bg-gray-200 rounded animate-pulse mb-2"></div>
                                        <div className="h-5 w-72 bg-gray-100 rounded animate-pulse"></div>
                                    </CardHeader>
                                    <CardContent className="pb-0">
                                        <div className="flex flex-col items-center">
                                            {/* Radar Chart Skeleton */}
                                            <div className="mx-auto min-h-[400px] w-full max-w-2xl flex items-center justify-center">
                                                <div className="relative w-80 h-80">
                                                    {/* Animated pulse radar */}
                                                    <div className="absolute inset-0 rounded-full border-4 border-gray-200 animate-pulse"></div>
                                                    <div className="absolute inset-4 rounded-full border-2 border-gray-150 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                                                    <div className="absolute inset-8 rounded-full border-2 border-gray-100 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                                                    <div className="absolute inset-12 rounded-full border-2 border-gray-50 animate-pulse" style={{ animationDelay: '0.9s' }}></div>
                                                    
                                                    {/* Different skeleton labels for variety */}
                                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                                                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                                    </div>
                                                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                                                        <div className="h-3 w-18 bg-gray-200 rounded animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Statistics Skeleton */}
                                        <div className="mt-6 pt-4 border-t border-gray-200">
                                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[1, 2].map((j) => (
                                                    <div key={j} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
                                                        <div className="flex-1">
                                                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                                                            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse"></div>
                                                        </div>
                                                        <div className="text-right ml-3">
                                                            <div className="h-5 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                            <div className="h-4 w-10 bg-gray-100 rounded-full animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
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
                        Reportes de Evaluación Digital
                    </h1>
                    <p className="text-black">
                        Visualiza tus últimas evaluaciones personalizadas organizadas por tipo de evaluación
                    </p>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 ">
                    <Card className="green">
                        <CardContent className="pt-6 ">
                            <div className="flex items-center space-x-8">
                                <BarChart3 className="h-9 w-9 text-emerald-800" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">Formularios Zoom In</p>
                                    <p className="text-2xl font-bold">{zoomInForms.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="green">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-8">
                                <BarChart3 className="h-9 w-9 text-emerald-800" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">Formularios Zoom Out</p>
                                    <p className="text-2xl font-bold">{zoomOutForms.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="green">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-8">
                                <TrendingUp className="h-9 w-9 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-medium text-[#2E6347]">Total de Formularios</p>
                                    <p className="text-2xl font-bold">{zoomInForms.length + zoomOutForms.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Zoom In Forms Section */}
                {zoomInForms.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2E6347] mb-6 flex items-center">
                            <Radar className="h-6 w-6 mr-2 text-[#2E6347]" />
                            Zoom In - Evaluación de Habilidades
                        </h2>
                        <div className="flex flex-col gap-6">
                            {zoomInForms.map((form) => (
                                <div key={form.id} className="min-h-[400px] flex">
                                    <FormRadarChart
                                        title={form.name}
                                        description={`User: ${form.user.name} | Organization: ${form.user.organization} | Avg Score: ${form.stats.avgScore}/5.0`}
                                        data={form.categoryData}
                                        className="w-full"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Zoom Out Forms Section */}
                {zoomOutForms.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2E6347] mb-6 flex items-center">
                            <Radar className="h-6 w-6 mr-2 text-[#2E6347]" />
                            Zoom Out - Evaluación de Capacidades
                        </h2>
                        <div className="flex flex-col gap-6">
                            {zoomOutForms.map((form) => (
                                <div key={form.id} className="min-h-[400px] flex">
                                    <FormRadarChart
                                        title={form.name}
                                        description={`User: ${form.user.name} | Organization: ${form.user.organization} | Avg Score: ${form.stats.avgScore}/5.0`}
                                        data={form.categoryData}
                                        className="w-full"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {zoomInForms.length === 0 && zoomOutForms.length === 0 && (
                    <Card className="green-interactive">
                        <CardContent className="py-12 text-center">
                            <div className="text-[#2E6347]">
                                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-[#2E6347]" />
                                <h3 className="text-lg font-medium mb-2">Sin Reportes Disponibles</h3>
                                <p>Completa algunas evaluaciones de formularios para ver tus gráficas aquí</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
