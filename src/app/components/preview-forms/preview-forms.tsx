'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import styles from "./preview-forms.module.css";
import { CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Category {
    id: string;
    name: string;
    items: Item[];
}

interface Item {
    id: string;
    name: string;
}

interface Module {
    id: number;
    name: string;
    description: string;
}

interface Form {
    id: string;
    name: string;
    description: string;
    tag: string | null;
    categories: Category[];
    isCompleted?: boolean;
    completedAt?: string | null;
}

interface FormCardProps {
    id: string;
    title: string;
    description: string;
    categories: number;
    items: number;
    tag: string;
    isCompleted: boolean;
    completedAt?: string | null;
}

interface PreviewFormsProps {
    moduleName?: string;
    moduleId?: number;
}

// 1. Definimos el orden de las rutas
const STEPS = ["zoom-in", "zoom-out", "categorization", "prioritization", "reports"];

export default function PreviewForms({ moduleName, moduleId }: PreviewFormsProps) {
    const [forms, setForms] = useState<FormCardProps[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const contextParams = new URLSearchParams(searchParams.toString());
    const contextQuery = contextParams.toString();
    const withContext = (path: string) =>
        contextQuery ? `${path}${path.includes("?") ? "&" : "?"}${contextQuery}` : path;
    const pathParts = pathname.split("/").filter(Boolean);
    const reportIndex = pathParts.indexOf("report");
    const reportId = reportIndex !== -1 ? pathParts[reportIndex + 1] : null;

    const completedFormId = searchParams.get("completedFormId");
    const completedModule = searchParams.get("completedModule");
    const currentStep = pathname.split("/").filter(Boolean).pop();
    const activeCompletedFormId =
        completedFormId && (!completedModule || completedModule === currentStep)
            ? completedFormId
            : null;

    const isFormCompleted = (form: FormCardProps) =>
        form.isCompleted || activeCompletedFormId === String(form.id);

    const allFormsCompleted =
        forms.length > 0 && forms.every((form) => isFormCompleted(form));

    useEffect(() => {
        const fetchForms = async () => {
            try {
                setLoading(true);
                let moduleToUse: Module | null = null;

                if (moduleId) {
                    const response = await fetch(`/api/modules/${moduleId}`);
                    if (!response.ok) throw new Error("Failed to fetch module by ID");
                    const moduleData = await response.json();
                    moduleToUse = moduleData.module;
                } else if (moduleName) {
                    const modulesResponse = await fetch("/api/modules");
                    if (!modulesResponse.ok) throw new Error("Failed to fetch modules");

                    const modulesData = await modulesResponse.json();
                    moduleToUse = modulesData.modules.find(
                        (m: Module) => m.name === moduleName
                    );

                    if (!moduleToUse)
                        throw new Error(`Module "${moduleName}" not found`);
                } else {
                    throw new Error("No module name or ID provided");
                }

                if (!moduleToUse) throw new Error("Module not found");

                const formsEndpoint = contextQuery
                    ? `/api/modules/${moduleToUse.id}/forms?${contextQuery}`
                    : `/api/modules/${moduleToUse.id}/forms`;
                const endpointParams = new URLSearchParams(formsEndpoint.split("?")[1] || "");

                if (reportId) {
                    endpointParams.set("reportId", reportId);
                }

                const endpointBase = `/api/modules/${moduleToUse.id}/forms`;
                const finalEndpoint = endpointParams.toString()
                    ? `${endpointBase}?${endpointParams.toString()}`
                    : endpointBase;

                const response = await fetch(finalEndpoint);
                if (!response.ok) throw new Error("Failed to fetch forms");

                const formsData = await response.json();
                const data: Form[] = formsData.forms || [];

                const transformedForms: FormCardProps[] = data.map((form) => {
                    const totalItems = form.categories.reduce(
                        (sum, category) => sum + category.items.length,
                        0
                    );
                    return {
                        id: form.id,
                        title: form.name,
                        description: form.description,
                        categories: form.categories.length,
                        items: totalItems,
                        tag: form.tag || "General",
                        isCompleted: Boolean(form.isCompleted),
                        completedAt: form.completedAt || null,
                    };
                });

                setForms(transformedForms);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchForms();
    }, [moduleName, moduleId, contextQuery, reportId]);

    const handleStartEvaluation = (formId: string) => {
        const pathParts = pathname.split("/").filter(Boolean);
        const reportIndex = pathParts.indexOf("report");
        const reportId = reportIndex !== -1 ? pathParts[reportIndex + 1] : null;

        if (pathname.includes('/admin/')) {
            // Para admin, redirigir al preview del formulario base
            if (moduleName === 'Zoom In') {
                router.push(`/dashboard/admin/zoom-in/forms/${formId}`);
            } else if (moduleName === 'Zoom Out') {
                router.push(`/dashboard/admin/zoom-out/forms/${formId}`);
            } else {
                router.push(`/dashboard/admin/forms/${formId}`);
            }
        } else if (pathname.includes('/consultant/')) {
            // Para consultant, usar las rutas de consultor
            if (moduleName === 'Zoom In') {
                router.push(withContext(`/dashboard/consultant/zoom-in/forms/${formId}`));
            } else if (moduleName === 'Zoom Out') {
                router.push(withContext(`/dashboard/consultant/zoom-out/forms/${formId}`));
            } else {
                router.push(withContext(`/dashboard/consultant/forms/${formId}`));
            }
        } else {
            // Para organization, usar las rutas de organización
            if (!reportId) {
                setError("No se encontró reportid en la ruta actual.");
                return;
            }

            if (moduleName === 'Zoom In') {
                router.push(`/dashboard/organization/report/${reportId}/zoom-in/forms/${formId}`);
            } else if (moduleName === 'Zoom Out') {
                router.push(`/dashboard/organization/report/${reportId}/zoom-out/forms/${formId}`);
            } else {
                router.push(`/dashboard/organization/report/${reportId}/forms/${formId}`);
            }
        }
    };

    const handleNext = () => {
        if (!allFormsCompleted) {
            return;
        }

        // 2. Extraemos el prefijo (ej: /dashboard/organization) y la página actual
        const pathParts = pathname.split("/");
        const currentPage = pathParts.pop(); // "zoom-in"
        const prefix = pathParts.join("/"); // "/dashboard/organization"

        // 3. Buscamos el índice de la página actual en nuestro array de pasos
        const currentIndex = STEPS.indexOf(currentPage || "");

        // 4. Lógica de redirección
        if (currentIndex !== -1 && currentIndex < STEPS.length - 1) {
            // Si hay un siguiente paso en la lista, vamos allá
            const nextPage = STEPS[currentIndex + 1];
            router.push(withContext(`${prefix}/${nextPage}`));
        } else {
            // Si es el último paso (reports) o no está en la lista, vuelve al inicio
            router.push(withContext(`/dashboard/consultant/diagnostics`));
        }
    };

    const handleBack = () => {
        const pathParts = pathname.split("/");
        const currentPage = pathParts.pop();
        const prefix = pathParts.join("/");
        const roleSegment = pathname.split("/")[2] || "consultant";

        const currentIndex = STEPS.indexOf(currentPage || "");

        if (currentIndex > 0) {
            const previousPage = STEPS[currentIndex - 1];
            router.push(withContext(`${prefix}/${previousPage}`));
            return;
        }

        if (prefix.includes("/report/")) {
            if (roleSegment === "organization") {
                router.push(withContext(`/dashboard/organization/report`));
            } else {
                router.push(withContext(`/dashboard/${roleSegment}/reports`));
            }
            return;
        }

        router.push(withContext(`/dashboard/${roleSegment}/diagnostics`));
    };


    if (loading) {
        return (
            <div className={styles.container}>
                <h2 className={styles.title}>Formularios de Evaluación</h2>
                <p className={styles.subtitle}>
                    Cargando formularios, por favor espere...
                </p>
                <div className={styles.grid}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={`${styles.card} ${styles.skeletonCard}`}>
                            <div className={styles.skeletonHeaderRow}>
                                <div className={styles.skeletonHeaderLeft}></div>
                                <div className={styles.skeletonTag}></div> {/* <-- skeleton del tag */}
                            </div>

                            <div className={styles.skeletonLine}></div>
                            <div className={styles.skeletonLine}></div>
                            <div className={styles.skeletonMeta}></div>
                            <div className={styles.skeletonButton}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <p>Error: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>Formularios de Evaluación</h2>
            <p className={styles.subtitle}>
                Completa los formularios para evaluar diferentes aspectos organizacionales
            </p>

            <div className={styles.grid}>
                {forms.map((form) => {
                    const isCompleted = isFormCompleted(form);

                    return (
                    <div
                        key={form.id}
                        className={`${styles.card} ${isCompleted ? styles.completedCard : ""}`}
                    >
                        <div className={styles.cardContent}>
                            <div className={styles.header}>
                                <div className={styles.headerLeft}>
                                    <FileText className={styles.icon} />
                                    <h3 className={styles.titleCard}>{form.title}</h3>
                                </div>
                                <div className={styles.headerStatus}>
                                    <span className={styles.tag}>{form.tag}</span>
                                </div>
                            </div>
                            <p className={styles.description}>{form.description}</p>
                        </div>

                        <div className={styles.metaFloatingRow}>
                            <p className={styles.meta}>
                                {form.categories} categorías • {form.items} ítems
                            </p>
                            {isCompleted && (
                                <div className={styles.completionMarker} title="Formulario completado">
                                    <CheckCircle2 size={20} />
                                </div>
                            )}
                        </div>

                        <button
                            className={`${styles.button} ${isCompleted ? styles.completedButton : ""}`}
                            onClick={() => handleStartEvaluation(form.id)}
                        >
                            {isCompleted ? "Evaluación completada" : "Iniciar Evaluación"}
                        </button>
                    </div>
                )})}
            </div>
            <div className={styles.navigationButtons}>
                <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleBack}
                >
                    Atrás
                </Button>
                <Button
                    variant="default"
                    size="lg"
                    onClick={handleNext}
                    disabled={!allFormsCompleted}
                >
                    Siguiente
                </Button>
            </div>
        </div>
    );
}
