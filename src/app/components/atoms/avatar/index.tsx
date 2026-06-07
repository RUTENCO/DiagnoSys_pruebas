"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Button } from "@/components/ui/button";

type AvatarProps = {
  src?: string;
  alt?: string;
  size?: number;
  editable?: boolean;
};

export default function Avatar({
  src,
  alt = "User avatar",
  size = 48,
  editable = true,
}: Readonly<AvatarProps>) {
  const fallbackSrc = "/logoudea.svg";
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setImageSrc(src || fallbackSrc);
  }, [src]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openViewer = () => {
    if (!editable || uploading) return;
    setViewerOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";

          if (!dataUrl) {
            return;
          }

          const res = await fetch("/api/auth/users/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl: dataUrl }),
          });

          const data = await res.json();
          if (!res.ok) {
            return;
          }

          const nextAvatar = data?.user?.avatarUrl || dataUrl;
          setImageSrc(nextAvatar);
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        disabled={uploading}
        className={`relative rounded-full border-2 border-[#2E6347] bg-white p-1 object-contain transition ${editable ? "cursor-pointer hover:scale-105" : "cursor-default"} ${uploading ? "opacity-70 cursor-not-allowed" : ""}`}
        aria-label="Ver avatar ampliado"
      >
        <Image
          src={imageSrc}
          alt={alt}
          width={size}
          height={size}
          className="rounded-full object-contain"
          onError={() => {
            if (imageSrc !== "/user.svg") {
              setImageSrc("/user.svg");
            }
          }}
        />
        {uploading && (
          <span className="absolute -bottom-1 -right-1 bg-white text-xs px-2 py-0.5 rounded text-[#2E6347] border border-emerald-200">Subiendo...</span>
        )}
      </button>

      {viewerOpen && mounted && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Cerrar vista ampliada del avatar"
            className="absolute inset-0 bg-black/70"
            onClick={() => setViewerOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-emerald-100">
            <div className="flex justify-center">
              <Image
                src={imageSrc}
                alt={alt}
                width={240}
                height={240}
                className="rounded-full border-4 border-[#2E6347] bg-white p-2 object-contain"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button type="button" variant="outline" onClick={() => setViewerOpen(false)}>
                Cerrar
              </Button>

              {editable && (
                <label className="inline-flex items-center justify-center rounded-md bg-[#2E6347] px-4 py-2 text-sm font-medium text-white hover:bg-[#265239] cursor-pointer">
                  {uploading ? "Subiendo..." : "Cambiar imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
