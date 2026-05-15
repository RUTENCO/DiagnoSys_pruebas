"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

type OrganizationSummary = {
  id: number;
  userName: string;
  email: string;
  sector?: string | null;
  companySize?: string | null;
  primaryAuditId: number | null;
  stats: {
    reportsCount: number;
  };
};

export default function ConsultantOrganizationsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingOrg, setUpdatingOrg] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editCompanySize, setEditCompanySize] = useState("");

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sector, setSector] = useState("");
  const [companySize, setCompanySize] = useState("");

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/consultant/organizations");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error al cargar las organizaciones");
      }

      setOrganizations(data.organizations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las organizaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/consultant/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email,
          password,
          sector: sector || undefined,
          companySize: companySize || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Error al crear la organización");
      }

      setMessage(
        `Organización creada. Credenciales: ${data.credentials?.email} (${data.credentials?.role})`
      );

      setCreateDialogOpen(false);

      setUserName("");
      setEmail("");
      setPassword("");
      setSector("");
      setCompanySize("");

      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la organización");
    } finally {
      setSaving(false);
    }
  };

  const startDiagnosis = (org: OrganizationSummary) => {
    const nextUrl = `/dashboard/organization/report?organizationId=${org.id}&organizationName=${encodeURIComponent(org.userName)}`;
    router.push(nextUrl);
  };

  const handleOpenEdit = (org: OrganizationSummary) => {
    setEditingOrgId(org.id);
    setEditUserName(org.userName || "");
    setEditEmail(org.email || "");
    setEditPassword("");
    setEditSector(org.sector || "");
    setEditCompanySize(org.companySize || "");
    setMessage(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingOrgId(null);
    setEditUserName("");
    setEditEmail("");
    setEditPassword("");
    setEditSector("");
    setEditCompanySize("");
  };

  const handleSaveEdit = async (orgId: number) => {
    if (!editUserName.trim() || !editEmail.trim()) {
      setError("El nombre de usuario y email son requeridos");
      return;
    }

    if (editPassword && editPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      setUpdatingOrg(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/consultant/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name: editUserName,
          email: editEmail,
          password: editPassword || undefined,
          sector: editSector || undefined,
          companySize: editCompanySize || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Error al actualizar la organización");
      }

      setMessage("Organización actualizada correctamente");
      handleCancelEdit();
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la organización");
    } finally {
      setUpdatingOrg(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#2E6347] mb-2">Organizaciones</h1>
          <p className="text-gray-600 max-w-2xl">
            Administra tus organizaciones, revisa cuántos reportes tiene cada una y entra al diagnóstico con un clic.
          </p>
        </div>

        {mounted && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-fit bg-[#2E6347] hover:bg-[#265239] text-white">
              Crear organización
            </Button>
          </DialogTrigger>
          <DialogContent className="green-interactive sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Organización</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4" autoComplete="off">
              <input
                className="w-full border rounded-md px-3 py-2"
                placeholder="Nombre de usuario de la organización"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoComplete="off"
                required
              />
              <input
                className="w-full border rounded-md px-3 py-2"
                type="email"
                placeholder="Correo electrónico de la organización"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
              <input
                className="w-full border rounded-md px-3 py-2"
                type="password"
                placeholder="Contraseña de la organización (mín. 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <select
                className="w-full border rounded-md px-3 py-2"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option value="">Seleccionar Sector (opcional)</option>
                <option value="Gobierno">Gobierno</option>
                <option value="Salud">Salud</option>
                <option value="Educación">Educación</option>
                <option value="Informática">Informática</option>
                <option value="Telecomunicaciones">Telecomunicaciones</option>
                <option value="Otros">Otros</option>
              </select>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
              >
                <option value="">Seleccionar Tamaño de Empresa (opcional)</option>
                <option value="0-10">0-10 empleados</option>
                <option value="11-50">11-50 empleados</option>
                <option value="51-250">51 a 250 empleados</option>
                <option value="250+">Más de 250 empleados</option>
              </select>

              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#2E6347] text-white hover:bg-[#265239] sm:w-auto"
                >
                  {saving ? "Creando..." : "Crear Organización"}
                </Button>
              </DialogFooter>
            </form>

            {message && <p className="text-green-700">{message}</p>}
            {error && <p className="text-red-600">{error}</p>}
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="green-interactive rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-600">Organizaciones</p>
          <p className="text-3xl font-bold text-[#2E6347]">{organizations.length}</p>
        </div>
        <div className="green-interactive rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-600">Reportes totales</p>
          <p className="text-3xl font-bold text-[#2E6347]">
            {organizations.reduce((sum, org) => sum + org.stats.reportsCount, 0)}
          </p>
        </div>
        <div className="green-interactive rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-600">Estado</p>
          <p className="text-lg font-semibold text-[#2E6347]">
            {loading ? "Cargando..." : "Listo para gestionar"}
          </p>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">{message}</p>}
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>}

      <section className="green-interactive rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mis Organizaciones</h2>
          <span className="text-sm text-gray-500">{organizations.length} registradas</span>
        </div>

        {loading ? <p>Cargando...</p> : null}

        {!loading && organizations.length === 0 ? (
          <p className="text-gray-600">Aún no hay organizaciones creadas.</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          {organizations.map((org) => (
            <article
              key={org.id}
              className=" green-interactive rounded-xl border border-primary/20 bg-white/70 p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-[#2E6347]">{org.userName}</h3>
                  <p className="text-sm text-gray-600">
                    Usuario: {org.userName} | Email: {org.email}
                  </p>
                </div>

                <div className="rounded-lg bg-[#2E6347]/10 px-4 py-3 text-center min-w-44">
                  <p className="text-xs uppercase tracking-wide text-gray-600">Reportes realizados</p>
                  <p className="text-3xl font-bold text-[#2E6347]">{org.stats.reportsCount}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => startDiagnosis(org)}
                  className="bg-[#2E6347] text-white px-3 py-2 rounded-md"
                >
                  Entrar al diagnóstico
                </button>
                <button
                  onClick={() => handleOpenEdit(org)}
                  className="border border-[#2E6347] text-[#2E6347] px-3 py-2 rounded-md"
                >
                  Editar
                </button>
              </div>

              {editingOrgId === org.id ? (
                <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    placeholder="Nombre de la organización"
                    autoComplete="off"
                  />
                  
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    placeholder="Nombre de usuario de la organización"
                    autoComplete="off"
                  />
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Correo electrónico de la organización"
                    autoComplete="off"
                  />
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Nueva contraseña (opcional)"
                    autoComplete="new-password"
                  />
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                  >
                    <option value="">Seleccionar Sector</option>
                    <option value="Gobierno">Gobierno</option>
                    <option value="Salud">Salud</option>
                    <option value="Educación">Educación</option>
                    <option value="Informática">Informática</option>
                    <option value="Telecomunicaciones">Telecomunicaciones</option>
                    <option value="Otros">Otros</option>
                  </select>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={editCompanySize}
                    onChange={(e) => setEditCompanySize(e.target.value)}
                  >
                    <option value="">Seleccionar Tamaño de Empresa</option>
                    <option value="0-10">0-10 empleados</option>
                    <option value="11-50">11-50 empleados</option>
                    <option value="51-250">51 a 250 empleados</option>
                    <option value="250+">Más de 250 empleados</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(org.id)}
                      disabled={updatingOrg}
                      className="bg-primary text-white px-3 py-2 rounded-md disabled:opacity-60"
                    >
                      {updatingOrg ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updatingOrg}
                      className="border border-gray-400 px-3 py-2 rounded-md disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
