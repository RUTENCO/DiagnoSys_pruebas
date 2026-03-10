"use client";
import React from "react";
import ItemEditor from "../ItemEditor";

export default function CategoryEditor({
  categories,
  onAddCategory,
  onDeleteCategory,
  onCategoryChange,
  onItemChange,
}: {
  categories: { name: string; items: string[] }[];
  onAddCategory: () => void;
  onDeleteCategory: (index: number) => void;
  onCategoryChange: (index: number, field: string, value: string) => void;
  onItemChange: (categoryIndex: number, items: string[]) => void;
}) {
  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#2E6347]">Categor&#xED;as</h3>
        <button
          onClick={onAddCategory}
          className="px-4 py-2 bg-[#2E6347] text-white rounded-lg hover:bg-[#265239] transition-opacity cursor-pointer"
        >
          + Agregar categor&#xED;a
        </button>
      </div>

      {categories.map((cat, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl p-6 mb-6 green-interactive shadow-lg"
        >
          <div className="flex justify-between items-center mb-2">
            <input
              type="text"
              value={cat.name}
              placeholder="Nombre de la categoría"
              onChange={(e) =>
                onCategoryChange(index, "name", e.target.value)
              }
              className="flex-1 bg-[#e9f7f3]  rounded-lg p-3 mr-3 focus:border-3 focus:border-[black]  text-black font-semibold"
            />
            <button
              onClick={() => onDeleteCategory(index)}
              className="bg-transparent border-none text-red-600 cursor-pointer transition-all duration-200 p-2 rounded-md hover:bg-green-100 hover:text-green-800"
              title="Eliminar categor&#xED;a"
            >
              🗑
            </button>
          </div>
          
          {/* Línea verde horizontal debajo del título de categoría */}
          <div className="h-0.5 bg-[#007b55] mb-4 rounded-full"></div>

          <ItemEditor
            items={cat.items}
            onAddItem={() => {
              const newItems = [...cat.items, ""];
              onItemChange(index, newItems);
            }}
            onDeleteItem={(i) => {
              const newItems = cat.items.filter((_, idx) => idx !== i);
              onItemChange(index, newItems);
            }}
            onItemChange={(i, value) => {
              const newItems = cat.items.map((it, idx) =>
                idx === i ? value : it
              );
              onItemChange(index, newItems);
            }}
          />
        </div>
      ))}
    </div>
  );
}
