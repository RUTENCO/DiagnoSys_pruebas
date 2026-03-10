export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Nuevo div para el fondo GIF */}
            <div className="absolute inset-0 background-gif"></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 lg:py-12">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    {/* Description section - Left side */}
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="space-y-4">
                            <h1 className="text-4xl lg:text-6xl font-bold text-emerald-900 tracking-tight leading-tight">
                                DiagnoSys
                            </h1>
                            <p className="text-lg lg:text-2xl font-medium text-teal-700 leading-relaxed">
                                Tu guía para el diagnóstico de transformación digital
                            </p>
                        </div>
                        <div className="space-y-6">
                            <p className="text-base lg:text-lg text-black leading-relaxed max-w-2xl">
                                DiagnoSys es la plataforma web que guía a las organizaciones a través de un proceso estructurado para evaluar su preparación para la transformación digital. Comprende para transformar con propósito.
                            </p>
                            
                            <p className="text-base lg:text-lg text-black leading-relaxed max-w-2xl">
                                Nuestra herramienta te ayuda a mapear capacidades, identificar fuerzas del entorno, priorizar iniciativas estratégicas y generar un plan de acción visual, todo en cinco etapas simples: Zoom In, Zoom Out, Categorización, Priorización y Reporte.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 text-left">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2.5 flex-shrink-0" />
                                <p className="text-sm lg:text-base text-black leading-relaxed">
                                    <span className="font-semibold">Proceso guiado de 5 etapas</span> para un diagnóstico integral y estratégico
                                </p>
                            </div>
                            
                            <div className="flex items-start gap-4 text-left">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2.5 flex-shrink-0" />
                                <p className="text-sm lg:text-base text-black leading-relaxed">
                                    <span className="font-semibold">Interfaz 100% configurable</span> que se adapta a tu sector y contexto
                                </p>
                            </div>
                            
                            <div className="flex items-start gap-4 text-left">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2.5 flex-shrink-0" />
                                <p className="text-sm lg:text-base text-black leading-relaxed">
                                    <span className="font-semibold">Reporte visual y automatizado</span> listo para la toma de decisiones
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Contenedor del formulario de autenticación - Lado derecho (centrado en pantallas pequeñas) */}
                    <div className="flex justify-center">
                        <div className="w-full max-w-md">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}