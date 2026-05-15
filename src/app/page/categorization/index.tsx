"use client";

import React, { useState, useEffect } from "react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/components/forms/form-base.module.css";

interface Note {
  id: string;
  name: string;
  color: string;
}

interface Category {
  id: string;
  title: string;
  color: string;
  notes: Note[];
}

interface FormResponse {
  id: number;
  name: string;
  categories: {
    id: number;
    name: string;
    items: {
      id: number;
      name: string;
    }[];
  }[];
}

interface SavedNote {
  name: string;
}

interface SavedCategorizationResponse {
  hasData: boolean;
  opportunities: SavedNote[];
  needs: SavedNote[];
  problems: SavedNote[];
}

function ZoomOutCategorizationContent() {
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

  const categorizationBackPath = withContext(`${stepBasePath}/zoom-out`);
  const categorizationNextPath = withContext(`${stepBasePath}/prioritization`);
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
  const [destinations, setDestinations] = useState<{
    opportunities: Note[];
    needs: Note[];
    problems: Note[];
  }>({
    opportunities: [],
    needs: [],
    problems: [],
  });
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [noteCategoryMap, setNoteCategoryMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const scrollAreaClass = "max-h-[260px] overflow-y-auto overflow-x-visible [scrollbar-width:none] [-ms-overflow-style:none] [scrollbar-gutter:stable_both-edges] [&::-webkit-scrollbar]:hidden";

  const destinationKeys = ["opportunities", "needs", "problems"] as const;

  const isDestinationKey = (value: string): value is keyof typeof destinations =>
    destinationKeys.includes(value as keyof typeof destinations);

  const getSourceList = (
    sourceId: string,
    localCategories: Category[],
    localDestinations: typeof destinations
  ): Note[] | null => {
    if (sourceId.startsWith("category-")) {
      const sourceCategoryId = sourceId.split("-")[1];
      return localCategories.find((c) => c.id === sourceCategoryId)?.notes ?? null;
    }

    if (isDestinationKey(sourceId)) {
      return localDestinations[sourceId];
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
          ? `/api/modules/categorization/save?${saveQuery}`
          : "/api/modules/categorization/save";

        const [formsRes, savedRes] = await Promise.all([
          fetch(saveQuery
            ? `/api/modules/categorization/drag-items?${saveQuery}`
            : "/api/modules/categorization/drag-items"),
          fetch(saveEndpoint),
        ]);

        if (!formsRes.ok) throw new Error("Failed to fetch forms");

        const data: { forms: FormResponse[] } = await formsRes.json();
        const savedData: SavedCategorizationResponse | null = savedRes.ok
          ? await savedRes.json()
          : null;

        console.log("API response:", data);

        const colorPairs: [string, string][] = [
          ["green-interactive border border-3 border-teal-200", "bg-teal-200"],
          ["green-interactive border border-3 border-orange-200", "bg-orange-200"],
          ["green-interactive border border-3 border-lime-200", "bg-lime-200"],
          ["green-interactive border border-3 border-red-200", "bg-red-200"],
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
                color: dark,
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

          const restoredDestinations = {
            opportunities: takeNotes(savedData.opportunities),
            needs: takeNotes(savedData.needs),
            problems: takeNotes(savedData.problems),
          };

          const usedIds = new Set(
            [
              ...restoredDestinations.opportunities,
              ...restoredDestinations.needs,
              ...restoredDestinations.problems,
            ].map((note) => note.id)
          );

          const remainingCategories = categoriesCopy.map((category) => ({
            ...category,
            notes: category.notes.filter((note) => !usedIds.has(note.id)),
          }));

          setDestinations(restoredDestinations);
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

    // Evitar movimientos sin cambio
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newCategories = categories.map((category) => ({
      ...category,
      notes: [...category.notes],
    }));
    const newDestinations = {
      opportunities: [...destinations.opportunities],
      needs: [...destinations.needs],
      problems: [...destinations.problems],
    };

    const sourceList = getSourceList(source.droppableId, newCategories, newDestinations);
    const destinationList = getSourceList(destination.droppableId, newCategories, newDestinations);

    if (!sourceList || !destinationList) return;

    const draggedNote = sourceList[source.index];
    if (!draggedNote) return;

    const moveSelectedGroup = selectedNoteIds.has(draggedNote.id);

    // Si el destino es Oportunidades/Necesidades/Problemas y se arrastra un item seleccionado,
    // mover todos los seleccionados aunque provengan de categorias distintas.
    if (moveSelectedGroup && isDestinationKey(destination.droppableId)) {
      const destinationKey = destination.droppableId;
      const selectedAcrossBoard = [
        ...newCategories.flatMap((category) => category.notes),
        ...destinationKeys.flatMap((key) => newDestinations[key]),
      ].filter((note) => selectedNoteIds.has(note.id));

      const movingNotes = selectedAcrossBoard.length ? selectedAcrossBoard : [draggedNote];
      const movingIds = new Set(movingNotes.map((note) => note.id));

      const destinationBefore = newDestinations[destinationKey];
      const removedBeforeDestination = destinationBefore
        .slice(0, destination.index)
        .filter((note) => movingIds.has(note.id)).length;

      const destinationIndex = destination.index - removedBeforeDestination;

      newCategories.forEach((category) => {
        category.notes = category.notes.filter((note) => !movingIds.has(note.id));
      });

      destinationKeys.forEach((key) => {
        newDestinations[key] = newDestinations[key].filter((note) => !movingIds.has(note.id));
      });

      const insertAt = Math.max(0, Math.min(destinationIndex, newDestinations[destinationKey].length));
      newDestinations[destinationKey].splice(insertAt, 0, ...movingNotes);

      setCategories(newCategories);
      setDestinations(newDestinations);
      return;
    }

    const selectedInSource = sourceList.filter((note) => selectedNoteIds.has(note.id));
    const movingNotes = moveSelectedGroup && selectedInSource.length ? selectedInSource : [draggedNote];
    const movingIds = new Set(movingNotes.map((note) => note.id));

    // Si se regresa desde destino a categoria, solo permitir volver a su categoria original.
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
    setDestinations(newDestinations);

    if (!moveSelectedGroup) {
      setSelectedNoteIds(new Set([draggedNote.id]));
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Cargando datos...</p>;

  // Calcular si ya están todos los papelitos clasificados
  const allNotes = categories.flatMap((c) => c.notes);
  const allDestNotes = [
    ...destinations.opportunities,
    ...destinations.needs,
    ...destinations.problems,
  ];

  // Solo activar si ya no quedan notas sin mover
  const allAssigned = allNotes.length === 0 && allDestNotes.length > 0;

  // Función de guardar
  const handleSave = async () => {
    try {
      const res = await fetch(withScopeContext("/api/modules/categorization/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(destinations),
      });

      if (!res.ok) throw new Error("Error saving data");
      setFeedbackModal("Datos guardados exitosamente ✅");
      setNextPathAfterModal(categorizationNextPath);
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
        Zoom Out: Categorización
      </h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className={`${category.color} rounded-xl p-4 shadow-md flex flex-col`}>
                <h2 className="font-semibold text-green-800 mb-2 text-lg">{category.title}</h2>

                <Droppable droppableId={`category-${category.id}`}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`flex flex-col gap-2 px-2 py-2 ${scrollAreaClass}`}>
                      {category.notes.map((note, index) => (
                        <Draggable key={note.id} draggableId={note.id} index={index}>
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

          <div className="flex flex-col gap-6">
            {(["opportunities", "needs", "problems"] as const).map((key) => {
              const labels: Record<string, string> = {
                opportunities: "Oportunidades",
                needs: "Necesidades",
                problems: "Problemas",
              };
              return (
                <div key={key}>
                  <h3 className="text-lg font-bold uppercase mb-2 text-[#2E6347]">{labels[key]}</h3>
                  <Droppable droppableId={key}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[100px] green-interactive rounded-lg shadow-md p-5 flex flex-col gap-3 ${scrollAreaClass}`}
                      >
                        {destinations[key].map((note, index) => (
                          <Draggable key={note.id} draggableId={note.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`px-2.5 py-1.5 text-sm box-border ${note.color} rounded-md shadow text-gray-700 cursor-pointer transition ${
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
              );
            })}
          </div>
        </div>
      </DragDropContext>

      <div className="flex flex-col sm:flex-row items-center justify-center w-full mt-12 gap-4 sm:gap-6">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push(categorizationBackPath)}
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

export default function ZoomOutCategorization() {
  return (
    <Suspense fallback={<p className="text-center mt-10 text-gray-500">Loading data...</p>}>
      <ZoomOutCategorizationContent />
    </Suspense>
  );
}
