"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react"; 

const TargetFormCard = ({
  title = "Title",
  description = "Description",
  publicF = false,
  categorieNumber = 0,
  itemNumber = 0,
  formId = "",
}) => {
  const router = useRouter();

  const handleEdit = () => {
    // Determinar la ruta correcta para el edit basándose en el contexto
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/admin/zoom-in')) {
      router.push(`/dashboard/admin/zoom-in/forms-edit/${formId}`);
    } else if (currentPath.includes('/admin/zoom-out')) {
      router.push(`/dashboard/admin/zoom-out/forms-edit/${formId}`);
    }
  };

  const handlePreview = () => {
    // Determinar la ruta correcta para el preview basándose en el contexto
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/admin/zoom-in')) {
      router.push(`/dashboard/admin/zoom-in/forms-preview/${formId}`);
    } else if (currentPath.includes('/admin/zoom-out')) {
      router.push(`/dashboard/admin/zoom-out/forms-preview/${formId}`);
    }
  };

  return (
    <div className="green-interactive border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col min-h-[260px] max-w-md flex-1">
      <div className="flex-grow">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#55A7FF]" />
            <h3 className="font-semibold text-xl text-[#0b2b1f]">{title}</h3>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              publicF
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {publicF ? "Público" : "Privado"}
          </span>
        </div>

        <p className="text-sm text-gray-800 mb-4">{description}</p>
        
        <p className="text-sm text-gray-700 mb-6">
          {categorieNumber} categorías • {itemNumber} ítems
        </p>
      </div>

      <div className="flex gap-2">
        <button 
          className="bg-[#2E6347] text-white px-4 py-2 rounded-2xl font-medium hover:bg-[#265239] transition-colors duration-200 flex-1 cursor-pointer"
          onClick={handleEdit}
        >
          Editar
        </button>
        <button 
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-2xl font-medium hover:bg-gray-300 transition-colors duration-200 flex-1 cursor-pointer"
          onClick={handlePreview}
        >
          Vista previa
        </button>
      </div>
    </div>
  );
};

export default TargetFormCard;
