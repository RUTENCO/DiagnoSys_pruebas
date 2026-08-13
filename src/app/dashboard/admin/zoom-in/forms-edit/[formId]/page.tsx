"use client";
import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import FormHeader from "@/app/components/edit-forms/FormHeader";
import CategoryEditor from "@/app/components/edit-forms/CategoryEditor";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Item = {
  id: number;
  name: string;
  
};

type Category = {
  id: number;
  name: string;
  items: Item[];
};

type CategoryState = {
  name: string;
  items: string[];
};

interface PageProps {
  params: Promise<{
    formId: string;
  }>;
}

export default function EditFormPage({ params }: PageProps) {
  const { formId } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<CategoryState[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/forms/${formId}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok && data.form) {
        setTitle(data.form.name);
        setDescription(data.form.description || "");

        setCategories(
          (data.form.categories as Category[]).map((c) => ({
            name: c.name,
            items: c.items.map((i) => i.name),
          }))
        );
      }
    };
    fetchData();
  }, [formId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, categories }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("✅ Form saved successfully:", data.message);
        setShowSaveModal(true);
        setTimeout(() => {
          setShowSaveModal(false);
          router.push('/dashboard/admin/zoom-in');
        }, 2000);
      } else {
        console.error("❌ Error saving form:", data.error);
        alert(`Error: ${data.error || t("editForm.saveError")}`);
      }
    } catch (error) {
      console.error("❌ Network error saving form:", error);
      alert(t("editForm.connectionError"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/admin/zoom-in');
  };

  return (
    <div className="min-h-screen ">
      <div className="max-w-4xl mx-auto px-4">
        <FormHeader
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
        />

        <CategoryEditor
          categories={categories}
          onAddCategory={() =>
            setCategories([
              ...categories,
              { name: "", items: [] },
            ])
          }
          onDeleteCategory={(index) =>
            setCategories(categories.filter((_, i) => i !== index))
          }
          onCategoryChange={(index, field, value) => {
            setCategories((prev) =>
              prev.map((cat, i) =>
                i === index ? { ...cat, [field]: value } : cat
              )
            );
          }}
          onItemChange={(index, items) => {
            const updated = [...categories];
            updated[index].items = items;
            setCategories(updated);
          }}
        />

        <div className="flex justify-end gap-4 mt-10">
          <button 
            onClick={handleCancel}
            className="px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-all cursor-pointer border border-gray-300"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#2E6347] text-white rounded-lg hover:bg-[#265239] transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("editForm.saveChanges")}
          </button>
        </div>
      </div>

      {/* Modal de guardado exitoso */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="green-interactive p-8 rounded-xl shadow-2xl text-center max-w-md mx-4">
            <h3 className="text-2xl font-bold text-[#2E6347] mb-2">{t("editForm.successTitle")}</h3>
            <p className="text-black opacity-90">{t("editForm.successMessage")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
