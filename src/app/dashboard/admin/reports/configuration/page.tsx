"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [organizationUserId, setOrganizationUserId] = useState<number | null>(null);
  const [config, setConfig] = useState<ReportDisplayConfigPayload>(DEFAULT_REPORT_DISPLAY_CONFIG);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOrg = useMemo(
    () => organizations.find((org) => org.id === organizationUserId) ?? null,
    [organizations, organizationUserId]
  );

  const fetchConfig = async (orgId?: number) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchConfig();
    }
  }, [status]);

  const handleToggle = (field: keyof ReportDisplayConfigPayload) => {
    setConfig((prev) => ({
      ...prev,
      [field]: !prev[field as keyof ReportDisplayConfigPayload],
    }));
  };

  const handleSave = async () => {
    if (!organizationUserId) {
      setError("Selecciona una organización");
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

  if (status === "loading" || loading) {
    return <div className="p-6">Cargando configuración de informe...</div>;
  }

  if (status !== "authenticated") {
    return <div className="p-6">Debes iniciar sesión como administrador.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[#2E6347] mb-2">Configuración de Informe Final</h1>
      <p className="text-gray-700 mb-6">
        Personaliza criterios de visualización y formato institucional para cada organización.
      </p>

      <div className="green-interactive rounded-xl border border-emerald-200 p-6 mb-6 space-y-4">
        <label className="block text-sm font-semibold text-[#2E6347]">Organización</label>
        <select
          className="w-full border rounded-md px-3 py-2"
          value={organizationUserId ?? ""}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10);
            if (!Number.isNaN(next)) {
              setOrganizationUserId(next);
              fetchConfig(next);
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

        {selectedOrg && (
          <p className="text-sm text-gray-600">
            Configurando informe para: <strong>{selectedOrg.name}</strong>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section className="green-interactive rounded-xl border border-emerald-200 p-6 space-y-3">
          <h2 className="text-xl font-semibold text-[#2E6347]">Criterios de visualización</h2>
          <ToggleRow label="Resumen ejecutivo" enabled={config.showExecutiveSummary} onToggle={() => handleToggle("showExecutiveSummary")} />
          <ToggleRow label="Radar Zoom In/Zoom Out" enabled={config.showRadar} onToggle={() => handleToggle("showRadar")} />
          <ToggleRow label="Categorización (O/N/P)" enabled={config.showCategorization} onToggle={() => handleToggle("showCategorization")} />
          <ToggleRow label="Priorización" enabled={config.showPrioritization} onToggle={() => handleToggle("showPrioritization")} />
          <ToggleRow label="Plan de acción" enabled={config.showActionPlan} onToggle={() => handleToggle("showActionPlan")} />
          <ToggleRow label="Escala visible (1-5)" enabled={config.showScaleLegend} onToggle={() => handleToggle("showScaleLegend")} />
        </section>

        <section className="green-interactive rounded-xl border border-emerald-200 p-6 space-y-3">
          <h2 className="text-xl font-semibold text-[#2E6347]">Formato institucional</h2>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={config.logoUrl ?? ""}
            onChange={(e) => setConfig((prev) => ({ ...prev, logoUrl: e.target.value || null }))}
            placeholder="URL de logotipo (https://...)"
          />
          <input
            className="w-full border rounded-md px-3 py-2"
            value={config.headerTitle}
            onChange={(e) => setConfig((prev) => ({ ...prev, headerTitle: e.target.value }))}
            placeholder="Título del encabezado"
          />
          <input
            className="w-full border rounded-md px-3 py-2"
            value={config.headerSubtitle ?? ""}
            onChange={(e) => setConfig((prev) => ({ ...prev, headerSubtitle: e.target.value || null }))}
            placeholder="Subtítulo del encabezado"
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-gray-700">
              Color primario
              <input
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={config.primaryColor}
                onChange={(e) => setConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                placeholder="#2E6347"
              />
            </label>
            <label className="text-sm text-gray-700">
              Color secundario
              <input
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={config.secondaryColor}
                onChange={(e) => setConfig((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                placeholder="#24533b"
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

function ToggleRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer">
      <span className="text-sm text-gray-800">{label}</span>
      <input type="checkbox" checked={enabled} onChange={onToggle} className="h-4 w-4" />
    </label>
  );
}
