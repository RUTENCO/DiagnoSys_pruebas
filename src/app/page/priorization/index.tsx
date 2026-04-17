"use client";

import React, { useState, useEffect } from "react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/components/forms/form-base.module.css";

interface Note {
  id: string;
  name: string;
  color: string; // Mantiene para estilo visual
}

interface Category {
  id: string;
  title: string;
  notes: Note[];
  color: string; // color visual de fondo del contenedor
}

interface FormResponse {
  id: number;
  name: string;
  categories: { id: number; name: string }[];
}

interface SavedNote {
  name: string;
}

interface SavedPrioritizationResponse {
  hasData: boolean;
  highPriority: SavedNote[];
  mediumPriority: SavedNote[];
  lowPriority: SavedNote[];
  mediumPriority2: SavedNote[];
}

function PriorityQuadrantsContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const contextParams = new URLSearchParams(searchParams.toString());
  const contextQuery = contextParams.toString();
  const withContext = (path: string) =>
    contextQuery ? `${path}${path.includes("?") ? "&" : "?"}${contextQuery}` : path;

  const organizationId = searchParams.get("organizationId");

  const pathParts = pathname.split("/").filter(Boolean);
  const reportIndex = pathParts.indexOf("report");
  const reportIdFromPath = reportIndex !== -1 ? pathParts[reportIndex + 1] : null;
  const roleSegment = pathParts[1] || "consultant";
  const stepBasePath =
    reportIndex !== -1 && pathParts[reportIndex + 1]
      ? `/${pathParts.slice(0, reportIndex + 2).join("/")}`
      : `/dashboard/${roleSegment}`;

  const prioritizationBackPath = withContext(`${stepBasePath}/categorization`);
  const reportsPath = withContext(`${stepBasePath}/reports`);
  const withScopeContext = (path: string) => {
    const params = new URLSearchParams();
    if (organizationId) params.set("organizationId", organizationId);
    if (reportIdFromPath) params.set("reportId", reportIdFromPath);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [feedbackModal, setFeedbackModal] = useState<string | null>(null);
  const [nextPathAfterModal, setNextPathAfterModal] = useState<string | null>(null);
  const [quadrants, setQuadrants] = useState<{
    q1: Note[];
    q2: Note[];
    q3: Note[];
    q4: Note[];
  }>({
    q1: [],
    q2: [],
    q3: [],
    q4: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const saveParams = new URLSearchParams();
        if (organizationId) saveParams.set("organizationId", organizationId);
        if (reportIdFromPath) saveParams.set("reportId", reportIdFromPath);
        const saveQuery = saveParams.toString();
        const saveEndpoint = saveQuery
          ? `/api/modules/priorization/save?${saveQuery}`
          : "/api/modules/priorization/save";

        const [formsRes, savedRes] = await Promise.all([
          fetch("/api/modules/2/forms"),
          fetch(saveEndpoint, {
            cache: "no-store",
          }),
        ]);

        if (!formsRes.ok) throw new Error("Failed to fetch forms");

        const data: { forms: FormResponse[] } = await formsRes.json();
        const savedData: SavedPrioritizationResponse | null = savedRes.ok
          ? await savedRes.json()
          : null;

        // Colores solo para mostrar (no se guardan en BD)
        const colorPairs: [string, string][] = [
          ["green-interactive border border-2 border-red-300", "bg-red-300"],
          ["green-interactive border border-2 border-green-300", "bg-green-300"],
          ["green-interactive border border-2 border-yellow-200", "bg-yellow-200"],
          ["green-interactive border border-2 border-blue-300", "bg-blue-300"],
        ];

        const mappedCategories: Category[] = data.forms.map((form, index) => {
          const [light, dark] = colorPairs[index % colorPairs.length];
          return {
            id: form.id.toString(),
            title: form.name,
            color: light,
            notes: form.categories.map((cat) => ({
              id: cat.id.toString(),
              name: cat.name,
              color: dark, // color para cada tarjetica
            })),
          };
        });

        if (savedData?.hasData) {
          const categoriesCopy = mappedCategories.map((category) => ({
            ...category,
            notes: [...category.notes],
          }));

          const notesByName = new Map<string, Note[]>();
          categoriesCopy.forEach((category) => {
            category.notes.forEach((note) => {
              const current = notesByName.get(note.name) ?? [];
              notesByName.set(note.name, [...current, note]);
            });
          });

          const takeNotes = (items: SavedNote[]) =>
            items
              .map((item) => {
                const candidates = notesByName.get(item.name);
                if (!candidates?.length) return null;
                const [first, ...rest] = candidates;
                notesByName.set(item.name, rest);
                return first;
              })
              .filter((note): note is Note => Boolean(note));

          const restoredQuadrants = {
            q1: takeNotes(savedData.highPriority),
            q2: takeNotes(savedData.mediumPriority),
            q3: takeNotes(savedData.lowPriority),
            q4: takeNotes(savedData.mediumPriority2),
          };

          const usedIds = new Set(
            [
              ...restoredQuadrants.q1,
              ...restoredQuadrants.q2,
              ...restoredQuadrants.q3,
              ...restoredQuadrants.q4,
            ].map((note) => note.id)
          );

          const remainingCategories = categoriesCopy.map((category) => ({
            ...category,
            notes: category.notes.filter((note) => !usedIds.has(note.id)),
          }));

          setQuadrants(restoredQuadrants);
          setCategories(remainingCategories);
        } else {
          setCategories(mappedCategories);
        }
      } catch (err) {
        console.error("Error fetching forms", err);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [organizationId, reportIdFromPath]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const newCategories = [...categories];
    const newQuadrants = { ...quadrants };
    let draggedNote: Note | null = null;

    if (source.droppableId.startsWith("category-")) {
      const sourceCategoryId = source.droppableId.split("-")[1];
      const sourceCategory = newCategories.find((c) => c.id === sourceCategoryId);
      if (!sourceCategory) return;
      [draggedNote] = sourceCategory.notes.splice(source.index, 1);
    } else if (source.droppableId.startsWith("q")) {
      const key = source.droppableId as keyof typeof quadrants;
      [draggedNote] = newQuadrants[key].splice(source.index, 1);
    }

    if (!draggedNote) return;

    if (destination.droppableId.startsWith("category-")) {
      const destCategoryId = destination.droppableId.split("-")[1];
      const destCategory = newCategories.find((c) => c.id === destCategoryId);
      if (!destCategory) return;
      destCategory.notes.splice(destination.index, 0, draggedNote);
    } else if (destination.droppableId.startsWith("q")) {
      const key = destination.droppableId as keyof typeof quadrants;
      newQuadrants[key].splice(destination.index, 0, draggedNote);
    }

    setCategories(newCategories);
    setQuadrants(newQuadrants);
  };

  if (loading)
    return <p className="text-center mt-10 text-gray-500">Cargando datos...</p>;

  const allNotes = categories.flatMap((c) => c.notes);
  const allDestNotes = [
    ...quadrants.q1,
    ...quadrants.q2,
    ...quadrants.q3,
    ...quadrants.q4,
  ];
  const allAssigned = allNotes.length === 0 && allDestNotes.length > 0;

  const handleSave = async () => {
    const stripColor = (arr: Note[]) => arr.map(({ id, name }) => ({ id, name }));
    const payload = {
      highPriority: stripColor(quadrants.q1),
      mediumPriority: stripColor(quadrants.q2),
      lowPriority: stripColor(quadrants.q3),
      mediumPriority2: stripColor(quadrants.q4),
    };

    try {
      const res = await fetch(withScopeContext("/api/modules/priorization/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error saving data");
      setFeedbackModal("Datos guardados exitosamente ✅");
      setNextPathAfterModal(reportsPath);
    } catch (err) {
      console.error(err);
      setFeedbackModal("Error saving data ❌");
      setNextPathAfterModal(null);
    }
  };

  const handleCloseModal = () => {
    const targetPath = nextPathAfterModal;
    setFeedbackModal(null);
    setNextPathAfterModal(null);

    if (targetPath) {
      router.push(targetPath);
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-[#2E6347]">
        Zoom Out: Matriz de Priorizaci&#xF3;n
      </h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Categorías iniciales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {categories.map((category) => (
            <div
              key={category.id}
              className={`${category.color} rounded-xl p-4 shadow-md`}
            >
              <h2 className="font-semibold text-gray-800 mb-2 text-lg">
                {category.title}
              </h2>
              <Droppable droppableId={`category-${category.id}`}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex flex-wrap gap-2"
                  >
                    {category.notes.map((note, index) => (
                      <Draggable
                        key={note.id}
                        draggableId={note.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`px-3 py-2 ${note.color} text-gray-700 rounded-md shadow cursor-pointer`}
                          >
                            {note.name}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>

        {/* MATRIZ DE 4 CUADRANTES */}
        <div className="relative w-full md:w-[800px] mx-auto">
          {/* Ejes */}
          <div className="absolute -left-32 top-1/2 -translate-y-1/2 -rotate-90 text-gray-700 font-bold">
            Bajo Impacto - Alto Impacto
          </div>
          <div className="absolute bottom-0 left-1/2 translate-x-[-50%] translate-y-8 text-gray-700 font-bold min-w-max">
            Baja urgencia - Alta urgencia
          </div>

          {/* Cuadrantes */}
          <div className="grid grid-cols-2 grid-rows-2 border border-gray-500">
            {(
              [
                { id: "q2", title: "Prioridad media", border: "border-yellow-300" },
                { id: "q1", title: "Alta prioridad", border: "border-green-400" },
                { id: "q3", title: "Baja prioridad", border: "border-red-500" },
                { id: "q4", title: "Prioridad media", border: "border-yellow-300" },
              ] as const
            ).map((q) => (
              <Droppable key={q.id} droppableId={q.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`green-interactive border-4 ${q.border} min-h-[200px] flex flex-col items-center justify-center p-4 relative`}
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {q.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quadrants[q.id as keyof typeof quadrants].map((note, index) => (
                        <Draggable
                          key={note.id}
                          draggableId={note.id}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`px-3 py-2 ${note.color} rounded-md shadow text-gray-700`}
                            >
                              {note.name}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </div>
      </DragDropContext>

      <div className="flex flex-col sm:flex-row items-center justify-center w-full mt-12 gap-4 sm:gap-6">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push(prioritizationBackPath)}
          className="w-full max-w-[300px]"
        >
          Atrás
        </Button>
        <Button
          variant="default"
          size="lg"
          onClick={handleSave}
          disabled={!allAssigned}
          className="w-full max-w-[300px]"
        >
          Siguiente
        </Button>
      </div>

      {/* Modal */}
      {feedbackModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.errorModal}>
            <p>{feedbackModal}</p>
            <button
              className={styles.confirmButton}
              onClick={handleCloseModal}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PriorityQuadrants() {
  return (
    <Suspense fallback={<p className="text-center mt-10 text-gray-500">Loading data...</p>}>
      <PriorityQuadrantsContent />
    </Suspense>
  );
}
