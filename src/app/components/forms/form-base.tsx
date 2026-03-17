"use client";

import React, { useState, useEffect } from "react";
import styles from "./form-base.module.css";
import { useRouter, useSearchParams } from "next/navigation";

interface Item {
    id: number;
    name: string;
    selected: boolean;
    rating?: number;
}

interface Category {
    id: number;
    title: string;
    items: Item[];
}

interface ApiItem {
    id: number;
    name: string;
}

interface ApiCategory {
    id: number;
    name: string;
    items: ApiItem[];
}

interface ApiForm {
    id: number;
    name: string;
    description: string;
    tag: string | null;
    categories: ApiCategory[];
}

interface FormBaseProps {
    formId: string;
}

const FormBase: React.FC<FormBaseProps> = ({ formId }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<ApiForm | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [currentCatId, setCurrentCatId] = useState<number | null>(null);
    const [errorModal, setErrorModal] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const organizationId = searchParams.get("organizationId");

    // Load real data from the API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/forms/${formId}`);
                if (!res.ok) {
                    throw new Error(`Error ${res.status}: ${res.statusText}`);
                }
                const response = await res.json();
                const data: ApiForm = response.form;
                if (!data) {
                    throw new Error("No form data found");
                }
                setFormData(data);
                // Map API data to the component’s structure
                const mappedCategories: Category[] = data.categories?.map((cat) => ({
                    id: cat.id,
                    title: cat.name || "Categoría sin título",
                    items: cat.items?.map((item) => ({
                        id: item.id,
                        name: item.name || "Ítem sin nombre",
                        selected: false,
                        rating: undefined,
                    })) || [],
                })) || [];
                setCategories(mappedCategories);
            } catch (err) {
                console.error("Error loading data:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };
        if (formId) {
            fetchData();
        }
    }, [formId]);

    const handleSelectItem = (catId: number, itemId: number) => {
        setCategories((prev) =>
            prev.map((cat) =>
                cat.id === catId
                    ? {
                        ...cat,
                        items: cat.items.map((item) =>
                            item.id === itemId
                                ? {
                                    ...item,
                                    selected: !item.selected,
                                    rating: !item.selected ? item.rating : undefined,
                                }
                                : item
                        ),
                    }
                    : cat
            )
        );
    };

    const handleRating = (catId: number, itemId: number, rating: number) => {
        setCategories((prev) =>
            prev.map((cat) =>
                cat.id === catId
                    ? {
                        ...cat,
                        items: cat.items.map((item) =>
                            item.id === itemId && item.selected
                                ? {
                                    ...item,
                                    rating: item.rating === rating ? undefined : rating,
                                }
                                : item
                        ),
                    }
                    : cat
            )
        );
    };

    const handleDeleteItem = (catId: number, itemId: number) => {
        setCategories((prev) =>
            prev.map((cat) =>
                cat.id === catId
                    ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
                    : cat
            )
        );
    };

    const openModal = (catId: number) => {
        setCurrentCatId(catId);
        setShowModal(true);
    };

    const handleAddItem = async () => {
        if (!newItemName.trim() || currentCatId === null) return;

        // Crear item temporal con ID negativo para identificarlo como nuevo
        const tempId = -(Date.now()); // ID negativo único basado en timestamp

        // Agregar el nuevo item al estado local inmediatamente
        setCategories((prev) =>
            prev.map((cat) =>
                cat.id === currentCatId
                    ? {
                        ...cat,
                        items: [
                            ...cat.items,
                            {
                                id: tempId,
                                name: newItemName.trim(),
                                selected: true,
                                rating: undefined,
                            },
                        ],
                    }
                    : cat
            )
        );

        setNewItemName("");
        setShowModal(false);
    };

    const completedCategories = categories.filter((cat) =>
        cat.items.some((i) => i.selected && i.rating)
    ).length;

    const handleSubmit = async () => {
        // Validar que al menos una categoría tenga items seleccionados y puntuados
        const categoriesWithSelectedItems = categories.filter((cat) =>
            cat.items.some((item) => item.selected && item.rating !== undefined)
        );

        if (categoriesWithSelectedItems.length === 0) {
            setErrorModal("Por favor selecciona y califica al menos un item en cualquier categoría.");
            return;
        }

        // Validar que todos los items seleccionados tengan rating
        const itemsWithoutRating = categories.flatMap((cat) =>
            cat.items.filter((i) => i.selected && i.rating === undefined)
        );

        if (itemsWithoutRating.length > 0) {
            setErrorModal("Por favor asigna una calificación a todos los items seleccionados.");
            return;
        }

        // Crear estructura de datos por categorías
        const selectedCategories = categoriesWithSelectedItems.map((cat) => {
            const selectedItems = cat.items
                .filter((item) => item.selected && item.rating !== undefined)
                .map((item) => ({
                    itemId: item.id,
                    score: item.rating!,
                    isNew: item.id < 0, // Los items nuevos tendrán ID negativo
                    name: item.name // Incluir nombre para todos los items
                }));

            return {
                categoryId: cat.id,
                name: cat.title, // Usar cat.title que es la propiedad correcta
                selectedItems
            };
        });

        const payload = {
            selectedCategories
        };

        console.log('Submitting form:', {
            formId,
            categoriesCount: selectedCategories.length,
            totalItems: selectedCategories.reduce((sum, cat) => sum + cat.selectedItems.length, 0),
            payload
        });

        try {
            const completeEndpoint = organizationId
                ? `/api/forms/${formId}/complete?organizationId=${organizationId}`
                : `/api/forms/${formId}/complete`;

            const res = await fetch(completeEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || `Error ${res.status}: ${res.statusText}`);
            }

            setErrorModal(`${responseData.message} 
            
📊 Resumen:
• Categorías evaluadas: ${responseData.data.summary.categoriesEvaluated}
• Items evaluados: ${responseData.data.summary.totalItemsEvaluated}
• Nuevos items creados: ${responseData.data.summary.newItemsCreated}`);
        } catch (err) {
            console.error("Error submitting form:", err);
            setErrorModal(err instanceof Error ? err.message : "Error al enviar la evaluación. Por favor intenta de nuevo.");
        }
    };

    // Skeleton Loading
    if (loading) {
        return (
            <div className={`${styles.container} ${styles.loadingWrapper}`}>
                <div className={styles.loadingText}>
                    <h3>Cargando formulario, por favor espere...</h3>
                </div>
                <div className={styles.skeletonHeader}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonText}></div>
                    <div className={styles.skeletonTag}></div>
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className={styles.skeletonCard}>
                        <div className={styles.skeletonCategoryTitle}></div>
                        {[1, 2, 3].map((j) => (
                            <div key={j} className={styles.skeletonItem}></div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <p>Error al cargar el formulario: {error}</p>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className={styles.container}>
                <p>Formulario no encontrado</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{formData.name}</h2>
                <p className={styles.description}>{formData.description}</p>
                {formData.tag && <span className={styles.tag}>{formData.tag}</span>}
            </div>

            <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{
                            width: `${categories.length > 0
                                ? (completedCategories / categories.length) * 100
                                : 0
                                }%`,
                        }}
                    ></div>
                </div>
                <span className={styles.progressText}>
                    {completedCategories}/{categories.length} categorías completadas
                </span>
            </div>

            {categories.map((cat) => (
                <div key={cat.id} className={styles.categoryCard}>
                    <div className={styles.categoryHeader}>
                        <h3 className={styles.categoryTitle}>{cat.title}</h3>
                        <button
                            className={styles.addItemButton}
                            onClick={() => openModal(cat.id)}
                        >
                            + Agregar ítem
                        </button>
                    </div>
                    <div className={styles.categorySeparator}></div>
                    {cat.items.map((item) => (
                        <div key={item.id} className={styles.itemCard}>
                            <div className={styles.itemLabel}>
                                <input
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => handleSelectItem(cat.id, item.id)}
                                />
                                <span>{item.name}</span>
                            </div>
                            <div className={styles.itemActions}>
                                <div className={styles.ratingButtons}>
                                    {item.selected &&
                                        [1, 2, 3, 4, 5].map((rating) => (
                                            <button
                                                key={rating}
                                                className={`${styles.ratingButton} ${item.rating === rating ? styles.active : ""
                                                    }`}
                                                onClick={() => handleRating(cat.id, item.id, rating)}
                                            >
                                                {rating}
                                            </button>
                                        ))}
                                </div>
                                <button
                                    className={styles.deleteButton}
                                    onClick={() => handleDeleteItem(cat.id, item.id)}
                                    title="Eliminar item"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            <div className={styles.buttonGroup}>
                <button className={styles.backButton} onClick={() => router.back()}>
                    Atrás
                </button>
                <button className={styles.submitButton} onClick={handleSubmit}>
                    Enviar evaluación
                </button> 
                
            </div>

            {/* Modal for adding items */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h4>Agregar nuevo item</h4>
                        <input
                            type="text"
                            value={newItemName}
                            placeholder="Ingresa el nombre del nuevo item"
                            onChange={(e) => setNewItemName(e.target.value)}
                            className={styles.modalInput}
                        />
                        <div className={styles.modalActions}>
                            <button onClick={handleAddItem} className={styles.confirmButton}>
                                Agregar
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className={styles.cancelButton}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Modal de Error/Éxito === */}
            {errorModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.errorModal}>
                        <p>{errorModal}</p>
                        <button
                            className={styles.confirmButton}
                            onClick={() => setErrorModal(null)}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormBase;
