"use client";

import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { t } = useLanguage();
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Nuevo div para el fondo GIF */}
            <div className="absolute inset-0 background-gif"></div>

            <div className="absolute top-4 right-4 z-20">
                <LanguageSwitcher />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 lg:py-12">
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                    {/* Description section - Left side */}
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="space-y-4">
                            <h1 className="text-4xl lg:text-6xl font-bold text-emerald-900 tracking-tight leading-tight">
                                {t("app.title")}
                            </h1>
                            <p className="text-lg lg:text-2xl font-medium text-teal-700 leading-relaxed">
                                {t("app.tagline")}
                            </p>
                        </div>
                        <div className="space-y-6">
                            <p className="text-base lg:text-lg text-black leading-relaxed max-w-2xl">
                                {t("app.description1")}
                            </p>
                            
                            <p className="text-base lg:text-lg text-black leading-relaxed max-w-2xl">
                                {t("app.description2")}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 text-left">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2.5 flex-shrink-0" />
                                <p className="text-sm lg:text-base text-black leading-relaxed">
                                    <span className="font-semibold">{t("app.feature1")}</span> {t("app.feature1Desc")}
                                </p>
                            </div>
                            
                            <div className="flex items-start gap-4 text-left">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2.5 flex-shrink-0" />
                                <p className="text-sm lg:text-base text-black leading-relaxed">
                                    <span className="font-semibold">{t("app.feature2")}</span> {t("app.feature2Desc")}
                                </p>
                            </div>
                            
                            <div className="flex items-start gap-4 text-left">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2.5 flex-shrink-0" />
                                <p className="text-sm lg:text-base text-black leading-relaxed">
                                    <span className="font-semibold">{t("app.feature3")}</span> {t("app.feature3Desc")}
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