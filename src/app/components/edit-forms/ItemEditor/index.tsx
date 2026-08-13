"use client";
import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ItemEditor({
  items,
  onAddItem,
  onDeleteItem,
  onItemChange,
}: {
  items: string[];
  onAddItem: () => void;
  onDeleteItem: (index: number) => void;
  onItemChange: (index: number, value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-[#2E6347] font-semibold">{t("editForm.items")}</h4>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <input
            type="text"
            value={item}
            onChange={(e) => onItemChange(index, e.target.value)}
            placeholder={t("editForm.itemNamePlaceholder")}
            className="flex-1  bg-[#e9f7f3] rounded-lg p-3 focus:border-3 focus:border-black text-black"
          />
          <button
            onClick={() => onDeleteItem(index)}
            className="bg-transparent border-none text-red-600 cursor-pointer transition-all duration-200 p-2 rounded-md hover:bg-green-100 hover:text-green-800"
            title={t("editForm.deleteItem")}
          >
            🗑
          </button>
        </div>
      ))}

      <button
        onClick={onAddItem}
        className="mt-3 px-4 py-2 bg-[#2E6347]  text-white rounded-lg hover:bg-[#265239] transition-all cursor-pointer"
      >
        {t("editForm.addItem")}
      </button>
    </div>
  );
}
