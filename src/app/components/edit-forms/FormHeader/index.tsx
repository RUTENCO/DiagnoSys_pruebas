"use client";
import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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
  const { t } = useLanguage();
  return (
    <div className="p-6 border rounded-xl green-interactive shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-[#2E6347]">{t("editForm.editTitle")}</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-[#2E6347] font-medium mb-1">
            {t("editForm.titleLabel")}
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
            {t("editForm.descriptionLabel")}
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
