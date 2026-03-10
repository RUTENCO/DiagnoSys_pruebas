"use client";
import React from "react";

export default function FormHeader({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: {
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
}) {
  return (
    <div className="p-6 border rounded-xl green-interactive shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-[#2E6347]">Editar formulario</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-[#2E6347] font-medium mb-1">
            T&#xED;tulo
          </label>
          <input
            type="text"
            className="w-full bg-[#e9f7f3] rounded-lg p-3 focus:border-3 focus:border-black font-semibold text-black"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[#2E6347] font-medium mb-1">
            Descripci&#xF3;n
          </label>
          <textarea
            className="w-full bg-[#e9f7f3] rounded-lg p-3 focus:border-3 focus:border-black text-black"
            rows={3}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
