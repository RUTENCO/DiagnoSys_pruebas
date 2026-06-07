"use client";

import { Button } from "@/components/ui/button";

type ConfirmationPopupProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmationPopup({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmTone = "default",
  onConfirm,
  onCancel,
}: Readonly<ConfirmationPopupProps>) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-emerald-100">
        <h3 className="text-xl font-semibold text-[#2E6347]">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={
              confirmTone === "destructive"
                ? "w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                : "w-full bg-[#2E6347] text-white hover:bg-[#265239] sm:w-auto"
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}