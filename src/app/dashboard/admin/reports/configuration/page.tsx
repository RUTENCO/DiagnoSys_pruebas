"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DEFAULT_REPORT_DISPLAY_CONFIG, type ReportDisplayConfigPayload } from "@/lib/report-config";

type OrganizationOption = {
  id: number;
  name: string;
  email: string;
};

type ConfigResponse = {
  organizations: OrganizationOption[];
  selectedOrganizationId: number | null;
  config: ReportDisplayConfigPayload;
  updatedAt?: string | null;
};

export default function AdminReportConfigurationPage() {
  const { status, data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [switchingOrganization, setSwitchingOrganization] = useState(false);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationUserId, setOrganizationUserId] = useState<number | null>(null);
  const [config, setConfig] = useState<ReportDisplayConfigPayload>(DEFAULT_REPORT_DISPLAY_CONFIG);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const currentRoleName = session?.user?.role?.name?.toLowerCase() ?? null;
  const isOrganizationMode = currentRoleName === "organization";

  const selectedOrg = useMemo(
    () => organizations.find((org) => org.id === organizationUserId) ?? null,
    [organizations, organizationUserId]
  );

  const fetchConfig = async (orgId?: number, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setSwitchingOrganization(true);
    } else {
      setInitialLoading(true);
    }
    setError(null);
    try {
      const query = orgId ? `?organizationUserId=${orgId}` : "";
      const res = await fetch(`/api/admin/report-config${query}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error("error" in data ? data.error : "No se pudo cargar la configuración");
      }

      const typedData = data as ConfigResponse;

      setOrganizations(typedData.organizations);
      setOrganizationUserId(typedData.selectedOrganizationId);
      setConfig(typedData.config);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Error cargando configuración");
    } finally {
      if (silent) {
        setSwitchingOrganization(false);
      } else {
        setInitialLoading(false);
      }
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchConfig();
    }
  }, [status]);

  const handleImageUpload = async (file: File) => {
    setError(null);
    setMessage(null);
    setUploadingImage(true);

    if (!organizationUserId) {
      setError(isOrganizationMode ? "No se pudo identificar tu organización" : "Selecciona una organización primero");
      setUploadingImage(false);
      return;
    }

    // Validar tipo de archivo
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      setError('Formato no permitido. Usa PNG, JPEG o SVG');
      setUploadingImage(false);
      return;
    }

    // Validar tamaño
    if (file.size > 2 * 1024 * 1024) {
      setError('Archivo demasiado grande (máximo 2MB)');
      setUploadingImage(false);
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          console.log('Uploading image...', { organizationUserId, fileName: file.name, contentType: file.type });
          
          const res = await fetch('/api/admin/report-config/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              organizationUserId, 
              fileName: file.name, 
              contentType: file.type, 
              base64 
            }),
          });

          const data = await res.json();
          console.log('Upload response:', { status: res.status, data });
          
          if (!res.ok) {
            setError(data?.error || 'Error al subir la imagen');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          console.log('Image saved successfully, URL:', data.url);
          
          // Actualizar estado local con la nueva URL
          setConfig((prev) => ({ ...prev, logoUrl: data.url }));
          setMessage('Imagen subida correctamente');
          
          // No hacer PUT automático - solo guardar cuando el usuario presione el botón
          
        } catch (err) {
          setError('Error al procesar la imagen');
          console.error(err);
        } finally {
          // Resetear el input file después de procesar
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setUploadingImage(false);
        }
      };

      reader.onerror = () => {
        setError('Error al leer el archivo');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error inesperado al subir la imagen');
      console.error(err);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleToggle = (field: keyof ReportDisplayConfigPayload) => {
    setConfig((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSave = async () => {
    if (!organizationUserId) {
      setError(isOrganizationMode ? "No se pudo identificar tu organización" : "Selecciona una organización");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/report-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationUserId, ...config }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar la configuración");
      }

      setMessage(data.message || "Configuración almacenada correctamente");
      setConfig(data.config ?? config);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error guardando configuración");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || initialLoading) {
    return <div className="p-6">Cargando configuración de informe...</div>;
  }

  if (status !== "authenticated") {
    return <div className="p-6">Debes iniciar sesión para acceder a esta configuración.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[#2E6347] mb-2">
        {isOrganizationMode ? "Configuración de mi reporte" : "Configuración de Informe Final"}
      </h1>
      <p className="text-gray-700 mb-6">
        {isOrganizationMode
          ? "Personaliza los criterios de visualización y el formato institucional de tu organización."
          : "Personaliza criterios de visualización y formato institucional para cada organización."}
      </p>

      <div className="green-interactive rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
        {switchingOrganization && (
          <div className="text-sm text-[#2E6347] bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            Cambiando organización...
          </div>
        )}
        {isOrganizationMode ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-[#2E6347]">
            {selectedOrg ? (
              <>
                Configurando tu organización: <strong>{selectedOrg.name}</strong>
              </>
            ) : (
              "Configurando tu organización"
            )}
          </div>
        ) : (
          <>
            <p className="block text-sm font-semibold text-[#2E6347]">Organización</p>
            <select
              id="organization-select"
              className="w-full border rounded-md px-3 py-2"
              value={organizationUserId ?? ""}
              disabled={switchingOrganization}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(next)) {
                  setOrganizationUserId(next);
                  fetchConfig(next, { silent: true });
                }
              }}
            >
              <option value="">Seleccionar organización</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.email})
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 transition-opacity duration-200 ${switchingOrganization ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
        <section className="green-interactive rounded-xl border border-emerald-200 p-6 space-y-3">
          <h2 className="text-xl font-semibold text-[#2E6347]">Criterios de visualización</h2>
          <ToggleRow label="Resumen ejecutivo" enabled={config.showExecutiveSummary} onToggle={() => handleToggle("showExecutiveSummary")} />
          <ToggleRow label="Radar Zoom In/Zoom Out" enabled={config.showRadar} onToggle={() => handleToggle("showRadar")} />
          <ToggleRow label="Categorización (O/N/P)" enabled={config.showCategorization} onToggle={() => handleToggle("showCategorization")} />
          <ToggleRow label="Priorización" enabled={config.showPrioritization} onToggle={() => handleToggle("showPrioritization")} />
          <ToggleRow label="Plan de acción" enabled={config.showActionPlan} onToggle={() => handleToggle("showActionPlan")} />
          {/* Escala visible eliminada por defecto */}
        </section>

        <section className="green-interactive rounded-xl border border-emerald-200 p-6 space-y-3">
          <h2 className="text-xl font-semibold text-[#2E6347]">Formato institucional</h2>
          <div className="flex flex-col items-center text-center gap-3">
            <p className="block text-sm font-semibold">Logotipo</p>
            <input
              id="logo-upload"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingImage}
              className="border-[#2E6347] text-[#2E6347] hover:bg-[#2E6347] hover:text-white"
              onClick={() => {
                // Resetear el input ANTES de abrir el file picker
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                  fileInputRef.current.click();
                }
              }}
            >
              {uploadingImage ? 'Subiendo...' : (config.logoUrl ? 'Cambiar imagen' : 'Subir imagen')}
            </Button>
            {uploadingImage && <p className="text-sm text-gray-600">Subiendo imagen...</p>}
            {config.logoUrl && (
              <div className="mt-2 flex flex-col items-center gap-2 w-full">
                <div className="p-2 border border-emerald-300 rounded-md bg-emerald-50">
                  <Image
                    src={config.logoUrl}
                    alt="Preview logo"
                    width={160}
                    height={64}
                    className="h-16 w-auto object-contain"
                    unoptimized
                  />
                </div>
                <p className="text-xs text-gray-600">Vista previa del logotipo</p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="block text-sm font-semibold text-[#2E6347]">Título para el PDF</p>
            <input
              id="pdf-title"
              className="w-full border rounded-md px-3 py-2"
              value={config.headerTitle}
              onChange={(e) => setConfig((prev) => ({ ...prev, headerTitle: e.target.value }))}
              placeholder="Título para el PDF"
            />
          </div>
          <div className="space-y-2">
            <p className="block text-sm font-semibold text-[#2E6347]">Título Página Reporte</p>
            <input
              id="report-page-title"
              className="w-full border rounded-md px-3 py-2"
              value={config.headerSubtitle ?? ""}
              onChange={(e) => setConfig((prev) => ({ ...prev, headerSubtitle: e.target.value || null }))}
              placeholder="Título Página Reporte"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <label className="text-sm text-gray-700 flex items-center gap-3">
              <div>Color títulos</div>
              <input
                type="color"
                value={(config.titleColor as string) ?? '#000000'}
                onChange={(e) => setConfig((prev) => ({ ...prev, titleColor: e.target.value }))}
                className="h-10 w-10 p-0 border rounded"
                title="Color para títulos"
              />
            </label>

            <label className="text-sm text-gray-700 flex items-center gap-3">
              <div>Color texto</div>
              <input
                type="color"
                value={(config.textColor as string) ?? '#000000'}
                onChange={(e) => setConfig((prev) => ({ ...prev, textColor: e.target.value }))}
                className="h-10 w-10 p-0 border rounded"
                title="Color para texto"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#2E6347] hover:bg-[#24533b] text-white"
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>

      {message && <p className="mt-4 rounded-md bg-green-50 border border-green-300 px-4 py-3 text-green-800">{message}</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 border border-red-300 px-4 py-3 text-red-700">{error}</p>}
    </div>
  );
}

function ToggleRow({ label, enabled, onToggle }: Readonly<{ label: string; enabled: boolean; onToggle: () => void }>) {
  return (
    <label className="flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer">
      <span className="text-sm text-gray-800">{label}</span>
      <input type="checkbox" checked={enabled} onChange={onToggle} className="h-4 w-4" />
    </label>
  );
}
