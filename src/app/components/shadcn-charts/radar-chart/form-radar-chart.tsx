"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/app/components/shadcn-charts/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/app/components/shadcn-charts/chart"

interface CategoryData {
    name: string;
    score: number;
    maxScore: number;
    itemCount: number;
    totalScore: number;
}



interface FormRadarChartProps {
    title: string;
    description?: string;
    data?: CategoryData[];
    className?: string;
    isLoading?: boolean;
}

// Skeleton component for loading state
function RadarChartSkeleton({ title, description, className }: { title: string, description?: string, className?: string }) {
    return (
        <Card className={`${className} bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm`}>
            <CardHeader className="items-center pb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                <CardTitle className="text-lg text-[#2E6347] font-semibold">{title}</CardTitle>
                {description && (
                    <CardDescription className="text-center text-black">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="pb-0 green-interactive">
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
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex justify-between items-center p-4 border border-gray-100 rounded-lg">
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
    );
}

export function FormRadarChart({ title, description, data = [], className, isLoading = false }: FormRadarChartProps & { isLoading?: boolean }) {
    // Show skeleton while loading
    if (isLoading) {
        return <RadarChartSkeleton title={title} description={description} className={className} />;
    }

    // Handle empty data
    if (!data || data.length === 0) {
        return (
            <Card className={`${className} bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-sm`}>
                <CardHeader className="items-center pb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100">
                    <CardTitle className="text-lg text-[#2E6347] font-bold">{title}</CardTitle>
                    {description && (
                        <CardDescription className="text-center text-gray-600">
                            {description}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="pb-0 bg-white">
                    <div className="mx-auto aspect-square max-h-[300px] flex items-center justify-center">
                        <p className="text-gray-500">No data available</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Transform data for radar chart
    // Para radares con menos de 3 categorías, agregamos puntos vacíos para formar el polígono
    let chartData = data.map(category => ({
        category: category.name,
        originalCategory: category.name, // Guardamos el nombre original para el tooltip
        score: category.score,
        maxScore: category.maxScore,
        percentage: Math.round((category.score / category.maxScore) * 100)
    }));

    // Para casos con menos de 3 categorías, necesitamos al menos 3 puntos para formar un polígono
    if (data.length === 1) {
        // Para una sola categoría, mantenemos el punto real y agregamos 2 puntos en posiciones diferentes
        const realPoint = chartData[0];
        const maxScore = realPoint.maxScore;
        
        chartData = [
            realPoint, // El punto real con datos en la primera posición
            {
                category: '', // Punto invisible 1 en segunda posición
                originalCategory: '', 
                score: 0, // Valor 0 para que esté en el centro
                maxScore: maxScore,
                percentage: 0
            },
            {
                category: '', // Punto invisible 2 en tercera posición  
                originalCategory: '', 
                score: 0, // Valor 0 para que esté en el centro
                maxScore: maxScore,
                percentage: 0
            }
        ];
    } else if (data.length === 2) {
        // Para dos categorías, agregamos un punto invisible
        const maxScore = data[0]?.maxScore || 5;
        chartData.push({
            category: '', // Categoría vacía (no se mostrará la etiqueta)
            originalCategory: '', // Sin categoría original
            score: 0, // Valor 0 para formar el polígono
            maxScore: maxScore,
            percentage: 0
        });
    }

    const chartConfig = {
        score: {
            label: "Score",
            color: "#3B82F6", // Azul para los puntos principales
        },
        maxScore: {
            label: "Max Score",
            color: "#6B7280", // Gris para la línea de referencia
        },
    } satisfies ChartConfig;

    // Componente personalizado para los puntos del radar de score (azul)
    const CustomScoreDot = (props: { cx?: number; cy?: number; payload?: { category: string; score: number; maxScore: number; percentage: number }; index?: number }) => {
        const { cx, cy, payload, index } = props;

        // Si la categoría es vacía -> no renderizamos nada
        if (!payload?.category || payload.category.trim() === '') {
            return null;
        }

        // Validaciones seguras de coordenadas
        const validCx = typeof cx === 'number' && !Number.isNaN(cx) ? cx : 0;
        const validCy = typeof cy === 'number' && !Number.isNaN(cy) ? cy : 0;

        // Tamaño del punto según número de categorías
        const pointSize =
            (Array.isArray(data) && data.length === 1) ? 12 :
            (Array.isArray(data) && data.length === 2) ? 8 :
            (Array.isArray(data) && data.length > 15) ? 4 :
            (Array.isArray(data) && data.length > 10) ? 5 : 6;

        return (
            <circle
                cx={validCx}
                cy={validCy}
                r={pointSize}
                fill="#3B82F6"
                stroke="#ffffff"
                strokeWidth={2}
                style={{ pointerEvents: 'none' }}
                key={`score-dot-${payload?.category || 'single'}-${index}`}
            />
        );
    };

    // Componente personalizado para los puntos del radar de maxScore (verde)
    const CustomMaxScoreDot = (props: { cx?: number; cy?: number; payload?: { category: string; score: number; maxScore: number; percentage: number }; index?: number }) => {
        const { cx, cy, payload, index } = props;

        // Si la categoría es vacía -> no renderizamos nada
        if (!payload?.category || payload.category.trim() === '') {
            return null;
        }

        // Validaciones seguras de coordenadas
        const validCx = typeof cx === 'number' && !Number.isNaN(cx) ? cx : 0;
        const validCy = typeof cy === 'number' && !Number.isNaN(cy) ? cy : 0;

        // Tamaño del punto según número de categorías
        const pointSize =
            (Array.isArray(data) && data.length === 1) ? 10 :
            (Array.isArray(data) && data.length === 2) ? 6 :
            (Array.isArray(data) && data.length > 15) ? 3 :
            (Array.isArray(data) && data.length > 10) ? 4 : 5;

        return (
            <circle
                cx={validCx}
                cy={validCy}
                r={pointSize}
                fill="#2E6347"
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ pointerEvents: 'none' }}
                key={`max-score-dot-${payload?.category || 'single'}-${index}`}
            />
        );
    };

    return (
        <Card className={`${className} green-interactive to-gray-50 border border-gray-200 shadow-sm`}>
            <CardHeader className="items-center pb-4 ">
                <CardTitle className="text-lg text-[#2E6347] font-semibold">{title}</CardTitle>
                {description && (
                    <CardDescription className="text-center text-black">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="pb-0 green-interactive">
                <div className="flex flex-col items-center">
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto min-h-[400px] w-full max-w-2xl"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart 
                                data={chartData} 
                                margin={(() => {
                                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                                    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1024;
                                    
                                    if (isMobile) {
                                        return {
                                            top: data.length > 10 ? 60 : 50,
                                            right: data.length > 10 ? 80 : 70,
                                            bottom: data.length > 10 ? 60 : 50,
                                            left: data.length > 10 ? 80 : 70
                                        };
                                    } else if (isTablet) {
                                        return {
                                            top: data.length > 10 ? 80 : 70,
                                            right: data.length > 10 ? 100 : 90,
                                            bottom: data.length > 10 ? 80 : 70,
                                            left: data.length > 10 ? 100 : 90
                                        };
                                    } else {
                                        return {
                                            top: data.length > 10 ? 100 : 80,
                                            right: data.length > 10 ? 140 : 130,
                                            bottom: data.length > 10 ? 100 : 80,
                                            left: data.length > 10 ? 140 : 130
                                        };
                                    }
                                })()}
                                outerRadius={
                                    data.length <= 2 ? 140 : 
                                    data.length <= 5 ? 120 : 
                                    data.length <= 10 ? 100 : 80
                                }
                                cx="50%"
                                cy="50%"
                            >
                                <ChartTooltip 
                                    cursor={false} 
                                    content={<ChartTooltipContent 
                                        indicator="line"
                                        className="green-interactive border border-green-200 shadow-lg rounded-lg p-3 max-w-xs md:max-w-sm"
                                        labelFormatter={(label, payload) => {
                                            // En móviles, mostrar el nombre completo de la categoría
                                            const fullCategoryName = payload?.[0]?.payload?.originalCategory || label;
                                            return (
                                                <div className="text-sm font-semibold text-[#2E6347] mb-2">
                                                    <div className="font-bold text-base">{fullCategoryName}</div>
                                                </div>
                                            );
                                        }}
                                        formatter={(value, name) => {
                                            if (name === 'score') {
                                                return [
                                                    <div key="score" className="flex justify-between items-center w-full min-w-[120px]">
                                                        <span className="text-black font-medium">Score:</span>
                                                        <span className="text-black font-bold ml-3">{value}</span>
                                                    </div>,
                                                    ''
                                                ];
                                            }
                                            if (name === 'maxScore') {
                                                return [
                                                    <div key="maxScore" className="flex justify-between items-center w-full min-w-[120px]">
                                                        <span className="text-black font-medium">Max Score:</span>
                                                        <span className="text-black font-bold ml-3">{value}</span>
                                                    </div>,
                                                    ''
                                                ];
                                            }
                                            if (name === 'percentage') {
                                                return [
                                                    <div key="percentage" className="flex justify-between items-center w-full min-w-[120px]">
                                                        <span className="text-[#2E6347] font-medium">Percentage:</span>
                                                        <span className="text-emerald-600 font-bold ml-3">{value}%</span>
                                                    </div>,
                                                    ''
                                                ];
                                            }
                                            return [value, name];
                                        }}
                                    />} 
                                />
                                <PolarAngleAxis 
                                    dataKey="category" 
                                    className="text-sm font-bold" 
                                    tick={{ 
                                        fontSize: data.length > 15 ? 10 : data.length > 10 ? 11 : 12, 
                                        fill: '#2E6347', 
                                        fontWeight: 700 
                                    }}
                                    tickFormatter={(value) => {
                                        // Si la categoría está vacía (punto invisible), no mostrar nada
                                        if (!value || value.trim() === '') return '';
                                        
                                        // Responsive: nombres completos en pantallas grandes, truncados en pequeñas
                                        if (typeof window !== 'undefined') {
                                            const isMobile = window.innerWidth < 768; // md breakpoint
                                            if (isMobile) {
                                                // En móviles, truncar según número de categorías
                                                const maxLength = data.length > 10 ? 8 : data.length > 5 ? 10 : 12;
                                                return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
                                            }
                                        }
                                        
                                        // En pantallas grandes, mostrar nombres completos
                                        return value;
                                    }}
                                />
                                <PolarGrid 
                                    gridType="polygon" 
                                    radialLines={true}
                                    stroke="#6B7280"
                                    strokeWidth={1.5}
                                    strokeOpacity={0.7}
                                />
                                <Radar
                                    dataKey="score"
                                    stroke="#3B82F6"
                                    fill="#3B82F6"
                                    fillOpacity={0.2}
                                    strokeWidth={data.length > 15 ? 2 : 3}
                                    dot={<CustomScoreDot />}
                                />
                                <Radar
                                    dataKey="maxScore"
                                    stroke="#2E6347"
                                    fill="transparent"
                                    strokeDasharray="5 5"
                                    strokeOpacity={0.6}
                                    strokeWidth={data.length > 15 ? 1 : 2}
                                    dot={<CustomMaxScoreDot />}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
                
                {/* Estadísticas detalladas para todas las gráficas */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-[#2E6347] mb-4">Category Details</h4>
                    <div className={`grid gap-3 ${
                        // Mobile first: siempre 1 columna en móviles
                        data.length <= 3 ? 'grid-cols-1' : 
                        data.length <= 6 ? 'grid-cols-1 md:grid-cols-2' : 
                        data.length <= 12 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}>
                        {data.map((category, index) => (
                            <div key={index} className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg hover:shadow-sm transition-shadow">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-800 text-sm" title={category.name}>
                                        {category.name}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">
                                        <span className="inline-flex items-center">
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                            {category.itemCount} items
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right ml-3">
                                    <div className="text-lg font-bold text-[#2E6347]">
                                        {category.score.toFixed(1)}<span className="text-sm text-gray-500">/{category.maxScore}</span>
                                    </div>
                                    <div className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                        {Math.round((category.score / category.maxScore) * 100)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface ModuleRadarChartProps {
    title: string;
    description?: string;
    modules: {
        name: string;
        avgScore: number;
        completionPercentage: number;
        formsCount: number;
    }[];
    className?: string;
}

export function ModuleRadarChart({ title, description, modules, className }: ModuleRadarChartProps) {
    const chartData = modules.map(module => ({
        module: module.name,
        score: module.avgScore,
        completion: module.completionPercentage,
        maxScore: 5
    }));

    const chartConfig = {
        score: {
            label: "Average Score",
            color: "hsl(142, 76%, 36%)", // Green color matching our theme
        },
        completion: {
            label: "Completion %",
            color: "hsl(142, 76%, 56%)", // Lighter green
        },
    } satisfies ChartConfig;

    return (
        <Card className={className}>
            <CardHeader className="items-center pb-4">
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && (
                    <CardDescription className="text-center">
                        {description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[350px]"
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={chartData}>
                            <ChartTooltip 
                                cursor={false} 
                                content={<ChartTooltipContent 
                                    indicator="line"
                                    className="green-interactive border border-green-200 shadow-lg rounded-lg p-3"
                                    labelFormatter={(label) => (
                                        <span className="text-sm font-semibold text-[#2E6347]">
                                            Module: {label}
                                        </span>
                                    )}
                                    formatter={(value, name) => {
                                        if (name === 'score') {
                                            return [
                                                <div key="score" className="flex justify-between items-center w-full min-w-[120px]">
                                                    <span className="text-gray-700 font-medium">Avg Score:</span>
                                                    <span className="text-[#2E6347] font-bold ml-3">{value}</span>
                                                </div>,
                                                ''
                                            ];
                                        }
                                        if (name === 'completion') {
                                            return [
                                                <div key="completion" className="flex justify-between items-center w-full min-w-[120px]">
                                                    <span className="text-gray-700 font-medium">Completion:</span>
                                                    <span className="text-emerald-600 font-bold ml-3">{value}%</span>
                                                </div>,
                                                ''
                                            ];
                                        }
                                        return [value, name];
                                    }}
                                />} 
                            />
                            <PolarAngleAxis dataKey="module" className="text-xs" />
                            <PolarGrid />
                            <Radar
                                dataKey="score"
                                stroke="var(--color-score)"
                                fill="var(--color-score)"
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                            <Radar
                                dataKey="completion"
                                stroke="var(--color-completion)"
                                fill="var(--color-completion)"
                                fillOpacity={0.1}
                                strokeWidth={2}
                                strokeDasharray="3 3"
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
