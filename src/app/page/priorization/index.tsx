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
  categories: {
    id: number;
    name: string;
    items: { id: number; name: string }[];
  }[];
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
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [noteCategoryMap, setNoteCategoryMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const scrollAreaClass = "max-h-[260px] overflow-y-auto overflow-x-visible px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [scrollbar-gutter:stable_both-edges] [&::-webkit-scrollbar]:hidden";
  const hiddenScrollbarClass = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

  const quadrantKeys = ["q1", "q2", "q3", "q4"] as const;

  const isQuadrantKey = (value: string): value is keyof typeof quadrants =>
    quadrantKeys.includes(value as keyof typeof quadrants);

  const getSourceList = (
    sourceId: string,
    localCategories: Category[],
    localQuadrants: typeof quadrants
  ): Note[] | null => {
    if (sourceId.startsWith("category-")) {
      const sourceCategoryId = sourceId.split("-")[1];
      return localCategories.find((c) => c.id === sourceCategoryId)?.notes ?? null;
    }

    if (isQuadrantKey(sourceId)) {
      return localQuadrants[sourceId];
    }

    return null;
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

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
          fetch(saveQuery
            ? `/api/modules/categorization/drag-items?${saveQuery}`
            : "/api/modules/categorization/drag-items"),
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
          ["green-interactive border border-4 border-teal-200", "bg-teal-200"],
          ["green-interactive border border-4 border-orange-200", "bg-orange-200"],
          ["green-interactive border border-4 border-lime-200", "bg-lime-200"],
          ["green-interactive border border-4 border-red-200", "bg-red-200"],
        ];

        const nextNoteCategoryMap: Record<string, string> = {};
        const mappedCategories: Category[] = data.forms.map((form, index) => {
          const [light, dark] = colorPairs[index % colorPairs.length];
          const formIdAsString = form.id.toString();
          return {
            id: formIdAsString,
            title: form.name,
            color: light,
            notes: form.categories.flatMap((cat) =>
              cat.items.map((item) => ({
                id: item.id.toString(),
                name: item.name,
                color: dark, // color para cada tarjetica
              }))
            ),
          };
        });

        mappedCategories.forEach((category) => {
          category.notes.forEach((note) => {
            nextNoteCategoryMap[note.id] = category.id;
          });
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
          setSelectedNoteIds(new Set());
          setNoteCategoryMap(nextNoteCategoryMap);
        } else {
          setCategories(mappedCategories);
          setSelectedNoteIds(new Set());
          setNoteCategoryMap(nextNoteCategoryMap);
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

    const sourceIsCategory = source.droppableId.startsWith("category-");
    const destinationIsCategory = destination.droppableId.startsWith("category-");

    // Evitar mover notas entre categorias distintas (ej: Industria -> Macroeconomicas)
    if (sourceIsCategory && destinationIsCategory && source.droppableId !== destination.droppableId) {
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const newCategories = categories.map((category) => ({
      ...category,
      notes: [...category.notes],
    }));
    const newQuadrants = {
      q1: [...quadrants.q1],
      q2: [...quadrants.q2],
      q3: [...quadrants.q3],
      q4: [...quadrants.q4],
    };

    const sourceList = getSourceList(source.droppableId, newCategories, newQuadrants);
    const destinationList = getSourceList(destination.droppableId, newCategories, newQuadrants);

    if (!sourceList || !destinationList) return;

    const draggedNote = sourceList[source.index];
    if (!draggedNote) return;

    const moveSelectedGroup = selectedNoteIds.has(draggedNote.id);

    // Si el destino es un cuadrante y se arrastra un item seleccionado,
    // mover todos los seleccionados aunque provengan de categorias distintas.
    if (moveSelectedGroup && isQuadrantKey(destination.droppableId)) {
      const destinationKey = destination.droppableId;
      const selectedAcrossBoard = [
        ...newCategories.flatMap((category) => category.notes),
        ...quadrantKeys.flatMap((key) => newQuadrants[key]),
      ].filter((note) => selectedNoteIds.has(note.id));

      const movingNotes = selectedAcrossBoard.length ? selectedAcrossBoard : [draggedNote];
      const movingIds = new Set(movingNotes.map((note) => note.id));

      const destinationBefore = newQuadrants[destinationKey];
      const removedBeforeDestination = destinationBefore
        .slice(0, destination.index)
        .filter((note) => movingIds.has(note.id)).length;

      const destinationIndex = destination.index - removedBeforeDestination;

      newCategories.forEach((category) => {
        category.notes = category.notes.filter((note) => !movingIds.has(note.id));
      });

      quadrantKeys.forEach((key) => {
        newQuadrants[key] = newQuadrants[key].filter((note) => !movingIds.has(note.id));
      });

      const insertAt = Math.max(0, Math.min(destinationIndex, newQuadrants[destinationKey].length));
      newQuadrants[destinationKey].splice(insertAt, 0, ...movingNotes);

      setCategories(newCategories);
      setQuadrants(newQuadrants);
      setSelectedNoteIds((prev) => {
        const next = new Set(prev);
        movingNotes.forEach((note) => next.delete(note.id));
        return next;
      });
      return;
    }

    const selectedInSource = sourceList.filter((note) => selectedNoteIds.has(note.id));
    const movingNotes = moveSelectedGroup && selectedInSource.length ? selectedInSource : [draggedNote];
    const movingIds = new Set(movingNotes.map((note) => note.id));

    // Si se regresa desde cuadrante a categoria, solo permitir volver a su categoria original.
    if (!sourceIsCategory && destinationIsCategory) {
      const destinationCategoryId = destination.droppableId.split("-")[1];
      const allBelongToDestinationCategory = movingNotes.every(
        (note) => noteCategoryMap[note.id] === destinationCategoryId
      );
      if (!allBelongToDestinationCategory) {
        return;
      }
    }

    const removedBeforeDestination =
      source.droppableId === destination.droppableId
        ? sourceList.slice(0, destination.index).filter((note) => movingIds.has(note.id)).length
        : 0;

    const destinationIndex =
      source.droppableId === destination.droppableId
        ? destination.index - removedBeforeDestination
        : destination.index;

    const remainingSource = sourceList.filter((note) => !movingIds.has(note.id));
    sourceList.splice(0, sourceList.length, ...remainingSource);

    const insertAt = Math.max(0, Math.min(destinationIndex, destinationList.length));
    destinationList.splice(insertAt, 0, ...movingNotes);

    setCategories(newCategories);
    setQuadrants(newQuadrants);

    if (isQuadrantKey(destination.droppableId)) {
      setSelectedNoteIds((prev) => {
        const next = new Set(prev);
        movingNotes.forEach((note) => next.delete(note.id));
        return next;
      });
      return;
    }

    if (!moveSelectedGroup) {
      setSelectedNoteIds(new Set([draggedNote.id]));
    }
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
              <h2 className="font-semibold text-green-800 mb-2 text-lg">
                {category.title}
              </h2>
              <Droppable droppableId={`category-${category.id}`}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 ${scrollAreaClass}`}
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
                            className={`px-2.5 py-1.5 text-sm box-border ${note.color} text-gray-700 rounded-md shadow cursor-pointer transition ${
                              selectedNoteIds.has(note.id)
                                ? "ring-2 ring-[#2E6347]"
                                : ""
                            }`}
                            onClick={() => toggleNoteSelection(note.id)}
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
        <div className="relative mx-auto w-full max-w-[800px] pl-14 pb-16 sm:pl-24 sm:pb-20">
          {/* Ejes unidos en L */}
          <div className="absolute left-10 top-5 bottom-12 w-0.5 bg-blue-500 sm:left-20 sm:top-6 sm:bottom-16 sm:w-1" />
          <div className="absolute left-10 right-1 bottom-12 h-0.5 bg-blue-500 sm:left-20 sm:bottom-16 sm:h-1" />
          <svg
            className="absolute left-9 top-2 text-blue-500 sm:left-[72px] sm:top-3"
            width="20"
            height="20"
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <polygon points="6,0 12,10 0,10" fill="currentColor" />
          </svg>
          <svg
            className="absolute -right-1 bottom-[42px] text-blue-500 sm:-right-2 sm:bottom-[55px]"
            width="20"
            height="20"
            viewBox="0 0 12 12"
            aria-hidden="true"
          >
            <polygon points="12,6 0,0 0,12" fill="currentColor" />
          </svg>

          {/* Etiquetas de ejes */}
          <div className="absolute left-0 top-1/4 -translate-y-1/2 w-9 text-right text-sm font-semibold leading-4 text-green-800 sm:-left-2 sm:w-16 sm:text-xl sm:leading-6">
            Alto
            <br />
            Impacto
          </div>
          <div className="absolute left-0 top-[70%] -translate-y-1/2 w-8 text-right text-sm font-semibold leading-4 text-green-800 sm:-left-2 sm:top-[68%] sm:w-16 sm:text-xl sm:leading-6">
            Bajo
            <br />
            Impacto
          </div>
          <div className="absolute bottom-0 left-10 right-2 grid grid-cols-2 sm:left-20">
            <div className="text-center text-lg font-semibold leading-5 text-green-800 sm:text-xl sm:leading-6">
              Baja
              <br />
              Urgencia
            </div>
            <div className="text-center text-lg font-semibold leading-5 text-green-800 sm:text-xl sm:leading-6">
              Alta
              <br />
              Urgencia
            </div>
          </div>

          {/* Cuadrantes */}
          <div className="grid grid-cols-2 grid-rows-2 gap-1 sm:gap-2 p-1 sm:p-2">
            {(
              [
                {
                  id: "q2",
                  title: "Prioridad media",
                  border: "border-yellow-200",
                },
                {
                  id: "q1",
                  title: "Alta prioridad",
                  border: "border-emerald-600",
                },
                {
                  id: "q3",
                  title: "Baja prioridad",
                  border: "border-red-400",
                },
                {
                  id: "q4",
                  title: "Prioridad media",
                  border: "border-yellow-200",
                },
              ] as const
            ).map((q) => (
              <Droppable key={q.id} droppableId={q.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`green-interactive border-2 sm:border-4 ${q.border} min-h-40 sm:min-h-[200px] flex flex-col p-2.5 sm:p-4 relative`}
                  >
                    <h3 className="text-xl sm:text-2xl font-semibold text-green-800 mb-2 sm:mb-3">
                      {q.title}
                    </h3>
                    <div
                      className={`flex flex-col gap-2 px-1 py-1 ${hiddenScrollbarClass} ${
                        quadrants[q.id as keyof typeof quadrants].length > 5
                          ? "max-h-[170px] sm:max-h-[230px] overflow-y-auto overflow-x-visible"
                          : "overflow-visible"
                      }`}
                    >
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
                              className={`px-2 py-1 text-xs sm:px-2.5 sm:py-1.5 sm:text-sm box-border ${note.color} rounded-md shadow text-gray-700 cursor-pointer transition ${
                                selectedNoteIds.has(note.id)
                                  ? "ring-2 ring-inset ring-[#2E6347]"
                                  : ""
                              }`}
                              onClick={() => toggleNoteSelection(note.id)}
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
