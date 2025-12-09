"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
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
  }[];
}

export default function ZoomOutCategorization() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<{
    opportunities: Note[];
    needs: Note[];
    problems: Note[];
  }>({
    opportunities: [],
    needs: [],
    problems: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await fetch("/api/modules/2/forms");
        if (!res.ok) throw new Error("Failed to fetch forms");

        const data: { forms: FormResponse[] } = await res.json();

        console.log("API response:", data);

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
              color: dark,
            })),
          };
        });

        setCategories(mappedCategories);
      } catch (err) {
        console.error("Error fetching forms", err);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    // Evitar movimientos sin cambio
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newCategories = [...categories];
    const newDestinations = { ...destinations };

    // Obtener la nota que se mueve
    let draggedNote: Note | null = null;

    // Si viene desde una categoría
    if (source.droppableId.startsWith("category-")) {
      const sourceCategoryId = source.droppableId.split("-")[1];
      const sourceCategory = newCategories.find((c) => c.id === sourceCategoryId);
      if (!sourceCategory) return;
      [draggedNote] = sourceCategory.notes.splice(source.index, 1);
    }

    // Si viene desde un destino (opportunities, needs o problems)
    else if (["opportunities", "needs", "problems"].includes(source.droppableId)) {
      const key = source.droppableId as keyof typeof destinations;
      [draggedNote] = newDestinations[key].splice(source.index, 1);
    }

    if (!draggedNote) return;

    // Si va hacia una categoría
    if (destination.droppableId.startsWith("category-")) {
      const destCategoryId = destination.droppableId.split("-")[1];
      const destCategory = newCategories.find((c) => c.id === destCategoryId);
      if (!destCategory) return;
      destCategory.notes.splice(destination.index, 0, draggedNote);
    }

    // Si va hacia un destino (puede ser el mismo u otro)
    else if (["opportunities", "needs", "problems"].includes(destination.droppableId)) {
      const key = destination.droppableId as keyof typeof destinations;
      newDestinations[key].splice(destination.index, 0, draggedNote);
    }

    setCategories(newCategories);
    setDestinations(newDestinations);
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading data...</p>;

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
    const payload = destinations;
    console.log("Saved data:", payload);

    try {
      const res = await fetch("/api/modules/2/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error saving data");
      setErrorModal("Data saved successfully ✅");
    } catch (err) {
      console.error(err);
      setErrorModal("Error saving data ❌");
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-[#2E6347]">
          Zoom Out: Categorization
      </h1>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div key={category.id} className={`${category.color} rounded-xl p-4 shadow-md flex flex-col`}>
                <h2 className="font-semibold text-gray-800 mb-2 text-lg">{category.title}</h2>

                <Droppable droppableId={`category-${category.id}`}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-2">
                      {category.notes.map((note, index) => (
                        <Draggable key={note.id} draggableId={note.id} index={index}>
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

          <div className="flex flex-col gap-6">
            {(["opportunities", "needs", "problems"] as const).map((key) => (
              <div key={key}>
                <h3 className="text-lg font-bold uppercase mb-2 text-[#2E6347]">{key}</h3>
                <Droppable droppableId={key}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-[100px] green-interactive rounded-lg shadow-md p-3 flex flex-wrap gap-2"
                    >
                      {destinations[key].map((note, index) => (
                        <Draggable key={note.id} draggableId={note.id} index={index}>
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
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      <div className="mt-8 text-center">
        <button
          onClick={handleSave}
          disabled={!allAssigned}
          className={`px-6 py-3 rounded-lg text-white font-semibold transition-colors ${
            allAssigned
              ? "bg-primary cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Save
        </button>
      </div>
      {/* Modal */}
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
}
